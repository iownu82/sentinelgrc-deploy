-- ============================================================
-- RiskRadar — Supabase Schema
-- FIPS 200 / NIST 800-53 Rev 5 MODERATE Baseline
-- Run this in Supabase SQL Editor before first deployment
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── organizations ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  slug           TEXT UNIQUE NOT NULL,          -- URL-safe identifier
  contract_number TEXT,                          -- CAGE code / contract
  program_type   TEXT CHECK (program_type IN (
                   'dod_program','cmmc_sb','prime_contractor','subcontractor'
                 )),
  status         TEXT DEFAULT 'bootstrap' CHECK (status IN (
                   'bootstrap','active','suspended','expired'
                 )),
  fips_category  TEXT DEFAULT 'MODERATE' CHECK (fips_category IN ('LOW','MODERATE','HIGH')),
  created_by_admin UUID,                         -- Ballard IS3 admin user_id
  created_at     TIMESTAMPTZ DEFAULT now(),
  metadata       JSONB DEFAULT '{}',
  policy_overrides JSONB DEFAULT '{}',           -- Per-org policy overrides
  email_domain_allowlist TEXT[],                 -- .mil email enforcement
  data_classification TEXT DEFAULT 'CUI' CHECK (data_classification IN (
                   'UNCLASSIFIED','CUI','SECRET'
                 ))
);

-- ─── bootstrap_tokens ─────────────────────────────────────────────────────────
-- Single-use tokens for initial org setup (never stored raw, only SHA-256 hash)
CREATE TABLE IF NOT EXISTS bootstrap_tokens (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID REFERENCES organizations(id) ON DELETE CASCADE,
  token_hash     TEXT NOT NULL UNIQUE,           -- SHA-256 of raw token. Raw NEVER stored.
  created_at     TIMESTAMPTZ DEFAULT now(),
  expires_at     TIMESTAMPTZ NOT NULL,           -- 24 hours from creation
  used_at        TIMESTAMPTZ,                    -- NULL until consumed
  used_by_ip     TEXT,
  used_by_user_agent TEXT
);

-- ─── org_members ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_members (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES organizations(id),
  user_id        UUID NOT NULL REFERENCES auth.users(id),
  role           TEXT NOT NULL CHECK (role IN (
                   'issm','isso','assessor','auditor','readonly'
                 )),
  status         TEXT DEFAULT 'pending' CHECK (status IN (
                   'pending','active','locked','expired','suspended'
                 )),
  -- Login security (AC-7)
  failed_login_count  INTEGER DEFAULT 0,         -- Max 3 before auto-lock
  locked_at           TIMESTAMPTZ,
  locked_reason       TEXT,
  unlocked_at         TIMESTAMPTZ,
  unlocked_by         UUID REFERENCES auth.users(id),
  -- Cyber Awareness tracking (AT-2, AT-4)
  cyber_awareness_date      DATE,
  cyber_awareness_cert_path TEXT,                -- Encrypted S3 path
  cyber_awareness_verified  BOOLEAN DEFAULT FALSE,
  -- Notification flags
  notified_30d     BOOLEAN DEFAULT FALSE,
  notified_14d     BOOLEAN DEFAULT FALSE,
  notified_7d      BOOLEAN DEFAULT FALSE,
  -- Password policy (IA-5)
  password_changed_at   TIMESTAMPTZ,
  password_expires_at   TIMESTAMPTZ,
  password_history      JSONB DEFAULT '[]',      -- Last 12 Argon2id hashes
  -- MFA
  mfa_enrolled          BOOLEAN DEFAULT FALSE,
  mfa_secret_encrypted  TEXT,                    -- AES-256 encrypted TOTP secret
  -- Machine cert (IA-3)
  machine_cert_required BOOLEAN DEFAULT FALSE,
  -- Session tracking
  last_login_at         TIMESTAMPTZ,
  last_login_ip         TEXT,
  last_login_ua         TEXT,
  -- Rules of behavior (PL-4, PS-6)
  rules_accepted_at     TIMESTAMPTZ,
  rules_accepted_ip     TEXT,
  -- Profile
  display_name          TEXT,
  job_title             TEXT,
  phone                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- Computed column: account expiry based on Cyber Awareness date
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS
  account_expires_at DATE GENERATED ALWAYS AS (cyber_awareness_date + INTERVAL '365 days') STORED;

-- ─── authorized_machines ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS authorized_machines (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES organizations(id),
  machine_name   TEXT NOT NULL,
  cert_thumbprint TEXT NOT NULL UNIQUE,          -- SHA-256 of machine cert
  cert_subject   TEXT NOT NULL,
  cert_issuer    TEXT NOT NULL,
  cert_serial    TEXT NOT NULL,
  enrolled_by    UUID REFERENCES auth.users(id),
  enrolled_at    TIMESTAMPTZ DEFAULT now(),
  cert_valid_from DATE NOT NULL,
  cert_expires_at DATE NOT NULL,
  status         TEXT DEFAULT 'active' CHECK (status IN ('active','revoked','expired')),
  revoked_at     TIMESTAMPTZ,
  revoked_by     UUID REFERENCES auth.users(id),
  revoked_reason TEXT,
  last_seen_at   TIMESTAMPTZ,
  last_seen_ip   TEXT
);

-- ─── cyber_awareness_certs ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cyber_awareness_certs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(id),
  member_id        UUID NOT NULL REFERENCES org_members(id),
  completion_date  DATE NOT NULL,
  cert_storage_path TEXT,
  cert_sha256      TEXT,                         -- File integrity hash
  textract_extracted_date DATE,                  -- AWS Textract auto-extracted date
  date_manually_confirmed BOOLEAN DEFAULT FALSE,
  uploaded_by      UUID REFERENCES auth.users(id),
  uploaded_at      TIMESTAMPTZ DEFAULT now(),
  verified_by      UUID REFERENCES auth.users(id),
  verified_at      TIMESTAMPTZ,
  training_year    INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM completion_date)::INTEGER) STORED
);

