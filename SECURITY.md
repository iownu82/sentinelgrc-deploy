# SentinelGRC — Security Notes

## Supply Chain Attack Mitigations

### Why we are low-risk vs the Axios March 2026 attack

The Axios npm supply chain attack (March 31, 2026) worked by:
1. Compromising a maintainer's npm token
2. Publishing a malicious version with a postinstall hook
3. The hook ran arbitrary code during `npm install`

**SentinelGRC's protections:**

**1. Zero Axios dependency**
We use native `fetch()` throughout. Axios is not in our
dependency tree at all — direct or transitive.

**2. Minimal dependencies — only 4**
- react 18.3.1 (Meta — highest scrutiny on npm)
- react-dom 18.3.1 (same)
- recharts 2.12.7 (charts only, no network calls, no postinstall)
- vite 5.4.2 + plugin (dev only, never runs in production)

**3. Exact version pinning (no caret ^)**
package.json pins exact versions. `^18.3.1` would allow
18.3.2, 18.4.0 etc. We pin `18.3.1` — only that exact version.

**4. .npmrc: ignore-scripts=true**
postinstall hooks are disabled for ALL packages.
This is the single most effective mitigation against
the class of attack used against Axios.

**5. Use `npm ci` not `npm install`**
`npm ci` installs exactly what is in the lockfile.
`npm install` resolves versions fresh — introduces drift.

## Safe install procedure

```bash
# Step 1: Verify no axios in dependency tree (should return nothing)
cat package.json | grep axios

# Step 2: Install with scripts disabled
npm ci --ignore-scripts

# Step 3: Audit before building
npm audit

# Step 4: If audit is clean, build
npm run build
```

## What `ignore-scripts=true` breaks

Nothing for this project. The only thing it disables is
postinstall hooks — and none of our 4 dependencies use them.

If you ever add a dependency that requires a postinstall
(e.g. Playwright, some native modules), you will need to
explicitly re-enable scripts for that specific package:
```
npm install <package> --ignore-scripts=false
```

## Vercel deployment note

Vercel runs `npm install` in their build environment.
The .npmrc file is respected by Vercel's build system,
so `ignore-scripts=true` applies during the Vercel build too.
