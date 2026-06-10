---
name: Dev server backend reload
description: Why new/changed backend routes 404 (SPA fallback) until the workflow is restarted.
---

The "Start application" workflow runs the dev script, which launches the Express backend via `tsx server/index.ts` (NOT `tsx watch`). So the backend does NOT auto-reload on file changes — only the Vite frontend has HMR.

**Symptom:** A newly added API route returns the SPA `index.html` (vite catch-all) or behaves like old code, even though the source is correct. Existing routes still work because they were registered at boot.

**Fix:** After editing any server/*.ts (routes, storage, etc.), restart the "Start application" workflow before testing the endpoint. Frontend-only edits don't need a restart.
