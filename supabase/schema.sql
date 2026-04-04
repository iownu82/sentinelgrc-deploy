-- ============================================================
-- SentinelGRC — Supabase Schema
-- Run this entire script in: Supabase → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── POAM Items ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS poam_items (
  id              TEXT PRIMARY KEY,
  system_id       TEXT NOT NULL DEFAULT 'default',
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  control_id      TEXT,
  weakness        TEXT,
  resources       TEXT,
  scheduled_completion DATE,
  status          TEXT DEFAULT 'Ongoing',
  cat_level       TEXT,
  milestones      TEXT,
  poc             TEXT,
  action_owners   TEXT[] DEFAULT '{}',
  cost            TEXT,
  severity        TEXT,
  comments        TEXT,
  raw             JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS poam_items_system_idx ON poam_items(system_id);
CREATE INDEX IF NOT EXISTS poam_items_user_idx   ON poam_items(user_id);

-- ── SPRS Assessments ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sprs_assessments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  system_id       TEXT NOT NULL DEFAULT 'default',
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  statuses        JSONB NOT NULL DEFAULT '{}',
  score           INTEGER DEFAULT 110,
  org_name        TEXT,
  system_name     TEXT,
  assess_date     DATE,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(system_id, user_id)
);

CREATE INDEX IF NOT EXISTS sprs_system_idx ON sprs_assessments(system_id);

-- ── Evidence ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evidence (
  id              TEXT PRIMARY KEY,
  system_id       TEXT NOT NULL DEFAULT 'default',
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            TEXT,
  controls        TEXT[] DEFAULT '{}',
  upload_date     DATE,
  uploaded_by     TEXT,
  cui             TEXT DEFAULT 'none',
  status          TEXT DEFAULT 'Current',
  raw             JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS evidence_system_idx ON evidence(system_id);
CREATE INDEX IF NOT EXISTS evidence_user_idx   ON evidence(user_id);

-- ── Control Assessments ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS control_assessments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  system_id       TEXT NOT NULL DEFAULT 'default',
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  control_id      TEXT NOT NULL,
  status          TEXT DEFAULT 'Not Assessed',
  implementation  TEXT,
  finding         TEXT,
  assessor        TEXT,
  assessment_date DATE,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(system_id, control_id, user_id)
);

CREATE INDEX IF NOT EXISTS ctrl_assess_system_idx ON control_assessments(system_id);

-- ── Scan Results ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scan_results (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  system_id       TEXT NOT NULL DEFAULT 'default',
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  report_name     TEXT,
  filename        TEXT,
  host_count      INTEGER DEFAULT 0,
  finding_count   INTEGER DEFAULT 0,
  cat1_count      INTEGER DEFAULT 0,
  cat2_count      INTEGER DEFAULT 0,
  cat3_count      INTEGER DEFAULT 0,
  raw             JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scan_system_idx ON scan_results(system_id);

-- ── Row Level Security (RLS) ──────────────────────────────────────────────
-- Users can only see/modify their own data

ALTER TABLE poam_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprs_assessments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence           ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_results       ENABLE ROW LEVEL SECURITY;

-- POAM policies
CREATE POLICY "Users manage own POAM items" ON poam_items
  FOR ALL USING (auth.uid() = user_id);

-- SPRS policies
CREATE POLICY "Users manage own SPRS assessments" ON sprs_assessments
  FOR ALL USING (auth.uid() = user_id);

-- Evidence policies
CREATE POLICY "Users manage own evidence" ON evidence
  FOR ALL USING (auth.uid() = user_id);

-- Control assessment policies
CREATE POLICY "Users manage own control assessments" ON control_assessments
  FOR ALL USING (auth.uid() = user_id);

-- Scan results policies
CREATE POLICY "Users manage own scan results" ON scan_results
  FOR ALL USING (auth.uid() = user_id);

-- ── Auto-update updated_at timestamps ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER poam_updated_at
  BEFORE UPDATE ON poam_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER sprs_updated_at
  BEFORE UPDATE ON sprs_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER ctrl_updated_at
  BEFORE UPDATE ON control_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Done! Tables created with RLS enabled.
-- Each user's data is completely isolated.
-- ============================================================
