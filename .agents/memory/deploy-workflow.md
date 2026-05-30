---
name: Deploy workflow (GitHub Contents API → Railway)
description: How code reaches the live spiningebi.ge site, and the recurring /tmp script wipe + SW cache gotchas
---

# Deploy flow for spiningebi.ge

This Replit project is NOT the live site's source of truth. The live site (www.spiningebi.ge, Cloudflare → Railway) deploys from GitHub repo `gacnobaloveis-lgtm/Georgian-Product-Hub` (main branch). Railway auto-rebuilds on each push.

To ship a change: edit files locally, then push the changed files to GitHub via the Contents API using `GITHUB_TOKEN`. A helper script lives at `/tmp/deploy_multi.mjs` (one PUT per file, fetches current sha, base64 content; binary files detected by extension `.png/.jpg/.jpeg/.webp/.gif/.ico` and read as Buffer, text files as utf8).

**Gotcha — /tmp gets wiped between turns/sessions.** `deploy_multi.mjs` and any cached source images frequently disappear. Recreate the script before deploying; keep its FILES array current with whatever you just edited. Don't assume it still exists.

**Verifying a deploy actually went live** (Railway build takes ~1-3 min): the GitHub commit succeeding (200/201) is NOT proof the site updated. Confirm by curling the live site: check `index.html` references the new hashed bundle, grep the live JS bundle for a string unique to your change, and curl the new asset URLs for 200.

# Service worker caching gotcha
`client/public/sw.js` registers a service worker (used for web push). It caches `/assets/*` and static image extensions. **If a user reports "updates aren't reaching the live site" even after hard refresh, suspect the SW cache, not the deploy.** Fix pattern: bump `CACHE_NAME` (forces SW update → activate purges old caches) and use stale-while-revalidate so future deploys propagate without a manual reset. After deploy the user must reload twice (1st installs new SW, 2nd shows new content).
