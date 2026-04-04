# SentinelGRC — Demo Deployment

## Deploy to Vercel in 3 steps

### Step 1 — Install dependencies
Open Terminal, navigate to this folder, run:
```
npm install
```

### Step 2 — Deploy to Vercel
Option A — Vercel CLI (fastest):
```
npx vercel
```
Follow the prompts. Takes 2 minutes. You get a live URL.

Option B — Drag and drop:
1. Run: npm run build
2. Go to vercel.com → New Project → drag the /dist folder

### Step 3 — Done
Vercel gives you a URL like: https://sentinelgrc-xyz.vercel.app
Share with anyone. Fully interactive demo.

## What's included
- Multi-Framework Dashboard (800-53 / CMMC / CSRMC)
- Self-Assessment Module (800-53 Rev 5)
- ATO Package Generator (eMASS / DIBCAC / SPRS / SAV)
- Unified Security Dashboard (all tool feeds)
- POAM Tracker
- Deployment Architecture (LM/F-35 scenario)
- Product Roadmap (Cloud → Classified → SAP)

## Next step — AWS GovCloud backend
Once you have customer validation, add the real backend:
- AWS GovCloud account
- Bedrock for AI analysis
- RDS PostgreSQL with Row-Level Security
- Real Tenable/CrowdStrike connectors
- CAC authentication

## Tech stack
- React 18 + Vite
- Recharts for data visualization
- No backend (demo mode)
