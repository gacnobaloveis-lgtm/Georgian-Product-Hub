---
name: Self-monitor self-kill caused offline+manual-deploy loop
description: Why the app kept going offline on Railway and needed manual redeploys
---
The app's self-monitoring loop used to call `process.exit(1)` after N consecutive
failed DB health checks (SELECT 1). On Railway, a brief managed-Postgres blip/restart
made the app kill itself; Railway restarted it, but if the DB stayed unreachable a bit,
the container hit its restart limit and stayed "Crashed"/offline until a MANUAL redeploy.

**Fix applied:** removed the `process.exit(1)` from `startSelfMonitoring` — keep logging
failures but never kill the process. The pg Pool auto-recovers when the DB returns, so
the app self-heals without a redeploy.

**Why:** on a platform with a managed DB, self-killing on transient DB errors is strictly
harmful — the pool already reconnects. Killing only converts a 10-second blip into a
permanent outage requiring human action.

**How to apply:** never `process.exit` on transient/runtime DB errors in long-running
services here. Boot-time fail-closed (missing SESSION_SECRET etc.) is a separate,
intentional case. If "site goes offline by itself, needs manual deploy" recurs, also
check the initializeApp() catch (setupAuth/session store) which still exits in production
if the DB is down AT boot.
