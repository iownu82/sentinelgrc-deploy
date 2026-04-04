# SentinelGRC — Supabase Setup Guide

## 1. Create Supabase Project

1. Go to https://supabase.com and sign in
2. Click **New Project**
3. Name it `sentinelgrc` — pick the US East region (or closest to you for now)
4. Set a strong database password — save it somewhere safe
5. Wait ~2 minutes for the project to provision

## 2. Run the Database Schema

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Open the file `supabase/schema.sql` from your sentinelgrc-deploy folder
4. Paste the entire contents into the SQL Editor
5. Click **Run** (Ctrl+Enter)
6. You should see: "Success. No rows returned"
7. Click **Table Editor** to verify the 5 tables were created:
   - `poam_items`
   - `sprs_assessments`
   - `evidence`
   - `control_assessments`
   - `scan_results`

## 3. Get Your API Keys

1. In Supabase, click **Settings** (gear icon) → **API**
2. Copy:
   - **Project URL** → looks like `https://abcdefgh.supabase.co`
   - **anon public** key → long JWT string starting with `eyJ...`

## 4. Configure the App

```bash
cd ~/Downloads/sentinelgrc-deploy
cp .env.example .env
```

Edit `.env` and replace with your actual values:
```
VITE_SUPABASE_URL=https://your-actual-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key
```

## 5. Test Locally

```bash
npm install --ignore-scripts
npm run dev
```

Open http://localhost:5173 — you should see **🔐 SIGN IN TO SAVE DATA** in the sidebar.

Click it → Create Account → Sign in → your data now persists between sessions.

## 6. Deploy to Vercel with Persistence

When deploying to Vercel, add the environment variables:

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
3. Redeploy:
```bash
npm run build
vercel --prod
```

## 7. For AWS GovCloud (Future)

When you're ready for IL4/IL5:
- Supabase → export schema and data
- Deploy PostgreSQL on AWS RDS in us-gov-west-1
- Update connection string to point at GovCloud RDS
- The application code doesn't change — only the connection target

## What Gets Persisted

| Feature | Saved to Supabase |
|---|---|
| POAM Tracker | All items, milestones, status |
| SPRS Calculator | All 110 practice assessments + score |
| Evidence Tracker | All evidence records |
| Self-Assessment | All control assessment statuses |
| Nessus Importer | Scan history (last 20 scans) |

## Security Notes

- Row Level Security (RLS) is enabled on all tables
- Each user can only see their own data — no cross-tenant data leakage
- Supabase anon key is safe to expose in the browser (it's designed for this)
- All data is encrypted at rest (AES-256) and in transit (TLS 1.2+)
- For production: enable email confirmation in Supabase Auth settings
