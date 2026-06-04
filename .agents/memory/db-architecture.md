---
name: DB architecture (dev vs prod) & schema changes
description: Dev and prod use SEPARATE databases; how to add a new table/column safely to both
---

# Two separate databases

- **Dev** (this Replit env): `DATABASE_URL` points to a LOCAL Replit Postgres (host `helium`). Use `executeSql` (database skill) for dev.
- **Prod** (live spiningebi.ge on Railway): a SEPARATE Railway Postgres (`shinkansen.proxy.rlwy.net`), reachable via secrets `RAILWAY_DATABASE_URL` (internal) / `RAILWAY_PG_PUBLIC_URL` (public proxy, use this from the Replit shell with `ssl:{rejectUnauthorized:false}`).
- Dev and prod data DIFFER (different products/IDs). A product id that exists in dev may 404 in prod.

# Adding a table or column

**Why:** Railway deploy (GitHub Contents API push → auto-rebuild) does NOT run drizzle migrations or `db:push` on start. The `start` script is just `node dist/index.cjs`. So a new table defined only in `shared/schema.ts` will NOT appear in either DB automatically. There is no `migrations/` dir; `drizzle.config.ts` schema = `./shared/schema.ts`.

**How to apply:**
1. Define the table in `shared/schema.ts` (NOT `shared/models/auth.ts`) so drizzle-kit/types pick it up.
2. Apply the change to BOTH DBs with a targeted, idempotent `CREATE TABLE IF NOT EXISTS` (or `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`):
   - Dev: `executeSql({ sqlQuery: "CREATE TABLE IF NOT EXISTS ..." })`.
   - Prod: a Node `pg` one-off from the shell using `process.env.RAILWAY_PG_PUBLIC_URL` (never print the secret value).
3. AVOID running `drizzle-kit push` against prod — it diffs the WHOLE schema file vs the live DB and can propose destructive ALTER/DROP if the live schema has drifted. Additive `CREATE TABLE IF NOT EXISTS` is the safe path.
