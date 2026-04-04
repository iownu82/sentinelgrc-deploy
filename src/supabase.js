/**
 * SentinelGRC — Supabase Data Layer
 *
 * Setup:
 *  1. Create a Supabase project at https://supabase.com
 *  2. Copy Project URL and anon public key from Project Settings → API
 *  3. Create a .env file in sentinelgrc-deploy/ with:
 *       VITE_SUPABASE_URL=https://your-project.supabase.co
 *       VITE_SUPABASE_ANON_KEY=your-anon-key
 *  4. Run the SQL schema in supabase/schema.sql via Supabase SQL Editor
 *  5. npm run build && vercel --prod
 *
 * On Vercel, add the same env vars under:
 *   Project Settings → Environment Variables
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || "";
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// If not configured, the app runs in local-only mode (localStorage fallback)
export const SUPABASE_CONFIGURED = !!(SUPABASE_URL && SUPABASE_KEY);

export const supabase = SUPABASE_CONFIGURED
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// ── Auth helpers ──────────────────────────────────────────────────────────

export async function signUp(email, password, orgName) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { org_name: orgName } },
  });
  return { data, error };
}

export async function signIn(email, password) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

// Get current user ID for RLS — called inside save functions
async function getUserId() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
}

// ── Local storage fallback ────────────────────────────────────────────────
// Used when Supabase is not configured — data persists in browser localStorage

function localGet(key, fallback = null) {
  try {
    const val = localStorage.getItem(`sentinelgrc_${key}`);
    return val ? JSON.parse(val) : fallback;
  } catch { return fallback; }
}

function localSet(key, value) {
  try {
    localStorage.setItem(`sentinelgrc_${key}`, JSON.stringify(value));
  } catch {}
}

// ── POAM ─────────────────────────────────────────────────────────────────

export async function loadPoamItems(systemId = "default") {
  if (!supabase) return localGet(`poam_${systemId}`, []);
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("poam_items")
    .select("*")
    .eq("system_id", systemId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) { console.error("POAM load error:", error); return []; }
  return data || [];
}

export async function savePoamItem(item, systemId = "default") {
  console.log("[SentinelGRC] savePoamItem called", { id: item.id, systemId, supabaseConfigured: SUPABASE_CONFIGURED });
  if (!supabase) {
    const items = localGet(`poam_${systemId}`, []);
    const idx = items.findIndex(i => i.id === item.id);
    if (idx >= 0) items[idx] = item;
    else items.unshift(item);
    localSet(`poam_${systemId}`, items);
    return { data: item, error: null };
  }
  const userId = await getUserId();
  console.log("[SentinelGRC] userId:", userId);
  // Helper: return null for empty strings (Postgres date/int columns reject "")
  const d = (v) => (v && v.toString().trim() !== "" ? v : null);
  const row = {
    id: item.id,
    system_id: systemId,
    user_id: userId,
    control_id: d(item.controlId || item.control),
    weakness: d(item.weakness || item.title),
    resources: d(item.resources),
    scheduled_completion: d(item.scheduledCompletion || item.completionDate),
    status: item.status || "Ongoing",
    cat_level: d(item.catLevel || item.cat),
    milestones: d(item.milestones),
    poc: d(item.poc),
    action_owners: item.actionOwners || [],
    cost: d(item.cost),
    severity: d(item.severity),
    comments: d(item.comments),
    raw: item,
  };
  const { data, error } = await supabase
    .from("poam_items")
    .upsert(row, { onConflict: "id" })
    .select()
    .single();
  console.log("[SentinelGRC] upsert result:", { data, error });
  return { data, error };
}

export async function deletePoamItem(id, systemId = "default") {
  if (!supabase) {
    const items = localGet(`poam_${systemId}`, []).filter(i => i.id !== id);
    localSet(`poam_${systemId}`, items);
    return { error: null };
  }
  const { error } = await supabase
    .from("poam_items")
    .delete()
    .eq("id", id)
    .eq("system_id", systemId);
  return { error };
}

// ── SPRS Assessments ──────────────────────────────────────────────────────

export async function loadSprsAssessment(systemId = "default") {
  if (!supabase) return localGet(`sprs_${systemId}`, {});
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("sprs_assessments")
    .select("*")
    .eq("system_id", systemId)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) { console.error("SPRS load error:", error); return {}; }
  return data?.statuses || {};
}

export async function saveSprsAssessment(statuses, metadata = {}, systemId = "default") {
  if (!supabase) {
    localSet(`sprs_${systemId}`, statuses);
    return { error: null };
  }
  const score = computeSprsScore(statuses);
  const userId = await getUserId();
  const { error } = await supabase
    .from("sprs_assessments")
    .upsert({
      system_id: systemId,
      user_id: userId,
      statuses,
      score,
      org_name: metadata.orgName || "",
      system_name: metadata.systemName || "",
      assess_date: metadata.assessDate && metadata.assessDate.trim() !== "" ? metadata.assessDate : new Date().toISOString().split("T")[0],
      updated_at: new Date().toISOString(),
    }, { onConflict: "system_id,user_id" });
  return { error };
}

function computeSprsScore(statuses) {
  // Quick score computation for DB storage
  let score = 110;
  const highValuePts = { "3.5.3":5, "3.7.5":3, "3.11.2":3, "3.11.3":3, "3.13.8":5, "3.13.11":3 };
  Object.entries(statuses).forEach(([id, status]) => {
    const pts = highValuePts[id] || 1;
    if (status === "not_met") score -= pts;
    else if (status === "partial") score -= Math.ceil(pts * 0.5);
  });
  return score;
}

// ── Evidence ──────────────────────────────────────────────────────────────

export async function loadEvidence(systemId = "default") {
  if (!supabase) return localGet(`evidence_${systemId}`, []);
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("evidence")
    .select("*")
    .eq("system_id", systemId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) { console.error("Evidence load error:", error); return []; }
  return data?.map(row => row.raw) || [];
}

export async function saveEvidence(item, systemId = "default") {
  if (!supabase) {
    const items = localGet(`evidence_${systemId}`, []);
    const idx = items.findIndex(i => i.id === item.id);
    if (idx >= 0) items[idx] = item;
    else items.unshift(item);
    localSet(`evidence_${systemId}`, items);
    return { error: null };
  }
  const userId = await getUserId();
  const { error } = await supabase
    .from("evidence")
    .upsert({
      id: item.id,
      system_id: systemId,
      user_id: userId,
      name: item.name,
      type: item.type,
      controls: item.controls || [],
      upload_date: item.uploadDate && item.uploadDate.trim() !== "" ? item.uploadDate : null,
      uploaded_by: item.uploadedBy,
      cui: item.cui || "none",
      status: item.status || "Current",
      raw: item,
    }, { onConflict: "id" });
  return { error };
}

export async function deleteEvidence(id, systemId = "default") {
  if (!supabase) {
    const items = localGet(`evidence_${systemId}`, []).filter(i => i.id !== id);
    localSet(`evidence_${systemId}`, items);
    return { error: null };
  }
  const { error } = await supabase
    .from("evidence")
    .delete()
    .eq("id", id)
    .eq("system_id", systemId);
  return { error };
}

// ── Control Assessments (Self-Assessment module) ───────────────────────────

export async function loadControlAssessments(systemId = "default") {
  if (!supabase) return localGet(`controls_${systemId}`, {});
  const { data, error } = await supabase
    .from("control_assessments")
    .select("*")
    .eq("system_id", systemId);
  if (error) { console.error("Controls load error:", error); return {}; }
  const result = {};
  (data || []).forEach(row => { result[row.control_id] = row; });
  return result;
}

export async function saveControlAssessment(controlId, assessment, systemId = "default") {
  if (!supabase) {
    const items = localGet(`controls_${systemId}`, {});
    items[controlId] = assessment;
    localSet(`controls_${systemId}`, items);
    return { error: null };
  }
  const userId = await getUserId();
  const { error } = await supabase
    .from("control_assessments")
    .upsert({
      system_id: systemId,
      user_id: userId,
      control_id: controlId,
      status: assessment.status || "Not Assessed",
      implementation: assessment.implementation || "",
      finding: assessment.finding || "",
      assessor: assessment.assessor || "",
      assessment_date: assessment.date && assessment.date.trim() !== "" ? assessment.date : new Date().toISOString().split("T")[0],
      updated_at: new Date().toISOString(),
    }, { onConflict: "system_id,control_id" });
  return { error };
}

// ── Nessus scan results ───────────────────────────────────────────────────

export async function saveScanResults(scanData, systemId = "default") {
  if (!supabase) {
    const scans = localGet(`scans_${systemId}`, []);
    scans.unshift({ ...scanData, savedAt: new Date().toISOString() });
    localSet(`scans_${systemId}`, scans.slice(0, 10)); // keep last 10
    return { error: null };
  }
  const userId = await getUserId();
  const { error } = await supabase
    .from("scan_results")
    .insert({
      system_id: systemId,
      user_id: userId,
      report_name: scanData.reportName,
      filename: scanData.filename,
      host_count: scanData.hosts?.length || 0,
      finding_count: scanData.findings?.length || 0,
      cat1_count: scanData.findings?.filter(f=>f.dodCat==="I").length || 0,
      cat2_count: scanData.findings?.filter(f=>f.dodCat==="II").length || 0,
      cat3_count: scanData.findings?.filter(f=>f.dodCat==="III").length || 0,
      raw: scanData,
    });
  return { error };
}

export async function loadScanHistory(systemId = "default") {
  if (!supabase) return localGet(`scans_${systemId}`, []);
  const { data, error } = await supabase
    .from("scan_results")
    .select("id, report_name, filename, host_count, finding_count, cat1_count, cat2_count, cat3_count, created_at")
    .eq("system_id", systemId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return [];
  return data || [];
}