-- ─── jti_denylist ─────────────────────────────────────────────────────────────
-- JWT denylist for replay attack prevention (SC-23, anti-replay)
CREATE TABLE IF NOT EXISTS jti_denylist (
  jti          TEXT PRIMARY KEY,
  user_id      UUID,
  org_id       UUID,
  revoked_at   TIMESTAMPTZ DEFAULT now(),
  reason       TEXT,                             -- 'logout','timeout','rotation','lockout'
  expires_at   TIMESTAMPTZ NOT NULL              -- purge after token natural expiry
);

-- ─── session_nonces ───────────────────────────────────────────────────────────
-- Request nonces for replay prevention (SC-23)
CREATE TABLE IF NOT EXISTS session_nonces (
  nonce        TEXT PRIMARY KEY,
  user_id      UUID,
  created_at   TIMESTAMPTZ DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL              -- 10 minutes
);

-- ─── audit_log ────────────────────────────────────────────────────────────────
-- Append-only audit log (AU-2, AU-3, AU-9, AU-10, AU-11)
-- NO UPDATE or DELETE RLS — tamper-proof
CREATE TABLE IF NOT EXISTS audit_log (
  id            BIGSERIAL PRIMARY KEY,
  org_id        UUID REFERENCES organizations(id),
  actor_id      UUID,
  actor_role    TEXT,
  action        TEXT NOT NULL,
  target_id     UUID,
  target_type   TEXT,
  ip_address    TEXT,
  user_agent    TEXT,
  session_id    TEXT,
  nonce         TEXT,
  request_ts    TIMESTAMPTZ,
  details       JSONB DEFAULT '{}',
  previous_hash TEXT,                            -- SHA-256 chain for tamper detection
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ─── update_feed_items ────────────────────────────────────────────────────────
-- Security update feed from gov sources (DISA, NIST, CISA, etc.)
CREATE TABLE IF NOT EXISTS update_feed_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source        TEXT NOT NULL,
  source_id     TEXT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  severity      TEXT CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW','INFO')),
  category      TEXT,
  published_date DATE NOT NULL,
  source_url    TEXT,
  raw_data      JSONB,
  checksum      TEXT NOT NULL,
  polled_at     TIMESTAMPTZ DEFAULT now(),
  included_in_package_id UUID,
  classification TEXT DEFAULT 'UNCLASSIFIED'
);

