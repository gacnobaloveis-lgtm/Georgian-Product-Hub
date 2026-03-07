import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare module "express-session" {
  interface SessionData {
    isAdmin?: boolean;
    adminRole?: string;
  }
}

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "ძალიან ბევრი მოთხოვნა. სცადეთ მოგვიანებით." },
});
app.use("/api/", apiLimiter);

app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

async function ensurePasswordHashColumn() {
  try {
    const { db } = await import("./db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash varchar`);
    console.log("[migrate] password_hash column ensured");
  } catch (err) {
    console.error("[migrate] Error ensuring password_hash column:", err);
  }
}

async function seedAdminUser() {
  try {
    await ensurePasswordHashColumn();
    const { db } = await import("./db");
    const { users } = await import("@shared/models/auth");
    const { eq } = await import("drizzle-orm");
    const crypto = await import("crypto");

    const adminPhone = "599523350";
    const [existing] = await db.select().from(users).where(eq(users.phone, adminPhone));
    if (!existing) {
      const password = "juansheri198222";
      const salt = crypto.randomBytes(16).toString("hex");
      const hash = crypto.scryptSync(password, salt, 64).toString("hex");
      const passwordHash = `${salt}:${hash}`;

      await db.insert(users).values({
        id: `guest_${crypto.randomUUID()}`,
        firstName: "ჯონი",
        lastName: "კაპანაძე",
        city: "ქუთაისი",
        address: "მელიქიშვილი",
        phone: adminPhone,
        passwordHash,
        role: "admin",
      });
      console.log("[seed] Admin user created");
    } else if (existing.role !== "admin") {
      await db.update(users).set({ role: "admin" }).where(eq(users.id, existing.id));
      console.log("[seed] Admin role updated");
    }
  } catch (err) {
    console.error("[seed] Error seeding admin:", err);
  }
}

async function ensureMediaDataColumns() {
  try {
    const { pool } = await import("./db");
    await pool.query(`ALTER TABLE media ADD COLUMN IF NOT EXISTS data bytea`);
    await pool.query(`ALTER TABLE media ADD COLUMN IF NOT EXISTS mime_type varchar DEFAULT 'image/webp'`);
    console.log("[migrate] media data/mime_type columns ensured");
  } catch (err) {
    console.error("[migrate] Error ensuring media data columns:", err);
  }
}

async function migrateFilesToDb() {
  try {
    const { pool } = await import("./db");
    const path = await import("path");
    const fs = await import("fs");
    const uploadsDir = path.join(process.cwd(), "public", "uploads");

    const result = await pool.query("SELECT id, filename FROM media WHERE data IS NULL");
    let migrated = 0;
    for (const row of result.rows) {
      const filePath = path.join(uploadsDir, row.filename);
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        await pool.query("UPDATE media SET data = $1, mime_type = $2 WHERE id = $3", [buffer, "image/webp", row.id]);
        migrated++;
      }
    }

    if (!fs.existsSync(uploadsDir)) return;
    const allFiles = fs.readdirSync(uploadsDir).filter(f => f.endsWith(".webp") || f.endsWith(".png") || f.endsWith(".jpg"));
    const mediaRes = await pool.query("SELECT filename FROM media");
    const knownFiles = new Set(mediaRes.rows.map((r: any) => r.filename));
    let newInserted = 0;
    for (const fn of allFiles) {
      if (knownFiles.has(fn)) continue;
      const filePath = path.join(uploadsDir, fn);
      const buffer = fs.readFileSync(filePath);
      const ext = fn.split(".").pop();
      const mime = ext === "png" ? "image/png" : ext === "jpg" ? "image/jpeg" : "image/webp";
      await pool.query(
        "INSERT INTO media (filename, original_name, path, size, data, mime_type) VALUES ($1, $2, $3, $4, $5, $6)",
        [fn, fn, `/uploads/${fn}`, String(buffer.length), buffer, mime]
      );
      newInserted++;
    }

    const total = migrated + newInserted;
    if (total > 0) {
      console.log(`[migrate] ${total} images migrated to database (${migrated} updated, ${newInserted} new)`);
    }
  } catch (err) {
    console.error("[migrate] Error migrating files to DB:", err);
  }
}

process.on("uncaughtException", (err) => {
  console.error("[CRASH GUARD] Uncaught exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[CRASH GUARD] Unhandled rejection:", reason);
});

let consecutiveFailures = 0;
const MAX_FAILURES = 5;

async function checkHealth(): Promise<{ ok: boolean; details: string }> {
  try {
    const { pool: dbPool } = await import("./db");
    const result = await dbPool.query("SELECT 1 as alive");
    if (result.rows[0]?.alive === 1) {
      return { ok: true, details: "DB connected" };
    }
    return { ok: false, details: "DB query failed" };
  } catch (err: any) {
    return { ok: false, details: `DB error: ${err.message}` };
  }
}

function startSelfMonitoring() {
  const INTERVAL = 60_000;
  setInterval(async () => {
    const health = await checkHealth();
    if (!health.ok) {
      consecutiveFailures++;
      console.error(`[MONITOR] Health check failed (${consecutiveFailures}/${MAX_FAILURES}): ${health.details}`);
      if (consecutiveFailures >= MAX_FAILURES) {
        console.error("[MONITOR] Too many failures, restarting process...");
        process.exit(1);
      }
    } else {
      if (consecutiveFailures > 0) {
        console.log(`[MONITOR] Health restored after ${consecutiveFailures} failures`);
      }
      consecutiveFailures = 0;
    }
  }, INTERVAL);
  console.log(`[MONITOR] Self-monitoring started (interval: ${INTERVAL / 1000}s, max failures: ${MAX_FAILURES})`);
}

let appReady = false;

app.get("/health", async (_req, res) => {
  try {
    const health = await checkHealth();
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    res.status(health.ok ? 200 : 503).json({
      status: health.ok ? "healthy" : "unhealthy",
      ready: appReady,
      details: health.details,
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      memory: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(200).json({
      status: "starting",
      ready: false,
      details: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

const port = parseInt(process.env.PORT || "5000", 10);
console.log(`[BOOT] About to listen on port ${port}...`);
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`[BOOT] Server listening on port ${port}`);
  log(`serving on port ${port}`);
  initializeApp();
});

async function initializeApp() {
  try {
    await setupAuth(app);
    registerAuthRoutes(app);

    await registerRoutes(httpServer, app);

    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error("Internal Server Error:", err);

      if (res.headersSent) {
        return next(err);
      }

      return res.status(status).json({ message });
    });

    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    log("App initialization completed");
  } catch (err: any) {
    console.error("[STARTUP] App init error:", err.message);
  }

  try {
    await seedAdminUser();
    await ensureMediaDataColumns();
    await migrateFilesToDb();
    log("All migrations completed successfully");
  } catch (err: any) {
    console.error("[STARTUP] Migration error (non-fatal):", err.message);
  }

  appReady = true;
  startSelfMonitoring();
}
