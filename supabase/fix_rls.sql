-- SentinelGRC — Fix RLS policies
-- Run this in Supabase SQL Editor to replace strict policies with working ones

-- Drop existing policies
DROP POLICY IF EXISTS "Users manage own POAM items" ON poam_items;
DROP POLICY IF EXISTS "Users manage own SPRS assessments" ON sprs_assessments;
DROP POLICY IF EXISTS "Users manage own evidence" ON evidence;
DROP POLICY IF EXISTS "Users manage own control assessments" ON control_assessments;
DROP POLICY IF EXISTS "Users manage own scan results" ON scan_results;

-- POAM — separate read/write policies
CREATE POLICY "poam_select" ON poam_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "poam_insert" ON poam_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "poam_update" ON poam_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "poam_delete" ON poam_items FOR DELETE USING (auth.uid() = user_id);

-- SPRS
CREATE POLICY "sprs_select" ON sprs_assessments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sprs_insert" ON sprs_assessments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sprs_update" ON sprs_assessments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sprs_delete" ON sprs_assessments FOR DELETE USING (auth.uid() = user_id);

-- Evidence
CREATE POLICY "evidence_select" ON evidence FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "evidence_insert" ON evidence FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "evidence_update" ON evidence FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "evidence_delete" ON evidence FOR DELETE USING (auth.uid() = user_id);

-- Control assessments
CREATE POLICY "ctrl_select" ON control_assessments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ctrl_insert" ON control_assessments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ctrl_update" ON control_assessments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ctrl_delete" ON control_assessments FOR DELETE USING (auth.uid() = user_id);

-- Scan results
CREATE POLICY "scan_select" ON scan_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "scan_insert" ON scan_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scan_update" ON scan_results FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "scan_delete" ON scan_results FOR DELETE USING (auth.uid() = user_id);

-- Also make user_id nullable so upsert doesn't fail if auth is slow
ALTER TABLE poam_items ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE sprs_assessments ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE evidence ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE control_assessments ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE scan_results ALTER COLUMN user_id DROP NOT NULL;