-- ─── update_transfer_log ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS update_transfer_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID REFERENCES organizations(id),
  package_version TEXT NOT NULL,
  package_sha256 TEXT NOT NULL,
  transfer_method TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN (
                  'GENERATED','DOWNLOADED','TRANSFERRED','IMPORTED','REJECTED','EXPIRED'
                )),
  initiated_by  UUID REFERENCES auth.users(id),
  initiated_at  TIMESTAMPTZ DEFAULT now(),
  ao_approved_by UUID REFERENCES auth.users(id),
  ao_approved_at TIMESTAMPTZ,
  destination_system TEXT,
  item_summary  JSONB
);

-- ═══ ROW-LEVEL SECURITY POLICIES ════════════════════════════════════════════

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE authorized_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE cyber_awareness_certs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_feed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_transfer_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE jti_denylist ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_nonces ENABLE ROW LEVEL SECURITY;

-- Organizations: members can see their own org only
CREATE POLICY "org_isolation" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Org members: see only members of own org
CREATE POLICY "members_org_isolation" ON org_members
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM org_members m2
      WHERE m2.user_id = auth.uid() AND m2.status = 'active'
    )
  );

-- ISSM/ISSO can manage members
CREATE POLICY "issm_manage_members" ON org_members
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM org_members m2
      WHERE m2.user_id = auth.uid()
        AND m2.role IN ('issm','isso')
        AND m2.status = 'active'
    )
  );

-- Audit log: INSERT only, no UPDATE/DELETE (AU-9 tamper protection)
CREATE POLICY "audit_insert_only" ON audit_log
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
CREATE POLICY "audit_select_issm" ON audit_log
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid()
        AND role IN ('issm','isso')
        AND status = 'active'
    )
  );

-- Machines: org isolation
CREATE POLICY "machines_org_isolation" ON authorized_machines
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Certs: org isolation
CREATE POLICY "certs_org_isolation" ON cyber_awareness_certs
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Update feed: all authenticated users can read
CREATE POLICY "updates_read_all" ON update_feed_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Transfer log: org isolation
CREATE POLICY "transfer_log_org" ON update_transfer_log
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ═══ INDEXES ════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_org ON audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_jti_expires ON jti_denylist(expires_at);
CREATE INDEX IF NOT EXISTS idx_nonces_expires ON session_nonces(expires_at);
CREATE INDEX IF NOT EXISTS idx_updates_source ON update_feed_items(source, source_id);
CREATE INDEX IF NOT EXISTS idx_updates_severity ON update_feed_items(severity);
CREATE INDEX IF NOT EXISTS idx_machine_thumbprint ON authorized_machines(cert_thumbprint);

-- ═══ CLEANUP FUNCTIONS ══════════════════════════════════════════════════════

-- Auto-purge expired nonces and denylisted tokens (run via cron)
CREATE OR REPLACE FUNCTION purge_expired_tokens() RETURNS void AS $$
BEGIN
  DELETE FROM jti_denylist WHERE expires_at < now();
  DELETE FROM session_nonces WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment failed login counter
CREATE OR REPLACE FUNCTION increment_failed_logins(p_user_id UUID, p_org_id UUID)
RETURNS INTEGER AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE org_members
  SET failed_login_count = failed_login_count + 1
  WHERE user_id = p_user_id AND org_id = p_org_id
  RETURNING failed_login_count INTO v_count;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reset failed login counter on success
CREATE OR REPLACE FUNCTION reset_failed_logins(p_user_id UUID, p_org_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE org_members
  SET failed_login_count = 0,
      last_login_at = now(),
      last_login_ip = current_setting('request.headers', true)::json->>'x-forwarded-for'
  WHERE user_id = p_user_id AND org_id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Lock account after max attempts
CREATE OR REPLACE FUNCTION lock_account(p_user_id UUID, p_org_id UUID, p_reason TEXT)
RETURNS void AS $$
BEGIN
  UPDATE org_members
  SET status = 'locked',
      locked_at = now(),
      locked_reason = p_reason
  WHERE user_id = p_user_id AND org_id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
