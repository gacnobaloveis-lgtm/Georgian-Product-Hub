import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import sharp from "sharp";
import { removeBackground } from "@imgly/background-removal-node";
import path from "path";
import fs from "fs";
import { randomUUID, createHash, createHmac, timingSafeEqual } from "crypto";
import express from "express";
import cookieParser from "cookie-parser";
import https from "https";
import { pool } from "./db";
import webpush from "web-push";

// ── Real-time online visitors tracker (in-memory) ──────────────────────────
const activeSessions = new Map<string, number>(); // sessionId -> lastSeen ms
const SESSION_TTL_MS = 90_000; // 90 seconds

function pruneOldSessions() {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [id, ts] of activeSessions) {
    if (ts < cutoff) activeSessions.delete(id);
  }
}

// Initialize web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || "mailto:spiningebi@gmail.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const uploadsDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function sanitizeString(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// Strip tags + collapse whitespace/&nbsp; — used to detect "empty" rich text
// content like Quill's blank state (`<p><br></p>`, `<p>&nbsp;</p>`, etc).
function isRichTextEmpty(input: string | undefined | null): boolean {
  if (!input) return true;
  const stripped = String(input)
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .trim();
  return stripped.length === 0;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 200);
}

const ADMIN_SECRET = process.env.ADMIN_PASSWORD;

const ADMIN_ROLES = ["admin", "moderator", "sales_admin"];

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  if (req.session && req.session.adminRole && ADMIN_ROLES.includes(req.session.adminRole)) {
    return next();
  }
  return res.status(401).json({ message: "არაავტორიზებული. გთხოვთ გაიაროთ ავტორიზაცია." });
}

function requireAdminOnly(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  if (req.session && req.session.adminRole === "admin") {
    return next();
  }
  return res.status(401).json({ message: "მხოლოდ ადმინისტრატორს აქვს წვდომა." });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("მხოლოდ სურათის ფაილები დაშვებულია (JPEG, PNG, WebP, GIF)"));
    }
  },
});

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

const DEFAULT_REFERRAL_CREDIT = 5;
const REFERRAL_COOKIE_DAYS = 30;

// ── Social-media bot prerenderer ────────────────────────────────────────────
// Facebook, Telegram, WhatsApp, Twitter etc. don't run JS.
// When they crawl /products/:id we return a tiny HTML page with proper OG tags
// so the shared link shows the product image + title + price.
const SOCIAL_BOTS =
  /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp|TelegramBot|Slackbot|Discordbot|vkShare|Pinterest|Instagram|Googlebot/i;

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function notifyStockRestock(productId: number, productName: string, imageUrl: string | null) {
  const pending = await storage.getPendingStockNotifications(productId);
  if (pending.length === 0) return;

  const payload = JSON.stringify({
    title: "📦 დაემატა ნივთი რომელსაც ელოდებოდით",
    body: `${productName} ისევ მარაგშია`,
    url: `/products/${productId}`,
    imageUrl: imageUrl || undefined,
    tag: `stock-restock-${productId}`,
  });

  const sentIds: number[] = [];
  for (const n of pending) {
    try {
      if (n.userId) {
        const subs = await storage.getUserPushSubscriptions(n.userId);
        for (const sub of subs) {
          webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { urgency: "high", TTL: 60 * 60 * 24 }
          ).catch(() => storage.removePushSubscription(sub.endpoint));
        }
      }
      sentIds.push(n.id);
    } catch (err) {
      console.error("[stock-notify] send failed:", err);
    }
  }
  if (sentIds.length > 0) await storage.markStockNotificationsSent(sentIds);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(cookieParser());

  // Bot prerendering for product detail pages
  app.get("/products/:id", async (req, res, next) => {
    const ua = req.headers["user-agent"] || "";
    if (!SOCIAL_BOTS.test(ua)) return next(); // regular browser → SPA

    const productId = parseInt(req.params.id, 10);
    if (isNaN(productId)) return next();

    try {
      const product = await storage.getProduct(productId);
      if (!product) return next();

      const siteUrl = (process.env.SITE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
      const imageUrl = product.imageUrl
        ? product.imageUrl.startsWith("http")
          ? product.imageUrl
          : `${siteUrl}${product.imageUrl}`
        : `${siteUrl}/pwa-icon.png`;
      const rawPrice = product.discountPrice ?? product.originalPrice;
      const price = `₾${Number(rawPrice).toFixed(2)}`;
      const title = escHtml(`${product.name} — ${price} | spiningebi.ge`);
      const desc = escHtml(`${(product.description ?? "").slice(0, 200)}. ფასი: ${price}`);
      const pageUrl = escHtml(`${siteUrl}/products/${productId}`);
      const safeImage = escHtml(imageUrl);

      console.log(`[og-bot] serving OG HTML for product ${productId} to: ${ua.slice(0, 60)}`);

      return res.status(200).set("Content-Type", "text/html; charset=utf-8").send(`<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <meta property="og:type" content="product"/>
  <meta property="og:site_name" content="spiningebi.ge"/>
  <meta property="og:title" content="${title}"/>
  <meta property="og:description" content="${desc}"/>
  <meta property="og:image" content="${safeImage}"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:url" content="${pageUrl}"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${title}"/>
  <meta name="twitter:description" content="${desc}"/>
  <meta name="twitter:image" content="${safeImage}"/>
  <meta http-equiv="refresh" content="0;url=${pageUrl}"/>
</head>
<body><a href="${pageUrl}">${title}</a></body>
</html>`);
    } catch (err) {
      next(err);
    }
  });

  app.get("/uploads/:filename", async (req, res) => {
    const filename = req.params.filename;

    // Path traversal protection: only allow safe filenames (no ../ or absolute paths)
    if (!filename || !/^[a-zA-Z0-9_\-\.]+$/.test(filename) || filename.includes("..")) {
      return res.status(400).end();
    }
    const filePath = path.join(uploadsDir, filename);
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadsDir = path.resolve(uploadsDir);
    if (!resolvedPath.startsWith(resolvedUploadsDir + path.sep)) {
      return res.status(403).end();
    }

    if (fs.existsSync(filePath)) {
      res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
      return res.sendFile(filePath);
    }

    try {
      const result = await pool.query(
        "SELECT data, mime_type FROM media WHERE filename = $1 AND data IS NOT NULL",
        [filename]
      );
      if (result.rows.length > 0 && result.rows[0].data) {
        const row = result.rows[0];
        let data: Buffer | string = row.data;
        if (typeof data === "string") {
          if (data.startsWith("\\x")) {
            data = Buffer.from(data.slice(2), "hex");
          } else {
            data = Buffer.from(data, "binary");
          }
        }
        res.setHeader("Content-Type", row.mime_type || "image/webp");
        res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
        return res.send(data);
      }
    } catch (err) {
      console.error("DB image fetch error:", err);
    }

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.status(404).json({ message: "ფაილი ვერ მოიძებნა" });
  });

  app.use(express.static(path.join(process.cwd(), "public")));

  app.use((req: any, res, next) => {
    const refCode = req.query.ref;
    if (refCode && typeof refCode === "string" && refCode.trim()) {
      res.cookie("ref", refCode.trim(), {
        maxAge: REFERRAL_COOKIE_DAYS * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "lax",
      });
    }
    next();
  });

  app.use((req, _res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api/") && !req.path.startsWith("/uploads/") && !req.path.includes(".")) {
      const referrer = req.headers.referer || req.headers.referrer || null;
      let referrerDomain: string | null = null;
      if (referrer) {
        try {
          const url = new URL(referrer as string);
          const ownHost = req.headers.host || "";
          if (url.hostname !== ownHost && url.hostname !== ownHost.split(":")[0]) {
            referrerDomain = url.hostname;
          }
        } catch {}
      }
      storage.recordPageVisit({
        referrerDomain,
        referrerUrl: referrerDomain ? (referrer as string) : null,
        pagePath: req.path,
        userAgent: req.headers["user-agent"] || null,
      }).catch(() => {});
    }
    next();
  });

  app.post("/api/admin/login", async (req: any, res) => {
    const { secretKey } = req.body;
    if (!ADMIN_SECRET || typeof secretKey !== "string") {
      return res.status(401).json({ message: "არასწორი გასაღები" });
    }
    // Timing-safe comparison to prevent brute-force timing attacks
    const a = Buffer.from(secretKey.padEnd(64).slice(0, 64));
    const b = Buffer.from(ADMIN_SECRET.padEnd(64).slice(0, 64));
    const match = timingSafeEqual(a, b) && secretKey === ADMIN_SECRET;
    if (match) {
      req.session.isAdmin = true;
      if (req.isAuthenticated && req.isAuthenticated()) {
        const userId = req.user?.claims?.sub;
        if (userId) {
          const dbUser = await storage.getUser(userId);
          if (dbUser && dbUser.role && ADMIN_ROLES.includes(dbUser.role)) {
            req.session.adminRole = dbUser.role;
            return res.json({ success: true, role: dbUser.role });
          }
        }
      }
      return res.json({ success: true, role: "admin" });
    }
    return res.status(401).json({ message: "არასწორი გასაღები" });
  });

  app.post("/api/admin/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "გასვლა ვერ მოხერხდა" });
      res.json({ success: true });
    });
  });

  app.get("/api/admin/status", async (req: any, res) => {
    const isPasswordAdmin = !!(req.session && req.session.isAdmin);
    let adminRole = req.session?.adminRole || null;

    if (!isPasswordAdmin && !adminRole && req.isAuthenticated && req.isAuthenticated()) {
      const userId = req.user?.claims?.sub;
      if (userId) {
        const dbUser = await storage.getUser(userId);
        if (dbUser && dbUser.role && ADMIN_ROLES.includes(dbUser.role)) {
          req.session.adminRole = dbUser.role;
          adminRole = dbUser.role;
        }
      }
    }

    res.json({
      isAdmin: isPasswordAdmin || (adminRole !== null && ADMIN_ROLES.includes(adminRole)),
      role: isPasswordAdmin ? "admin" : adminRole || null,
    });
  });

  app.post(api.products.create.path, requireAdmin, upload.none(), async (req, res) => {
    try {
      const input = api.products.create.input.parse(req.body);
      let albumImages: string[] = [];
      try { albumImages = JSON.parse(input.albumImages || "[]"); } catch {}

      albumImages = albumImages.filter(img => typeof img === "string" && img.startsWith("/uploads/"));

      const imageUrl = albumImages.length > 0 ? albumImages[0] : null;

      const product = await storage.createProduct({
        ...input,
        name: sanitizeString(input.name),
        description: sanitizeString(input.description),
        discountPrice: input.discountPrice || null,
        shippingPrice: input.shippingPrice || null,
        stock: input.stock ? parseInt(String(input.stock)) : 0,
        colorStock: input.colorStock || "{}",
        youtubeUrl: input.youtubeUrl ? sanitizeString(input.youtubeUrl) : null,
        imageUrl,
        albumImages: JSON.stringify(albumImages),
        categoryId: input.categoryId ? Number(input.categoryId) : null,
        weight: input.weight ? sanitizeString(input.weight) : null,
        length: input.length ? sanitizeString(input.length) : null,
        dimensions: input.dimensions ? sanitizeString(input.dimensions) : null,
        purchaseLimit: input.purchaseLimit ?? null,
      });
      res.status(201).json(product);

      // Auto-push to all subscribers when new product is added
      (async () => {
        try {
          const allSubs = await storage.getAllPushSubscriptions();
          if (allSubs.length === 0) return;
          const siteOrigin = process.env.SITE_URL || `${req.protocol}://${req.get("host")}`;
          const absoluteImage = imageUrl
            ? (imageUrl.startsWith("http") ? imageUrl : `${siteOrigin}${imageUrl}`)
            : undefined;
          const price = input.discountPrice || input.originalPrice;
          const payload = JSON.stringify({
            title: "🆕 ახალი პროდუქტი — spiningebi.ge",
            body: `${sanitizeString(input.name)} — ₾${price}`,
            url: `/product/${product.id}`,
            image: absoluteImage,
            icon: `${siteOrigin}/pwa-icon.png`,
            tag: `new-product-${product.id}`,
          });
          console.log(`[new-product] push to ${allSubs.length} subs for "${product.name}"`);
          for (const sub of allSubs) {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload,
              { urgency: "high", TTL: 60 }
            ).catch(async (err: any) => {
              if (err?.statusCode === 410 || err?.statusCode === 404) {
                await storage.removePushSubscription(sub.endpoint);
              }
            });
          }
        } catch (e) {
          console.warn("[new-product] push error:", e);
        }
      })();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      console.error("Product create error:", err);
      res.status(500).json({ message: "სერვერის შეცდომა" });
    }
  });

  app.get(api.products.list.path, async (_req, res) => {
    const productsList = await storage.getProducts();
    res.json(productsList);
  });

  app.get("/api/products/category/:categoryId", async (req, res) => {
    const categoryId = Number(req.params.categoryId);
    if (isNaN(categoryId) || categoryId <= 0) {
      return res.status(400).json({ message: "არასწორი კატეგორიის ID" });
    }
    const productsList = await storage.getProductsByCategory(categoryId);
    res.json(productsList);
  });

  app.get(api.products.get.path, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ message: "არასწორი ID" });
    }
    const product = await storage.getProduct(id);
    if (!product) {
      return res.status(404).json({ message: "პროდუქტი ვერ მოიძებნა" });
    }
    res.json(product);
  });

  app.post("/api/products/:id/view", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) return res.status(400).json({ message: "არასწორი ID" });
    try {
      await storage.incrementViewCount(id);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.post("/api/products/:id/share", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) return res.status(400).json({ message: "არასწორი ID" });
    try {
      await storage.incrementShareCount(id);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.post("/api/products/:id/interest", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) return res.status(400).json({ message: "არასწორი ID" });
    try {
      const product = await storage.getProduct(id);
      if (!product) return res.status(404).json({ message: "პროდუქტი ვერ მოიძებნა" });
      // Server-side verification: only record interest for out-of-stock products
      let total = product.stock ?? 0;
      try {
        const cs = JSON.parse(product.colorStock || "{}");
        const keys = Object.keys(cs);
        if (keys.length > 0) total = keys.reduce((a, k) => a + Number(cs[k] || 0), 0);
      } catch {}
      if (total > 0) return res.json({ ok: false, reason: "in_stock" });
      await storage.recordProductInterest(id, product.name);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.put(api.products.update.path, requireAdmin, upload.none(), async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "არასწორი ID" });
      }
      const product = await storage.getProduct(id);
      if (!product) {
        return res.status(404).json({ message: "პროდუქტი ვერ მოიძებნა" });
      }

      const updates: Record<string, unknown> = {};
      if (req.body.name !== undefined) updates.name = sanitizeString(String(req.body.name));
      if (req.body.description !== undefined) updates.description = sanitizeString(String(req.body.description));
      if (req.body.originalPrice !== undefined) updates.originalPrice = String(req.body.originalPrice);
      if (req.body.discountPrice !== undefined) updates.discountPrice = req.body.discountPrice ? String(req.body.discountPrice) : null;
      if (req.body.shippingPrice !== undefined) updates.shippingPrice = req.body.shippingPrice ? String(req.body.shippingPrice) : null;
      if (req.body.stock !== undefined) updates.stock = parseInt(req.body.stock) || 0;
      if (req.body.colorStock !== undefined) updates.colorStock = req.body.colorStock || "{}";
      if (req.body.youtubeUrl !== undefined) updates.youtubeUrl = req.body.youtubeUrl ? sanitizeString(String(req.body.youtubeUrl)) : null;
      if (req.body.categoryId !== undefined) updates.categoryId = req.body.categoryId ? Number(req.body.categoryId) : null;
      if (req.body.weight !== undefined) updates.weight = req.body.weight ? sanitizeString(String(req.body.weight)) : null;
      if (req.body.length !== undefined) updates.length = req.body.length ? sanitizeString(String(req.body.length)) : null;
      if (req.body.dimensions !== undefined) updates.dimensions = req.body.dimensions ? sanitizeString(String(req.body.dimensions)) : null;
      if (req.body.purchaseLimit !== undefined) {
        const lim = parseInt(String(req.body.purchaseLimit));
        updates.purchaseLimit = Number.isFinite(lim) && lim > 0 ? lim : null;
      }
      if (req.body.soldCount !== undefined) updates.soldCount = Number(req.body.soldCount) || 0;
      if (req.body.viewCount !== undefined) updates.viewCount = Number(req.body.viewCount) || 0;
      if (req.body.albumImages !== undefined) {
        let albumArr: string[] = [];
        try { albumArr = JSON.parse(req.body.albumImages); } catch {}
        albumArr = albumArr.filter(img => typeof img === "string" && img.startsWith("/uploads/"));
        updates.albumImages = JSON.stringify(albumArr);
        updates.imageUrl = albumArr.length > 0 ? albumArr[0] : product.imageUrl;
      }

      const prevTotalStock = (() => {
        try {
          const cs = JSON.parse(product.colorStock || "{}");
          const colorTotal = Object.values(cs).reduce((a: number, b: any) => a + Number(b || 0), 0);
          return colorTotal > 0 ? colorTotal : (product.stock || 0);
        } catch { return product.stock || 0; }
      })();

      const updated = await storage.updateProduct(id, updates);

      if (updated) {
        const newTotalStock = (() => {
          try {
            const cs = JSON.parse(updated.colorStock || "{}");
            const colorTotal = Object.values(cs).reduce((a: number, b: any) => a + Number(b || 0), 0);
            return colorTotal > 0 ? colorTotal : (updated.stock || 0);
          } catch { return updated.stock || 0; }
        })();

        if (prevTotalStock <= 0 && newTotalStock > 0) {
          notifyStockRestock(updated.id, updated.name, updated.imageUrl).catch(err => console.error("[stock-notify] failed:", err));
        }
      }

      res.json(updated);
    } catch (err) {
      console.error("Product update error:", err);
      res.status(500).json({ message: "სერვერის შეცდომა" });
    }
  });

  app.post("/api/stock-notifications", async (req: any, res) => {
    try {
      if (!req.isAuthenticated?.()) return res.status(401).json({ message: "გაიარეთ ავტორიზაცია" });
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "გაიარეთ ავტორიზაცია" });
      const productId = Number(req.body.productId);
      const selectedColor = req.body.selectedColor ? String(req.body.selectedColor) : null;
      if (!productId || isNaN(productId)) return res.status(400).json({ message: "არასწორი პროდუქტი" });
      const product = await storage.getProduct(productId);
      if (!product) return res.status(404).json({ message: "პროდუქტი ვერ მოიძებნა" });
      const user = await storage.getUser(userId);
      await storage.createStockNotification({ productId, email: user?.email || "", userId, selectedColor });
      res.json({ ok: true });
    } catch (err) {
      console.error("Stock notification subscribe error:", err);
      res.status(500).json({ message: "სერვერის შეცდომა" });
    }
  });

  app.delete("/api/products/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "არასწორი ID" });
      }
      const product = await storage.getProduct(id);
      if (!product) {
        return res.status(404).json({ message: "პროდუქტი ვერ მოიძებნა" });
      }
      await storage.deleteProduct(id);
      res.status(204).send();
    } catch (err) {
      console.error("Product delete error:", err);
      res.status(500).json({ message: "სერვერის შეცდომა" });
    }
  });

  app.get("/api/sync-check", requireAdmin, async (_req, res) => {
    try {
      const allMedia = await storage.getMedia();
      const results = allMedia.map((item) => {
        const filePath = path.join(uploadsDir, item.filename);
        const fileExists = fs.existsSync(filePath);
        return { id: item.id, filename: item.filename, path: item.path, fileExists };
      });
      const missing = results.filter((r) => !r.fileExists);
      res.json({ total: results.length, missing: missing.length, details: results });
    } catch (err) {
      res.status(500).json({ message: "სინქრონიზაციის შეცდომა" });
    }
  });

  app.post(api.media.cutout.path, requireAdmin, upload.single("file"), async (req, res) => {
    try {
      const file = req.file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ message: "ფაილი არ არის" });
      const blob = await removeBackground(file.buffer);
      const ab = await blob.arrayBuffer();
      const png = await sharp(Buffer.from(ab))
        .resize(1200, null, { withoutEnlargement: true })
        .png({ compressionLevel: 9 })
        .toBuffer();
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "no-store");
      return res.send(png);
    } catch (err) {
      console.error("Cutout error:", err);
      return res.status(500).json({ message: "ფონის მოცილება ვერ მოხერხდა" });
    }
  });

  app.post(api.media.upload.path, requireAdmin, upload.array("files", 20), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "ფაილები არ არის ატვირთული" });
      }

      const shouldRemoveBg = String(req.body?.removeBg || "").toLowerCase() === "true" || req.body?.removeBg === "1";
      const blurRadius = Math.max(0, Math.min(20, Number(req.body?.blur) || 0));
      const opacityPct = Math.max(20, Math.min(100, Number(req.body?.opacity) || 100));

      const results = [];
      for (const file of files) {
        let outBuffer: Buffer;
        let outExt: string;
        let outMime: string;

        const needsAlpha = shouldRemoveBg || opacityPct < 100;

        async function applyEffects(input: Buffer, hasAlpha: boolean): Promise<Buffer> {
          let pipe = sharp(input).resize(800, null, { withoutEnlargement: true });
          if (blurRadius > 0) pipe = pipe.blur(blurRadius);
          if (hasAlpha && opacityPct < 100) {
            const meta = await pipe.toBuffer({ resolveWithObject: true });
            const alphaMul = opacityPct / 100;
            pipe = sharp(meta.data).ensureAlpha().composite([{
              input: Buffer.from([255, 255, 255, Math.round(255 * alphaMul)]),
              raw: { width: 1, height: 1, channels: 4 },
              tile: true,
              blend: "dest-in",
            }]);
          }
          return hasAlpha
            ? pipe.png({ compressionLevel: 9 }).toBuffer()
            : pipe.webp({ quality: 82 }).toBuffer();
        }

        if (shouldRemoveBg) {
          try {
            const blob = await removeBackground(file.buffer);
            const ab = await blob.arrayBuffer();
            outBuffer = await applyEffects(Buffer.from(ab), true);
            outExt = "png";
            outMime = "image/png";
          } catch (bgErr) {
            console.error("Background removal failed, falling back:", bgErr);
            outBuffer = await applyEffects(file.buffer, needsAlpha);
            outExt = needsAlpha ? "png" : "webp";
            outMime = needsAlpha ? "image/png" : "image/webp";
          }
        } else {
          outBuffer = await applyEffects(file.buffer, needsAlpha);
          outExt = needsAlpha ? "png" : "webp";
          outMime = needsAlpha ? "image/png" : "image/webp";
        }

        const filename = `${randomUUID()}.${outExt}`;
        const outputPath = path.join(uploadsDir, filename);

        const mediaItem = await storage.createMedia({
          filename,
          originalName: sanitizeFilename(file.originalname),
          path: `/uploads/${filename}`,
          size: String(outBuffer.length),
        });

        try {
          await pool.query(
            "UPDATE media SET data = $1::bytea, mime_type = $2 WHERE id = $3",
            [outBuffer, outMime, mediaItem.id]
          );
        } catch (dbErr) {
          console.error("CRITICAL: Failed to store image in DB, rolling back:", dbErr);
          try { await storage.deleteMedia(mediaItem.id); } catch {}
          throw new Error("ბაზაში სურათის შენახვა ვერ მოხერხდა — სცადეთ თავიდან");
        }

        try { fs.writeFileSync(outputPath, outBuffer); } catch (diskErr) {
          console.warn("Disk cache write failed (image still saved in DB):", diskErr);
        }

        results.push(mediaItem);
      }

      res.status(201).json(results);
    } catch (err) {
      console.error("Upload error:", err);
      res.status(400).json({ message: "ატვირთვის შეცდომა" });
    }
  });

  app.get(api.media.list.path, async (_req, res) => {
    const mediaList = await storage.getMedia();
    res.json(mediaList);
  });

  app.delete(api.media.delete.path, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ message: "არასწორი ID" });
    }
    const item = await storage.getMediaItem(id);
    if (!item) {
      return res.status(404).json({ message: "მედია ვერ მოიძებნა" });
    }

    const allProducts = await storage.getProducts();
    const imageInUse = allProducts.some((p) => {
      if (p.imageUrl === item.path) return true;
      try {
        const album: string[] = JSON.parse(p.albumImages || "[]");
        return album.includes(item.path);
      } catch { return false; }
    });

    if (!imageInUse) {
      const filePath = path.join(uploadsDir, item.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await storage.deleteMedia(id);
    res.status(204).send();
  });

  app.get("/api/categories", async (_req, res) => {
    const cats = await storage.getCategories();
    res.json(cats);
  });

  app.post("/api/categories", requireAdmin, async (req, res) => {
    try {
      const name = req.body?.name?.trim();
      if (!name || typeof name !== "string" || name.length > 100) {
        return res.status(400).json({ message: "კატეგორიის სახელი აუცილებელია (მაქს 100 სიმბოლო)" });
      }
      const icon = req.body?.icon?.trim() || null;
      const cat = await storage.createCategory({ name: sanitizeString(name), icon });
      res.status(201).json(cat);
    } catch (err) {
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.patch("/api/categories/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "არასწორი ID" });
      }
      const updates: Record<string, any> = {};
      if (req.body?.name !== undefined) {
        const name = req.body.name.trim();
        if (!name || name.length > 100) return res.status(400).json({ message: "არასწორი სახელი" });
        updates.name = sanitizeString(name);
      }
      if (req.body?.icon !== undefined) {
        updates.icon = req.body.icon?.trim() || null;
      }
      const cat = await storage.updateCategory(id, updates);
      res.json(cat);
    } catch (err) {
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.delete("/api/categories/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "არასწორი ID" });
      }
      await storage.deleteCategory(id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.get("/api/profile", async (req: any, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const found = await storage.getUser(userId);
      if (found && !found.referralCode) {
        let code = generateReferralCode();
        for (let i = 0; i < 10; i++) {
          const existing = await storage.getUserByReferralCode(code);
          if (!existing) break;
          code = generateReferralCode();
        }
        await storage.setReferralCode(userId, code);
        found.referralCode = code;
      }
      if (found) {
        const { passwordHash, ...safeUser } = found as any;
        res.json(safeUser);
      } else {
        res.json(null);
      }
    } catch (err) {
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.put("/api/profile", async (req: any, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { firstName, lastName, address, city, phone } = req.body;
      const cleanFirst = firstName ? sanitizeString(String(firstName)).trim() : "";
      const cleanLast = lastName ? sanitizeString(String(lastName)).trim() : "";
      const cleanAddress = address ? sanitizeString(String(address)).trim() : "";
      const cleanCity = city ? sanitizeString(String(city)).trim() : "";
      const cleanPhone = phone ? sanitizeString(String(phone)).trim() : "";
      const updated = await storage.updateUserDetails(userId, {
        firstName: cleanFirst || undefined,
        lastName: cleanLast || undefined,
        address: cleanAddress || undefined,
        city: cleanCity || undefined,
        phone: cleanPhone || undefined,
      });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  // Per-user purchase allowance for limited products. Returns, for each
  // requested product that has a purchaseLimit, how much this user has already
  // bought (by account + phone, same logic the order endpoints enforce) and
  // how much they can still buy. Used by the frontend to cap the quantity
  // selector — the server-side check in /api/orders stays authoritative.
  app.get("/api/purchase-allowance", async (req: any, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const ids = String(req.query.ids || "")
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => Number.isInteger(n) && n > 0)
        .slice(0, 50);
      if (ids.length === 0) return res.json({});

      const user = await storage.getUser(userId);
      const phone = String(user?.phone || "");

      const result: Record<number, { limit: number; purchased: number; remaining: number }> = {};
      for (const id of Array.from(new Set(ids))) {
        const prod = await storage.getProduct(id);
        const limit = prod?.purchaseLimit ?? 0;
        if (!prod || !limit || limit <= 0) continue;
        const purchased = await storage.getPurchasedQtyForLimit(id, userId, phone);
        result[id] = { limit, purchased, remaining: Math.max(0, limit - purchased) };
      }
      res.json(result);
    } catch (err) {
      console.error("Purchase allowance error:", err);
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  // ===== Chest promo (ფასდაკლების სკივრი) =====
  // Config lives in site_settings under "chest_promo". The visitor's claim is a
  // signed cookie (HMAC over the expiry), so the browser can't forge or extend
  // the discount window. The discount itself is applied SERVER-SIDE at order
  // creation, never trusted from the client.
  const CHEST_COOKIE = "chest_claim";
  // Fail closed: without SESSION_SECRET no claim can be signed or verified,
  // so the promo simply stays unclaimable rather than using a guessable key.
  const chestSecret = () => process.env.SESSION_SECRET || null;
  const chestSign = (expiresAt: number): string | null => {
    const secret = chestSecret();
    if (!secret) return null;
    return createHmac("sha256", secret).update(String(expiresAt)).digest("hex");
  };

  async function getChestPromoConfig(): Promise<{ enabled: boolean; percent: number; timerMinutes: number; productIds: number[]; audience: "all" | "new"; productPercents: Record<number, number> }> {
    try {
      const raw = await storage.getSetting("chest_promo");
      if (!raw) return { enabled: false, percent: 0, timerMinutes: 0, productIds: [], audience: "new", productPercents: {} };
      const p = JSON.parse(raw);
      const productPercents: Record<number, number> = {};
      if (p.productPercents && typeof p.productPercents === "object") {
        for (const [k, v] of Object.entries(p.productPercents)) {
          const id = Number(k);
          const pct = Number(v);
          if (Number.isInteger(id) && id > 0 && Number.isFinite(pct) && pct > 0 && pct <= 90) {
            productPercents[id] = pct;
          }
        }
      }
      return {
        enabled: Boolean(p.enabled),
        percent: Math.min(90, Math.max(0, Number(p.percent) || 0)),
        timerMinutes: Math.min(1440, Math.max(1, Number(p.timerMinutes) || 0)),
        productIds: Array.isArray(p.productIds) ? p.productIds.map(Number).filter((n: number) => Number.isInteger(n) && n > 0) : [],
        audience: p.audience === "all" ? "all" : "new",
        productPercents,
      };
    } catch {
      return { enabled: false, percent: 0, timerMinutes: 0, productIds: [], audience: "new", productPercents: {} };
    }
  }

  // Per-product percent wins; falls back to the global percent.
  function chestPercentFor(promo: Awaited<ReturnType<typeof getChestPromoConfig>>, productId: number): number {
    return promo.productPercents[productId] || promo.percent;
  }

  // Returns the visitor's active chest claim expiry (ms) or null.
  function getActiveChestClaim(req: any): number | null {
    const raw = req.cookies?.[CHEST_COOKIE];
    if (!raw || typeof raw !== "string") return null;
    const [expStr, sig] = raw.split(".");
    const expiresAt = Number(expStr);
    if (!Number.isFinite(expiresAt) || !sig) return null;
    const expected = chestSign(expiresAt);
    if (!expected || sig.length !== expected.length) return null;
    try {
      if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    } catch { return null; }
    if (Date.now() > expiresAt) return null;
    return expiresAt;
  }

  // Applies the chest discount to a unit price if the visitor has a valid,
  // unexpired claim and the product is part of the promo. Returns the (possibly
  // reduced) price and whether the discount was actually applied — chest
  // purchases don't earn the buyer purchase-bonus credit.
  async function applyChestDiscount(req: any, productId: number, unitPrice: number): Promise<{ price: number; applied: boolean }> {
    const claim = getActiveChestClaim(req);
    if (!claim) return { price: unitPrice, applied: false };
    const promo = await getChestPromoConfig();
    if (!promo.enabled) return { price: unitPrice, applied: false };
    if (!promo.productIds.includes(productId)) return { price: unitPrice, applied: false };
    const pct = chestPercentFor(promo, productId);
    if (pct <= 0) return { price: unitPrice, applied: false };
    return { price: Math.round(unitPrice * (1 - pct / 100) * 100) / 100, applied: true };
  }

  app.get("/api/chest-promo", async (req: any, res) => {
    try {
      const promo = await getChestPromoConfig();
      const hasAnyPercent = promo.percent > 0 || Object.keys(promo.productPercents).length > 0;
      if (!promo.enabled || !hasAnyPercent || promo.productIds.length === 0) {
        return res.json({ enabled: false });
      }
      const claimExpiresAt = getActiveChestClaim(req);
      res.json({ ...promo, claimExpiresAt });
    } catch (err) {
      console.error("Chest promo error:", err);
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.post("/api/chest-promo/claim", async (req: any, res) => {
    try {
      const promo = await getChestPromoConfig();
      const hasAnyPercent = promo.percent > 0 || Object.keys(promo.productPercents).length > 0;
      if (!promo.enabled || !hasAnyPercent || promo.productIds.length === 0) {
        return res.status(400).json({ message: "აქცია აქტიური არ არის" });
      }
      // If the visitor already has an active claim, keep the original expiry —
      // re-claiming must not restart the countdown.
      const existing = getActiveChestClaim(req);
      if (existing) return res.json({ expiresAt: existing });

      const expiresAt = Date.now() + promo.timerMinutes * 60 * 1000;
      const sig = chestSign(expiresAt);
      if (!sig) {
        return res.status(503).json({ message: "აქცია დროებით მიუწვდომელია" });
      }
      res.cookie(CHEST_COOKIE, `${expiresAt}.${sig}`, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: promo.timerMinutes * 60 * 1000,
      });
      res.json({ expiresAt });
    } catch (err) {
      console.error("Chest claim error:", err);
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.get("/api/admin/chest-promo", requireAdmin, async (_req, res) => {
    try {
      res.json(await getChestPromoConfig());
    } catch (err) {
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.post("/api/admin/chest-promo", requireAdmin, async (req, res) => {
    try {
      const { enabled, percent, timerMinutes, productIds, audience, productPercents } = req.body || {};
      const pct = Number(percent) || 0;
      const mins = Number(timerMinutes);
      const ids = Array.isArray(productIds) ? productIds.map(Number).filter((n: number) => Number.isInteger(n) && n > 0) : [];
      const perProduct: Record<number, number> = {};
      if (productPercents && typeof productPercents === "object") {
        for (const [k, v] of Object.entries(productPercents)) {
          const id = Number(k);
          const p = Number(v);
          if (!Number.isInteger(id) || id <= 0 || !ids.includes(id)) continue;
          if (!Number.isFinite(p) || p <= 0 || p > 90) {
            return res.status(400).json({ message: "ინდივიდუალური პროცენტი უნდა იყოს 1-90" });
          }
          perProduct[id] = p;
        }
      }
      if (enabled && pct > 0 && pct > 90) {
        return res.status(400).json({ message: "პროცენტი უნდა იყოს 1-90" });
      }
      // Every selected product must end up with a usable percent — either its
      // own value or the global fallback.
      if (enabled && ids.some((id: number) => !perProduct[id] && pct <= 0)) {
        return res.status(400).json({ message: "მიუთითეთ ფასდაკლების % ყველა არჩეულ პროდუქტს (ან საერთო %)" });
      }
      if (enabled && (!Number.isFinite(mins) || mins < 1 || mins > 1440)) {
        return res.status(400).json({ message: "წამზომი უნდა იყოს 1-1440 წუთი" });
      }
      if (enabled && ids.length === 0) {
        return res.status(400).json({ message: "აირჩიეთ მინიმუმ ერთი პროდუქტი" });
      }
      await storage.setSetting("chest_promo", JSON.stringify({
        enabled: Boolean(enabled),
        percent: pct || 0,
        timerMinutes: mins || 0,
        productIds: ids,
        audience: audience === "all" ? "all" : "new",
        productPercents: perProduct,
      }));
      res.json({ success: true });
    } catch (err) {
      console.error("Chest promo save error:", err);
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.post("/api/orders", async (req: any, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { productId, fullName, city, address, phone, quantity, selectedColor } = req.body;
      if (!productId || !fullName || !city || !address || !phone) {
        return res.status(400).json({ message: "ყველა ველი აუცილებელია" });
      }

      const orderQty = Math.max(1, Number(quantity) || 1);

      // Price and name come from the DB product, never from the client, so the
      // amount charged can't be tampered with by the browser.
      const prod = await storage.getProduct(Number(productId));
      if (!prod) {
        return res.status(404).json({ message: "პროდუქტი ვერ მოიძებნა" });
      }
      const baseUnitPrice = (prod.discountPrice && Number(prod.discountPrice) < Number(prod.originalPrice))
        ? Number(prod.discountPrice)
        : Number(prod.originalPrice);
      const chest = await applyChestDiscount(req, Number(productId), baseUnitPrice);
      const unitPrice = chest.price;
      const lineTotal = unitPrice * orderQty;
      const serverProductName = prod.name;

      // Only CHECK color availability here — do NOT decrement yet. Card orders
      // start unpaid; the stock is reduced only once Flitt confirms the payment
      // (in settlePaidOrder), so an abandoned checkout never eats inventory.
      if (selectedColor) {
        let colorStock: Record<string, number> = {};
        try { colorStock = JSON.parse(prod.colorStock || "{}"); } catch {}
        const available = colorStock[selectedColor] ?? 0;
        if (available < orderQty) {
          return res.status(400).json({ message: `"${selectedColor}" ამოწურულია ან არასაკმარისია (მარაგში: ${available})` });
        }
      } else {
        const available = prod.stock ?? 0;
        if (available < orderQty) {
          return res.status(400).json({ message: `პროდუქტი ამოწურულია ან არასაკმარისია (მარაგში: ${available})` });
        }
      }

      // Per-customer purchase limit (set by admin on the product). Matched by
      // account AND by phone number, so re-registering with the same phone
      // doesn't bypass it. Enforcement happens atomically inside
      // createOrderWithLimit (advisory locks), so parallel checkouts can't
      // overshoot the cap.
      const limit = prod.purchaseLimit ?? 0;

      await storage.updateUserDetails(userId, {
        address: sanitizeString(String(address)),
        city: sanitizeString(String(city)),
        phone: sanitizeString(String(phone)),
      });

      // Card orders start unpaid. The order only becomes a real sale — and any
      // referral credit is awarded — after Flitt confirms payment in the
      // /api/flitt/callback handler. We persist the referral code captured from
      // the cookie onto the order so the (cookie-less) server callback can use it.
      const refCookie = req.cookies?.ref;
      const refCode = refCookie && typeof refCookie === "string" ? refCookie : null;

      const orderPayload = {
        userId,
        productId: Number(productId),
        productName: sanitizeString(serverProductName),
        productPrice: String(lineTotal),
        quantity: orderQty,
        selectedColor: selectedColor ? sanitizeString(String(selectedColor)) : null,
        fullName: sanitizeString(String(fullName)),
        country: "საქართველო",
        city: sanitizeString(String(city)),
        address: sanitizeString(String(address)),
        phone: sanitizeString(String(phone)),
        status: "awaiting_payment",
        paymentMethod: "card",
        refCode,
        chestApplied: chest.applied,
      };

      let order;
      if (limit > 0) {
        const limited = await storage.createOrderWithLimit(orderPayload, limit);
        if (!limited.order) {
          const left = Math.max(0, limit - limited.already);
          return res.status(400).json({
            message: left > 0
              ? `ამ პროდუქტზე მოქმედებს შეზღუდვა: მაქსიმუმ ${limit} ც. ერთ მომხმარებელზე. თქვენ შეგიძლიათ შეიძინოთ კიდევ ${left} ც.`
              : `ამ პროდუქტზე მოქმედებს შეზღუდვა: მაქსიმუმ ${limit} ც. ერთ მომხმარებელზე. თქვენ ლიმიტი უკვე ამოწურეთ.`,
          });
        }
        order = limited.order;
      } else {
        order = await storage.createOrder(orderPayload);
      }

      // Single-use: consume the referral cookie now that it's stored on the order.
      if (refCode) res.clearCookie("ref");

      res.status(201).json(order);
    } catch (err) {
      console.error("Order create error:", err);
      res.status(500).json({ message: "შეკვეთის შეცდომა" });
    }
  });

  app.post("/api/orders/credit", async (req: any, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { productId, quantity, selectedColor, fullName, city, address, phone } = req.body;
      if (!productId || !quantity || !fullName || !city || !address || !phone) {
        return res.status(400).json({ message: "ყველა ველი აუცილებელია" });
      }

      const orderQty = Math.max(1, Number(quantity));

      // Price and name come from the DB product, never from the client.
      const prod = await storage.getProduct(Number(productId));
      if (!prod) {
        return res.status(404).json({ message: "პროდუქტი ვერ მოიძებნა" });
      }
      const baseUnitPrice = (prod.discountPrice && Number(prod.discountPrice) < Number(prod.originalPrice))
        ? Number(prod.discountPrice)
        : Number(prod.originalPrice);
      const chestCredit = await applyChestDiscount(req, Number(productId), baseUnitPrice);
      const unitPrice = chestCredit.price;
      const totalPrice = unitPrice * orderQty;
      const serverProductName = prod.name;

      // Credit purchases are paid instantly, so check color availability up front
      // and reject if there isn't enough before touching the user's credit.
      if (selectedColor) {
        let colorStock: Record<string, number> = {};
        try { colorStock = JSON.parse(prod.colorStock || "{}"); } catch {}
        const available = colorStock[selectedColor] ?? 0;
        if (available < orderQty) {
          return res.status(400).json({ message: `"${selectedColor}" ამოწურულია ან არასაკმარისია (მარაგში: ${available})` });
        }
      } else {
        const available = prod.stock ?? 0;
        if (available < orderQty) {
          return res.status(400).json({ message: `პროდუქტი ამოწურულია ან არასაკმარისია (მარაგში: ${available})` });
        }
      }

      // Per-customer purchase limit — fast pre-check before touching the
      // user's credit; the authoritative, race-safe check happens atomically
      // in createOrderWithLimit below.
      const limit = prod.purchaseLimit ?? 0;
      if (limit > 0) {
        const already = await storage.getPurchasedQtyForLimit(Number(productId), userId, String(phone));
        if (already + orderQty > limit) {
          const left = Math.max(0, limit - already);
          return res.status(400).json({
            message: left > 0
              ? `ამ პროდუქტზე მოქმედებს შეზღუდვა: მაქსიმუმ ${limit} ც. ერთ მომხმარებელზე. თქვენ შეგიძლიათ შეიძინოთ კიდევ ${left} ც.`
              : `ამ პროდუქტზე მოქმედებს შეზღუდვა: მაქსიმუმ ${limit} ც. ერთ მომხმარებელზე. თქვენ ლიმიტი უკვე ამოწურეთ.`,
          });
        }
      }

      const creditToGelSetting = await storage.getSetting("credit_to_gel") || "1";
      const creditToGel = Number(creditToGelSetting);
      const creditNeeded = totalPrice / creditToGel;

      const user = await storage.getUser(userId);
      const userCredit = Number(user?.myCredit || 0);
      if (userCredit < creditNeeded) {
        return res.status(400).json({ message: "არასაკმარისი კრედიტი", creditNeeded, userCredit });
      }

      const deducted = await storage.deductCredit(userId, creditNeeded);
      if (!deducted) {
        return res.status(400).json({ message: "არასაკმარისი კრედიტი" });
      }

      await storage.updateUserDetails(userId, {
        address: sanitizeString(String(address)),
        city: sanitizeString(String(city)),
        phone: sanitizeString(String(phone)),
      });

      const creditOrderPayload = {
        userId,
        productId: Number(productId),
        productName: sanitizeString(serverProductName),
        productPrice: String(totalPrice),
        quantity: orderQty,
        selectedColor: selectedColor ? sanitizeString(String(selectedColor)) : null,
        fullName: sanitizeString(String(fullName)),
        country: "საქართველო",
        city: sanitizeString(String(city)),
        address: sanitizeString(String(address)),
        phone: sanitizeString(String(phone)),
        status: "pending",
        paymentMethod: "credit",
        chestApplied: chestCredit.applied,
      };

      let order;
      if (limit > 0) {
        const limited = await storage.createOrderWithLimit(creditOrderPayload, limit);
        if (!limited.order) {
          // Lost the race against a parallel order — give the credit back.
          await storage.addCredit(userId, creditNeeded);
          const left = Math.max(0, limit - limited.already);
          return res.status(400).json({
            message: left > 0
              ? `ამ პროდუქტზე მოქმედებს შეზღუდვა: მაქსიმუმ ${limit} ც. ერთ მომხმარებელზე. თქვენ შეგიძლიათ შეიძინოთ კიდევ ${left} ც.`
              : `ამ პროდუქტზე მოქმედებს შეზღუდვა: მაქსიმუმ ${limit} ც. ერთ მომხმარებელზე. თქვენ ლიმიტი უკვე ამოწურეთ.`,
          });
        }
        order = limited.order;
      } else {
        order = await storage.createOrder(creditOrderPayload);
      }

      await applyStockDeduction(order, "credit");

      console.log(`Credit order: user ${userId} spent ${creditNeeded} credits for order ${order.id}`);
      res.status(201).json(order);
    } catch (err) {
      console.error("Credit order error:", err);
      res.status(500).json({ message: "შეკვეთის შეცდომა" });
    }
  });

  app.get("/api/orders/my", async (req: any, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const userOrders = await storage.getOrdersByUser(userId);
      res.json(userOrders);
    } catch (err) {
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.get("/api/admin/orders", requireAdmin, async (_req, res) => {
    try {
      const fiveMonthsAgo = new Date();
      fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);
      fiveMonthsAgo.setDate(1);
      fiveMonthsAgo.setHours(0, 0, 0, 0);
      await storage.deleteOrdersOlderThan(fiveMonthsAgo);

      const allOrders = await storage.getOrders();
      res.json(allOrders);
    } catch (err) {
      res.status(500).json({ message: "შეკვეთების ჩატვირთვის შეცდომა" });
    }
  });

  app.get("/api/admin/orders/new-count", requireAdmin, async (_req, res) => {
    try {
      const lastSeen = Number((await storage.getSetting("orders_last_seen_id")) || "0");
      const allOrders = await storage.getOrders();
      const count = allOrders.filter((o) => o.id > lastSeen).length;
      res.json({ count });
    } catch (err) {
      console.error("New orders count error:", err);
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.post("/api/admin/orders/mark-seen", requireAdmin, async (_req, res) => {
    try {
      const allOrders = await storage.getOrders();
      const maxId = allOrders.reduce((m, o) => Math.max(m, o.id), 0);
      await storage.setSetting("orders_last_seen_id", String(maxId));
      res.json({ success: true, lastSeenId: maxId });
    } catch (err) {
      console.error("Mark orders seen error:", err);
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.delete("/api/admin/orders/all", requireAdmin, async (_req, res) => {
    try {
      const count = await storage.deleteAllOrders();
      res.json({ deleted: count });
    } catch (err) {
      console.error("Delete all orders error:", err);
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.delete("/api/admin/orders/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id) || id <= 0) return res.status(400).json({ message: "არასწორი ID" });
      const ok = await storage.deleteOrder(id);
      if (!ok) return res.status(404).json({ message: "შეკვეთა ვერ მოიძებნა" });
      res.json({ success: true });
    } catch (err) {
      console.error("Delete order error:", err);
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.patch("/api/admin/orders/:id/status", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id) || id <= 0) return res.status(400).json({ message: "არასწორი ID" });
      const { status } = req.body;
      if (!status || !["pending", "shipped", "completed", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "არასწორი სტატუსი" });
      }
      const existing = await storage.getOrder(id);
      const updated = await storage.updateOrderStatus(id, status);
      if (!updated) return res.status(404).json({ message: "შეკვეთა ვერ მოიძებნა" });
      // Realize the sale when the admin marks it shipped/completed. Many card
      // orders never get a confirmed Flitt callback (they sit in
      // awaiting_payment and the admin fulfils them manually), so stock would
      // otherwise never be reduced. applyStockDeduction is idempotent via the
      // stock_deducted flag, so orders already deducted (Flitt/credit) are safe.
      if (existing && (status === "shipped" || status === "completed")) {
        await applyStockDeduction(existing, `admin-${status}`);
      }
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    try {
      const usersList = await storage.getUsers();
      const safeUsers = usersList.map(({ passwordHash, ...rest }) => rest);
      res.json(safeUsers);
    } catch (err) {
      console.error("Users fetch error:", err);
      res.status(500).json({ message: "მომხმარებლების ჩატვირთვის შეცდომა" });
    }
  });

  app.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const { firstName, lastName, email, address, city, phone } = req.body;
      const updated = await storage.updateUserDetails(req.params.id, {
        firstName: firstName != null ? sanitizeString(String(firstName)) : undefined,
        lastName: lastName != null ? sanitizeString(String(lastName)) : undefined,
        email: email != null ? sanitizeString(String(email)) : undefined,
        address: address != null ? sanitizeString(String(address)) : undefined,
        city: city != null ? sanitizeString(String(city)) : undefined,
        phone: phone != null ? sanitizeString(String(phone)) : undefined,
      });
      if (!updated) return res.status(404).json({ message: "მომხმარებელი ვერ მოიძებნა" });
      const { passwordHash: _ph, ...safeUpdated } = updated as any;
      res.json(safeUpdated);
    } catch (err) {
      console.error("User update error:", err);
      res.status(500).json({ message: "მომხმარებლის განახლების შეცდომა" });
    }
  });

  app.put("/api/admin/users/:id/role", requireAdminOnly, async (req, res) => {
    try {
      const { role } = req.body;
      if (!role || !["user", "moderator", "admin", "sales_admin"].includes(role)) {
        return res.status(400).json({ message: "არასწორი როლი" });
      }
      const updated = await storage.setUserRole(req.params.id, role);
      if (!updated) return res.status(404).json({ message: "მომხმარებელი ვერ მოიძებნა" });
      const { passwordHash: _ph, ...safeUpdated } = updated as any;
      res.json(safeUpdated);
    } catch (err) {
      console.error("Role update error:", err);
      res.status(500).json({ message: "როლის განახლების შეცდომა" });
    }
  });

  app.delete("/api/admin/users/:id", requireAdminOnly, async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (err) {
      console.error("User delete error:", err);
      res.status(500).json({ message: "მომხმარებლის წაშლის შეცდომა" });
    }
  });

  app.get("/api/admin/referral-logs", requireAdmin, async (_req, res) => {
    try {
      const logs = await storage.getReferralLogs();
      const enriched = await Promise.all(logs.map(async (log) => {
        const referrer = await storage.getUser(log.referrerUserId);
        const buyer = await storage.getUser(log.buyerUserId);
        return {
          ...log,
          referrerName: referrer ? `${referrer.firstName || ""} ${referrer.lastName || ""}`.trim() || referrer.email : "—",
          referrerEmail: referrer?.email || "—",
          buyerName: buyer ? `${buyer.firstName || ""} ${buyer.lastName || ""}`.trim() || buyer.email : "—",
          buyerEmail: buyer?.email || "—",
        };
      }));
      res.json(enriched);
    } catch (err) {
      console.error("Referral logs error:", err);
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.get("/api/admin/purchase-credit-logs", requireAdmin, async (_req, res) => {
    try {
      const logs = await storage.getPurchaseCreditLogs();
      const enriched = await Promise.all(logs.map(async (log) => {
        const buyer = await storage.getUser(log.buyerUserId);
        return {
          ...log,
          buyerName: buyer ? `${buyer.firstName || ""} ${buyer.lastName || ""}`.trim() || buyer.email : "—",
          buyerEmail: buyer?.email || "—",
        };
      }));
      res.json(enriched);
    } catch (err) {
      console.error("Purchase credit logs error:", err);
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.get("/api/credit-info", async (_req, res) => {
    try {
      const creditToGel = await storage.getSetting("credit_to_gel") || "1";
      const creditVideoUrl = await storage.getSetting("credit_video_url") || "";
      res.json({ credit_to_gel: creditToGel, credit_video_url: creditVideoUrl });
    } catch (err) {
      console.error("Credit info error:", err);
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  // Public: current online count (visible to all visitors)
  app.get("/api/online-count", (_req, res) => {
    pruneOldSessions();
    res.json({ count: activeSessions.size });
  });

  // Public: total registered users count
  app.get("/api/users/count", async (_req, res) => {
    try {
      const all = await storage.getUsers();
      res.json({ count: all.length });
    } catch {
      res.json({ count: 0 });
    }
  });

  // Public ping — client calls every 30s to register as "online"
  app.post("/api/ping", (req, res) => {
    const sid = (req.query.sid as string) || "";
    if (sid && sid.length < 64) {
      activeSessions.set(sid, Date.now());
      pruneOldSessions();
    }
    res.json({ ok: true });
  });

  // Admin: current online count
  app.get("/api/admin/online-count", requireAdmin, (_req, res) => {
    pruneOldSessions();
    res.json({ count: activeSessions.size });
  });

  app.get("/api/admin/analytics", requireAdmin, async (req, res) => {
    try {
      const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 365);
      const [sources, total] = await Promise.all([
        storage.getAnalytics(days),
        storage.getAnalyticsTotal(days),
      ]);
      res.json({ sources, total, days });
    } catch (err) {
      console.error("Analytics error:", err);
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.get("/api/admin/product-interests", requireAdmin, async (_req, res) => {
    try {
      const interests = await storage.getProductInterests();
      res.json(interests);
    } catch (err) {
      console.error("Product interests error:", err);
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.delete("/api/admin/product-interests", requireAdmin, async (_req, res) => {
    try {
      await storage.clearProductInterests();
      res.json({ ok: true });
    } catch (err) {
      console.error("Clear product interests error:", err);
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.get("/api/admin/settings", requireAdmin, async (_req, res) => {
    try {
      const creditAmount = await storage.getSetting("referral_credit_amount") || "5";
      const creditToGel = await storage.getSetting("credit_to_gel") || "1";
      const creditVideoUrl = await storage.getSetting("credit_video_url") || "";
      const purchaseCreditAmount = await storage.getSetting("purchase_credit_amount") || "0";
      res.json({ referral_credit_amount: creditAmount, credit_to_gel: creditToGel, credit_video_url: creditVideoUrl, purchase_credit_amount: purchaseCreditAmount });
    } catch (err) {
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.put("/api/admin/settings", requireAdminOnly, async (req, res) => {
    try {
      const { referral_credit_amount, credit_to_gel, credit_video_url, purchase_credit_amount } = req.body;
      if (referral_credit_amount !== undefined) {
        const val = Number(referral_credit_amount);
        if (isNaN(val) || val < 0) {
          return res.status(400).json({ message: "არასწორი კრედიტის რაოდენობა" });
        }
        await storage.setSetting("referral_credit_amount", String(val));
      }
      if (purchase_credit_amount !== undefined) {
        const val = Number(purchase_credit_amount);
        if (isNaN(val) || val < 0) {
          return res.status(400).json({ message: "არასწორი ბონუს კრედიტის რაოდენობა" });
        }
        await storage.setSetting("purchase_credit_amount", String(val));
      }
      if (credit_to_gel !== undefined) {
        const val = Number(credit_to_gel);
        if (isNaN(val) || val < 0) {
          return res.status(400).json({ message: "არასწორი კრედიტის კურსი" });
        }
        await storage.setSetting("credit_to_gel", String(val));
      }
      if (credit_video_url !== undefined) {
        const v = String(credit_video_url || "").trim();
        if (v && !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(v)) {
          return res.status(400).json({ message: "მხოლოდ YouTube ბმული დაშვებულია" });
        }
        await storage.setSetting("credit_video_url", v);
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Settings update error:", err);
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.get("/api/admin/visual-settings", requireAdmin, async (_req, res) => {
    try {
      const data = await storage.getSetting("visual_settings");
      if (!data) return res.json(null);
      try {
        res.json(JSON.parse(data));
      } catch {
        res.json(null);
      }
    } catch (err) {
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.put("/api/admin/visual-settings", requireAdmin, async (req, res) => {
    try {
      await storage.setSetting("visual_settings", JSON.stringify(req.body));
      res.json({ success: true });
    } catch (err) {
      console.error("Visual settings save error:", err);
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.get("/api/visual-settings/public", async (_req, res) => {
    try {
      const data = await storage.getSetting("visual_settings");
      if (!data) return res.json(null);
      try {
        const parsed = JSON.parse(data);
        res.json({
          selectedLogo: parsed.selectedLogo ?? null,
          uploadedLogos: parsed.uploadedLogos || [],
          text: parsed.text || "spiningebi.ge",
          customText: parsed.customText || "",
          font: parsed.font || "FiraGO",
          fontSize: parsed.fontSize || "48",
          textColor: parsed.textColor || "#FFD700",
          isBold: parsed.isBold ?? true,
          isItalic: parsed.isItalic ?? false,
          customTextColor: parsed.customTextColor || "",
          customTextItalic: parsed.customTextItalic ?? false,
        });
      } catch {
        res.json(null);
      }
    } catch {
      res.json(null);
    }
  });

  // ─── Site announcement bar (განცხადება) ───
  app.get("/api/announcement", async (_req, res) => {
    try {
      const enabled = (await storage.getSetting("announcement_enabled")) === "1";
      const text = (await storage.getSetting("announcement_text")) || "";
      res.json({ enabled, text });
    } catch {
      res.json({ enabled: false, text: "" });
    }
  });

  app.put("/api/admin/announcement", requireAdmin, async (req, res) => {
    try {
      const text = typeof req.body?.text === "string" ? req.body.text.slice(0, 300) : "";
      const enabled = req.body?.enabled ? "1" : "0";
      await storage.setSetting("announcement_text", text);
      await storage.setSetting("announcement_enabled", enabled);
      res.json({ enabled: enabled === "1", text });
    } catch (err) {
      console.error("Announcement save error:", err);
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  // ─── Ad banners (სარეკლამო სახლი) ───
  app.get("/api/ads", async (_req, res) => {
    try {
      const raw = await storage.getSetting("ad_banners");
      let banners: Array<{ imageUrl: string; linkUrl?: string }> = [];
      try {
        const parsed = JSON.parse(raw || "[]");
        if (Array.isArray(parsed)) {
          banners = parsed
            .filter((b: any) => b && typeof b.imageUrl === "string" && b.imageUrl.trim().length > 0)
            .slice(0, 3)
            .map((b: any) => ({
              imageUrl: String(b.imageUrl),
              linkUrl: typeof b.linkUrl === "string" && b.linkUrl.trim().length > 0 ? String(b.linkUrl) : undefined,
            }));
        }
      } catch {}
      res.json(banners);
    } catch {
      res.json([]);
    }
  });

  app.put("/api/admin/ads", requireAdmin, async (req, res) => {
    try {
      const incoming = Array.isArray(req.body?.banners) ? req.body.banners : [];
      const isSafeImg = (s: string) => /^\/uploads\//.test(s) || /^https?:\/\//i.test(s);
      const isSafeLink = (s: string) => /^https?:\/\//i.test(s);
      const cleaned = incoming
        .filter((b: any) => b && typeof b.imageUrl === "string" && isSafeImg(b.imageUrl.trim()))
        .slice(0, 9)
        .map((b: any) => {
          const img = sanitizeString(String(b.imageUrl).trim());
          const rawLink = typeof b.linkUrl === "string" ? b.linkUrl.trim() : "";
          const link = rawLink && isSafeLink(rawLink) ? sanitizeString(rawLink) : undefined;
          return { imageUrl: img, linkUrl: link };
        });
      await storage.setSetting("ad_banners", JSON.stringify(cleaned));
      res.json({ ok: true, banners: cleaned });
    } catch (err) {
      console.error("Ads update error:", err);
      res.status(500).json({ message: "სერვერის შეცდომა" });
    }
  });

  app.get("/api/contact-info", async (_req, res) => {
    try {
      const phone = await storage.getSetting("contact_phone") || "+995 599 52 33 51";
      const email = await storage.getSetting("contact_email") || "spiningebi@gmail.com";
      const whatsapp = await storage.getSetting("contact_whatsapp") || "+995 599 52 33 51";
      const address = await storage.getSetting("contact_address") || "საქართველო, ქუთაისი, მელიქიშვილის 2";
      const workHours = await storage.getSetting("contact_work_hours") || "ორშაბათი - შაბათი: 10:00 - 19:00";
      const dayOff = await storage.getSetting("contact_day_off") || "კვირა: დასვენება";
      res.json({ phone, email, whatsapp, address, workHours, dayOff });
    } catch (err) {
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.put("/api/admin/contact-info", requireAdminOnly, async (req, res) => {
    try {
      const fields: Array<[string, string]> = [
        ["phone", "contact_phone"],
        ["email", "contact_email"],
        ["whatsapp", "contact_whatsapp"],
        ["address", "contact_address"],
        ["workHours", "contact_work_hours"],
        ["dayOff", "contact_day_off"],
      ];
      for (const [body, settingKey] of fields) {
        const value = req.body?.[body];
        if (value === undefined) continue;
        if (typeof value !== "string") {
          return res.status(400).json({ message: `${body} უნდა იყოს ტექსტი` });
        }
        await storage.setSetting(settingKey, value);
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Contact info update error:", err);
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  const SITE_NAME = "თევზაობის მაღაზია";

  app.get("/api/og-image/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(Number(req.params.id));
      if (!product) {
        return res.status(404).end();
      }

      const candidates: string[] = [];
      if (product.imageUrl) candidates.push(product.imageUrl);
      try {
        const album = JSON.parse((product as any).albumImages || "[]");
        if (Array.isArray(album)) {
          for (const url of album) {
            if (typeof url === "string" && url && !candidates.includes(url)) {
              candidates.push(url);
            }
          }
        }
      } catch {}

      let sourceBuffer: Buffer | null = null;

      for (const candidate of candidates) {
        const imgPath = candidate.startsWith("/")
          ? path.join(process.cwd(), "public", candidate)
          : candidate;

        if (fs.existsSync(imgPath)) {
          sourceBuffer = fs.readFileSync(imgPath);
          break;
        }
        if (candidate.startsWith("/uploads/")) {
          const filename = candidate.replace("/uploads/", "");
          if (/^[a-zA-Z0-9_\-\.]+$/.test(filename)) {
            try {
              const dbResult = await pool.query(
                "SELECT data FROM media WHERE filename = $1 AND data IS NOT NULL",
                [filename]
              );
              if (dbResult.rows.length > 0 && dbResult.rows[0].data) {
                let data: any = dbResult.rows[0].data;
                if (typeof data === "string") {
                  data = data.startsWith("\\x")
                    ? Buffer.from(data.slice(2), "hex")
                    : Buffer.from(data, "binary");
                }
                sourceBuffer = data;
                break;
              }
            } catch (err) {
              console.error("OG image DB fetch error:", err);
            }
          }
        }
      }

      if (!sourceBuffer) {
        const fallbackCandidates = [
          path.join(process.cwd(), "client", "public", "images", "spiningebi-cover.png"),
          path.join(process.cwd(), "dist", "public", "images", "spiningebi-cover.png"),
          path.join(process.cwd(), "public", "images", "spiningebi-cover.png"),
          path.join(process.cwd(), "client", "public", "images", "hero-fishing.png"),
          path.join(process.cwd(), "dist", "public", "images", "hero-fishing.png"),
          path.join(process.cwd(), "public", "images", "hero-fishing.png"),
        ];
        for (const fp of fallbackCandidates) {
          if (fs.existsSync(fp)) {
            sourceBuffer = fs.readFileSync(fp);
            break;
          }
        }
        if (!sourceBuffer) {
          return res.status(404).end();
        }
      }

      // Blurred, darkened background fills the 1200x630 card, while the full
      // product image is contained (never cropped) and centered on top.
      const background = await sharp(sourceBuffer)
        .resize(1200, 630, { fit: "cover", position: "center" })
        .blur(28)
        .modulate({ brightness: 0.6 })
        .toBuffer();

      const foreground = await sharp(sourceBuffer)
        .resize(1200, 630, { fit: "inside", withoutEnlargement: false })
        .toBuffer();

      const jpegBuffer = await sharp(background)
        .composite([{ input: foreground, gravity: "center" }])
        .jpeg({ quality: 85 })
        .toBuffer();

      res.set({
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      });
      res.end(jpegBuffer);
    } catch (err) {
      console.error("OG image error:", err);
      res.status(500).end();
    }
  });

  app.get("/product/:id", async (req: any, res, next) => {
    const ua = (req.headers["user-agent"] || "").toLowerCase();
    const isCrawler = /facebookexternalhit|facebot|twitterbot|linkedinbot|telegrambot|whatsapp|slackbot|discordbot|bot|crawler|spider/i.test(ua);

    if (!isCrawler) {
      return next();
    }

    try {
      const product = await storage.getProduct(Number(req.params.id));
      if (!product) return next();

      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
      const host = req.headers["x-forwarded-host"] || req.headers["host"] || req.hostname;
      const baseUrl = `${protocol}://${host}`;

      const price = product.discountPrice && Number(product.discountPrice) < Number(product.originalPrice)
        ? product.discountPrice
        : product.originalPrice;

      const imageUrl = `${baseUrl}/api/og-image/${product.id}`;

      const refCode = req.query.ref || "";
      const productUrl = refCode
        ? `${baseUrl}/product/${product.id}?ref=${encodeURIComponent(refCode)}`
        : `${baseUrl}/product/${product.id}`;

      const rawDescription = product.description.substring(0, 200).replace(/\n/g, " ");
      const priceStr = Number(price).toFixed(2);

      // Escape every interpolated value to prevent stored XSS via product fields.
      const safeName = escHtml(product.name);
      const safeDesc = escHtml(rawDescription);
      const safeImage = escHtml(imageUrl);
      const safeProductUrl = escHtml(productUrl);
      const safeSiteName = escHtml(SITE_NAME);
      const safePrice = escHtml(priceStr);

      const html = `<!DOCTYPE html>
<html lang="ka">
<head>
<meta charset="UTF-8">
<title>${safeName} — ₾${safePrice} | ${safeSiteName}</title>
<meta name="description" content="${safeDesc}">
<meta property="og:type" content="product">
<meta property="og:title" content="${safeName} — ₾${safePrice}">
<meta property="og:description" content="${safeDesc}">
<meta property="og:image" content="${safeImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:url" content="${safeProductUrl}">
<meta property="og:site_name" content="${safeSiteName}">
<meta property="og:locale" content="ka_GE">
<meta property="product:price:amount" content="${safePrice}">
<meta property="product:price:currency" content="GEL">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${safeName} — ₾${safePrice}">
<meta name="twitter:description" content="${safeDesc}">
<meta name="twitter:image" content="${safeImage}">
</head>
<body>
<h1>${safeName}</h1>
<p>${safeDesc}</p>
<img src="${safeImage}" alt="${safeName}">
<p>₾${safePrice}</p>
</body>
</html>`;

      res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(html);
    } catch (err) {
      console.error("OG meta error:", err);
      next();
    }
  });

  app.get("/api/terms-sections", async (_req, res) => {
    try {
      const sections = await storage.getTermsSections();
      res.json(sections);
    } catch (err) {
      console.error("Terms sections fetch error:", err);
      res.status(500).json({ message: "სერვერის შეცდომა" });
    }
  });

  app.post("/api/terms-sections", requireAdmin, async (req, res) => {
    try {
      const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
      const content = typeof req.body?.content === "string" ? req.body.content : "";
      if (!title || isRichTextEmpty(content)) {
        return res.status(400).json({ message: "სათაური და შინაარსი აუცილებელია" });
      }
      const sortOrder = req.body?.sortOrder !== undefined ? Number(req.body.sortOrder) : 0;
      const section = await storage.createTermsSection({
        title,
        content,
        sortOrder,
      });
      res.status(201).json(section);
    } catch (err) {
      console.error("Terms section create error:", err);
      res.status(500).json({ message: "სერვერის შეცდომა" });
    }
  });

  app.put("/api/terms-sections/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "არასწორი ID" });
      }
      const updates: Record<string, any> = {};
      if (req.body?.title !== undefined) {
        if (typeof req.body.title !== "string") {
          return res.status(400).json({ message: "სათაური უნდა იყოს ტექსტი" });
        }
        const title = req.body.title.trim();
        if (!title) return res.status(400).json({ message: "სათაური აუცილებელია" });
        updates.title = title;
      }
      if (req.body?.content !== undefined) {
        if (typeof req.body.content !== "string") {
          return res.status(400).json({ message: "შინაარსი უნდა იყოს ტექსტი" });
        }
        const content = req.body.content;
        if (isRichTextEmpty(content)) return res.status(400).json({ message: "შინაარსი აუცილებელია" });
        updates.content = content;
      }
      if (req.body?.sortOrder !== undefined) {
        updates.sortOrder = Number(req.body.sortOrder);
      }
      const updated = await storage.updateTermsSection(id, updates);
      if (!updated) {
        return res.status(404).json({ message: "სექცია ვერ მოიძებნა" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Terms section update error:", err);
      res.status(500).json({ message: "სერვერის შეცდომა" });
    }
  });

  app.delete("/api/terms-sections/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "არასწორი ID" });
      }
      await storage.deleteTermsSection(id);
      res.status(204).send();
    } catch (err) {
      console.error("Terms section delete error:", err);
      res.status(500).json({ message: "სერვერის შეცდომა" });
    }
  });

  // ===== CHAT ROUTES =====
  function requireAuth(req: Request, res: Response, next: NextFunction) {
    const userId = (req as any).user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "გთხოვთ გაიაროთ ავტორიზაცია" });
    }
    next();
  }

  // ===== Gemini AI assistant =====
  // 5-minute in-memory cache for heavy Gemini context (shared across all chats).
  // Cuts DB load ~95% and Gemini token cost ~80% during busy periods.
  let geminiCtxCache: { ts: number; data: any } | null = null;
  const GEMINI_CTX_TTL_MS = 5 * 60 * 1000;

  async function getGeminiContext() {
    if (geminiCtxCache && Date.now() - geminiCtxCache.ts < GEMINI_CTX_TTL_MS) {
      return geminiCtxCache.data;
    }
    const [products, contactPhone, contactEmail, workHours, deliveryInfo, terms, referralCreditRaw, creditToGelRaw, adminKb] = await Promise.all([
      storage.getProducts(),
      storage.getSetting("contact_phone"),
      storage.getSetting("contact_email"),
      storage.getSetting("contact_work_hours"),
      storage.getSetting("contact_address"),
      storage.getTermsSections(),
      storage.getSetting("referral_credit_amount"),
      storage.getSetting("credit_to_gel"),
      storage.getAdminKnowledgeBase(150).catch(() => [] as any[]),
    ]);
    const data = { products, contactPhone, contactEmail, workHours, deliveryInfo, terms, referralCreditRaw, creditToGelRaw, adminKb };
    geminiCtxCache = { ts: Date.now(), data };
    return data;
  }

  // Delayed-bot-reply machinery: each user msg schedules a bot reply 60s out.
  // If a human admin replies in that window, the timer is cleared so the bot
  // never speaks. This emulates the "operator is typing…" pattern in Messenger.
  const pendingBotReplies = new Map<string, NodeJS.Timeout>();
  const BOT_REPLY_DELAY_MS = 20 * 1000;

  function cancelPendingBotReply(userId: string) {
    const t = pendingBotReplies.get(userId);
    if (t) {
      clearTimeout(t);
      pendingBotReplies.delete(userId);
    }
  }

  function scheduleDelayedBotReply(userId: string, userMessage: string, delayMs: number = BOT_REPLY_DELAY_MS) {
    cancelPendingBotReply(userId);
    const timer = setTimeout(async () => {
      pendingBotReplies.delete(userId);
      try {
        const msgs = await storage.getChatMessages(userId);
        const lastUser = [...msgs].reverse().find(m => m.senderType === "user");
        if (!lastUser) return;
        const lastUserAt = lastUser.createdAt ? new Date(lastUser.createdAt).getTime() : 0;
        // If admin already replied after the user's last message, stay silent.
        const adminAfter = msgs.some(m =>
          m.senderType === "admin" &&
          m.createdAt &&
          new Date(m.createdAt).getTime() > lastUserAt
        );
        if (adminAfter) return;

        const aiText = await geminiReply(userMessage, msgs, userId);
        // Always reply with SOMETHING — if Gemini fails or returns empty, send
        // a friendly hand-off so the user is never left hanging after 20s.
        const phoneNum = (await storage.getSetting("contact_phone").catch(() => "")) || "+995 599 52 33 51";
        const replyText = aiText && aiText.trim().length > 0
          ? aiText
          : `მადლობა შეტყობინებისთვის! ჩვენი ოპერატორი მალე გიპასუხებთ. სასწრაფო შემთხვევაში დარეკეთ: ${phoneNum}`;

        console.log(`[chat-bot] reply for user ${userId}: gemini=${aiText ? "ok" : "fallback"} (${replyText.length} chars)`);

        await storage.createChatMessage({
          userId,
          message: replyText,
          senderType: "bot",
          isRead: 0,
        });

        // Push-notify the user that a reply is waiting.
        try {
          const userSubs = await storage.getUserPushSubscriptions(userId);
          if (userSubs.length > 0) {
            const payload = JSON.stringify({
              title: "📩 spiningebi.ge — პასუხი",
              body: replyText.substring(0, 120),
              url: "/live-contact",
              tag: `chat-bot-${Date.now()}`,
            });
            for (const sub of userSubs) {
              webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                payload,
                { urgency: "high", TTL: 60 }
              ).catch(() => storage.removePushSubscription(sub.endpoint));
            }
          }
        } catch (_) {}
      } catch (e) {
        console.error("Delayed bot reply error:", e);
      }
    }, delayMs);
    pendingBotReplies.set(userId, timer);
  }

  async function geminiReply(userMessage: string, history: any[], userId?: string): Promise<string | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    // Skip Gemini for trivial messages (saves API cost & latency).
    // "ok", "კი", "არა", emoji-only, very short — not worth a full LLM round-trip.
    const trimmed = userMessage.trim();
    const letterCount = (trimmed.match(/[\p{L}\p{N}]/gu) || []).length;
    if (letterCount < 3) return null;

    try {
      const ctx = await getGeminiContext();
      const userOrders = userId ? await storage.getOrdersByUser(userId).catch(() => []) : [];
      const { products, contactPhone, contactEmail, workHours, deliveryInfo, terms, referralCreditRaw, creditToGelRaw, adminKb } = ctx;

      const phone = contactPhone || "+995 599 52 33 51";
      const email = contactEmail || "spiningebi@gmail.com";
      const hours = workHours || "ორშაბათი - შაბათი: 10:00 - 19:00";
      const addr = deliveryInfo || "თბილისი";
      const referralCredit = referralCreditRaw || "1";
      const creditToGel = creditToGelRaw || "1.5";

      const stripHtml = (s: string) =>
        String(s || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();

      const termsText = (terms || []).map((t: any) => {
        const body = stripHtml(t.content || "").substring(0, 700);
        return `### ${t.title}\n${body}`;
      }).join("\n\n");

      const formatDate = (d: any) => {
        if (!d) return "უცნობია";
        try { return new Date(d).toLocaleDateString("ka-GE", { year: "numeric", month: "2-digit", day: "2-digit" }); }
        catch { return String(d); }
      };
      const statusLabel = (s: string) => {
        const map: Record<string, string> = {
          pending: "მუშავდება",
          paid: "გადახდილია",
          shipped: "გაგზავნილია",
          delivered: "ჩაბარებულია",
          cancelled: "გაუქმებულია",
          completed: "დასრულებულია",
        };
        return map[s] || s || "უცნობია";
      };
      const ordersBlock = (userOrders && userOrders.length > 0)
        ? userOrders.slice(-10).map((o: any) => {
            const days = o.createdAt ? Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 86400000) : null;
            return `• შეკვეთა #${o.id} — "${o.productName}" × ${o.quantity || 1} — ${o.productPrice}₾ — სტატუსი: ${statusLabel(o.status)} — თარიღი: ${formatDate(o.createdAt)}${days !== null ? ` (${days} დღის წინ)` : ""} — მისამართი: ${o.city}, ${o.address}`;
          }).join("\n")
        : "ამ მომხმარებელს ჯერ არცერთი შეკვეთა არ გაუკეთებია.";

      const kbBlock = (adminKb && adminKb.length > 0)
        ? adminKb.slice(0, 80).map((kb: any) => {
            const q = (kb.question || "").replace(/\s+/g, " ").trim().substring(0, 200);
            const a = (kb.answer || "").replace(/\s+/g, " ").trim().substring(0, 400);
            if (!a) return "";
            return q ? `❓ "${q}"\n💬 ადმინი: "${a}"` : `💬 ადმინი: "${a}"`;
          }).filter(Boolean).join("\n---\n")
        : "(ჯერ არ არსებობს ცოცხალი მიმოწერა, საიდანაც ვისწავლი.)";

      const productList = products.slice(0, 60).map((p: any) => {
        const price = p.discountPrice || p.originalPrice;
        const inStock = (p.stock ?? 0) > 0;
        const stockStatus = inStock ? `მარაგშია (${p.stock} ც.)` : "ამოწურულია";
        const desc = String(p.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").substring(0, 220);
        return `• ${p.name} — ${price}₾ — ${stockStatus}\n  აღწერა: ${desc}`;
      }).join("\n");

      const systemPrompt = `შენ ხარ spiningebi.ge-ის (ქართული სათევზაო მაღაზია) AI ასისტენტი.

🔒 მკაცრი წესები (აუცილებლად დაიცავი):
1. პასუხები ძალიან მოკლე — მაქსიმუმ 2-4 წინადადება. არ გადააჭარბო.
2. **არასოდეს გასცე საიდუმლო ინფორმაცია:** არ ისაუბრო ტექნიკურად როგორ აწყობილია საიტი, რა ბაზაა, რა ფრეიმვორკი. არ თქვა გაყიდვების სტატისტიკა — რამდენი ნივთი იყიდება დღეში/თვეში, რამდენი მომხმარებელია, რა შემოსავალია.
3. **არასოდეს დაჰპირდე** ფასდაკლებას, საჩუქარს, სპეციალურ პირობებს, ფასის ცვლილებას, მიწოდების ვადის შემცირებას — შენ არ გაქვს ამის უფლება. თუ მომხმარებელი ფასდაკლებას ითხოვს — უთხარი რომ ოპერატორი დაგეკონტაქტებათ.
4. პროდუქტებზე ისაუბრე **მხოლოდ ქვემოთ მოცემული სიიდან**. არ მოიგონო ფასი, მახასიათებლები ან პროდუქტი რომელიც სიაში არ არის.
5. **მარაგი ზუსტად:** თუ ნივთი ამოწურულია — აუცილებლად უთხარი "ეს ნივთი ამჟამად ამოწურულია". არასოდეს თქვა რომ მარაგშია თუ რეალურად არ არის.
6. გამოიყენე პროდუქტის აღწერა — გაარჩიე რომელი ჯოხი/წნული/ბადე რისთვის გამოდგება (ზღვა, მტკნარი წყალი, კალმახი, კობრი და ა.შ.).
7. **თუ კითხვა გართულდა, არ ეხება მაღაზიას, ან ვერ პასუხობ ზუსტად** — უთხარი: "ამ კითხვაზე ჩვენი ოპერატორი გიპასუხებთ უმოკლეს დროში. შეგიძლიათ დარეკოთ: ${phone}, ან მოგვწეროთ: ${email}."
8. იყავი თავაზიანი, ქართულად ისაუბრე. ემოჯი იშვიათად.
8.1. **მისალმება / აქ ხარ? ტიპის შეტყობინებები:** თუ მომხმარებელი წერს "გამარჯობა", "სალამი", "აქ ხარ?", "გესმის?", "მიპასუხე", "ჰელო", "hi", "hello" და მსგავსს — აუცილებლად უპასუხე თბილად და მოკლედ. მაგ: "გამარჯობა! 👋 spiningebi.ge-ის ასისტენტი ვარ — დიახ, აქ ვარ. რით დაგეხმაროთ?" ან "სალამი! კი, აქ ვარ — სათევზაო ნივთებზე რომ რამე კითხვა გაქვთ, მზადა ვარ." არასოდეს დატოვო პასუხის გარეშე.
9. გადახდის შესახებ: გადახდა შესაძლებელია ბარათით საიტზე (Flitt) ან კურიერთან ნაღდით.
10. ფასების შესახებ ვაჭრობა არ შემოგვთავაზო — სხვაგვარად ვერ შევცვლი ფასებს.
11. **შეკვეთის შესახებ ჩივილი (ნებისმიერი პროდუქტი — სპინინგი, ჯოხი, ვობლერი, წნული, კარმაკი, ნემსი, რაც არ უნდა იყოს):** თუ მომხმარებელი წერს რომ შეიძინა რამე და ჯერ არ მიუღია — მაგ. "შევიძინე სპინინგი/ჯოხი/X და არ მოვიდა", "ნივთი გამოვიწერე და არ მოვიდა", "შეკვეთა არ მომივიდა", "სად არის ჩემი ამანათი", "ჯერ არ მისულა" და მსგავსი — **არასოდეს ენდო პირდაპირ მომხმარებლის სიტყვებს**. ჯერ აუცილებლად შეამოწმე ქვემოთ მოცემული "📋 მომხმარებლის შეკვეთები" სიაში აქვს თუ არა მართლა შეკვეთა:
   • თუ **არცერთი შეკვეთა არ აქვს ბაზაში** — თავაზიანად უთხარი: "ჩვენი სისტემის მიხედვით, თქვენი ანგარიშიდან არცერთი შეკვეთა ჯერ არ ფიქსირდება. გთხოვთ, შეამოწმოთ თქვენი პროფილი → 'ჩემი შეკვეთები'. თუ ფიქრობთ რომ შეცდომაა ან სხვა ანგარიშიდან გაქვთ შეძენილი — ცოცხალ ოპერატორთან დაუკავშირდით: ${phone}".
   • თუ **აქვს შეკვეთა ბაზაში** — დაასახელე კონკრეტული შეკვეთის ნომერი, პროდუქტი, სტატუსი და თარიღი (ზუსტად ისე, როგორც ბაზაშია), შემდეგ აუცილებლად დაუტოვე ცოცხალი ოპერატორის ნომერი. მაგ: "თქვენი შეკვეთა #X — '<პროდუქტი>' (სტატუსი: <Y>, თარიღი: <Z>) ფიქსირდება სისტემაში. დეტალურ ინფორმაციას — გადაზიდვის ეტაპი, ამანათის ადგილმდებარეობა — ცოცხალი ოპერატორი მოგაწვდით. დარეკეთ: ${phone}".
   • **არასოდეს არ ეცადო თვითონ აუხსნა რატომ აგვიანდება, სად დაიკარგა, ან როდის მოვა** — ეს ოპერატორის სამუშაოა, შენ AI ხარ და კონკრეტული ამანათის სტატუსზე დეტალები არ გაგაჩნია.
12. **დაზიანებული/გაუმართავი ნივთი:** თუ მომხმარებელი წერს რომ მიღებული ნივთი დაზიანებულია, გატეხილია, არ მუშაობს, აღწერას არ შეესაბამება, ან სხვა პრობლემაა — **არ ცადო თვითონ პრობლემის გადაჭრა**. თავაზიანად ბოდიში მოუხადე და მიწერე ცოცხალი ოპერატორის ნომერი. მაგ: "ძალიან ვწუხვართ რომ მიღებული ნივთი დაზიანებული აღმოჩნდა. ამ საკითხს ჩვენი ოპერატორი დაგეხმარებათ — დარეკეთ: ${phone}, ან მოგვწერეთ: ${email}. შესაძლებელია ნივთის ჩანაცვლება ან თანხის დაბრუნება 14 დღის განმავლობაში."

🏪 მაღაზიის ინფო:
- ტელეფონი: ${phone}
- ელფოსტა: ${email}
- სამუშაო საათები: ${hours}
- მისამართი: ${addr}

🚚 მიწოდება (საკურიერო მომსახურება):
- **ქუთაისი:** მიწოდება უფასოა, ახორციელებს უშუალოდ spiningebi.ge-ის ტრანსპორტი
- **რეგიონების ქალაქები:** 10.50 ლარი
- **სოფლები:** 15.50 ლარი
- საკურიერო მომსახურების საფასურს იხდის უშუალოდ **მყიდველი კურიერთან** ჩაბარების მომენტში (პროდუქტის ფასისგან განცალკევებით)
- **მაღალ მთიანი რეგიონებისთვის** ფასი შესაძლოა გაიზარდოს **15.50 ლარამდე** — თუ მომხმარებელი ამბობს რომ მაღალმთიან რეგიონში ცხოვრობს, აუცილებლად შეახსენე ეს
- როცა მომხმარებელი ასახელებს კონკრეტულ ადგილს, ჯერ შეამოწმე ქვემოთ მოცემული რეგიონების სიის მიხედვით ეკუთვნის თუ არა ბარის ან მაღალმთიან ზონას, შემდეგ ზუსტი ფასი უპასუხე

🗺️ საქართველოს მუნიციპალიტეტები და სოფლების კლასიფიკაცია:

**🟢 ბარის სოფლები (10.50 ₾) — დაბლობი ზონა:**
- **კახეთი:** გურჯაანი, საგარეჯო, სიღნაღი, ლაგოდეხი, დედოფლისწყარო, ყვარელი, თელავი (ალაზნის ხეობის სოფლები)
- **შიდა ქართლი:** გორი, კასპი, ქარელი, ხაშური (ბარის სოფლები)
- **ქვემო ქართლი:** რუსთავი, მარნეული, გარდაბანი, ბოლნისი, თეთრიწყარო
- **იმერეთი (ბარი):** ვანი, ზესტაფონი, თერჯოლა, სამტრედია, წყალტუბო, ხონი
- **სამეგრელო (ბარი):** ზუგდიდი, ფოთი, აბაშა, მარტვილი, სენაკი, ხობი, ჩხოროწყუ, წალენჯიხა
- **გურია:** ოზურგეთი, ლანჩხუთი (ბარის სოფლები)
- **აჭარა (ბარი):** ბათუმი (ფასიანი), ქობულეთი, ხელვაჩაური (დაბლობი)

**🔴 მაღალმთიანი სოფლები (15.50 ₾-მდე) — სოფლის შემთხვევაში 15.50 ლარი:**
- **რაჭა-ლეჩხუმი (ყველა):** ამბროლაური, ონი, ცაგერი, ლენტეხი — **ყველა სოფელი მთიანია**
- **სვანეთი:** მესტია და მისი ყველა სოფელი (უშგული, ჭუბერი, ეცერი, ლენჯერი, ლატალი და სხვ.)
- **მცხეთა-მთიანეთი (მთიანი):** ყაზბეგი (სტეფანწმინდა, გერგეთი, სიონი, ფანშეტი), დუშეთის მთიანი (მთიულეთი, გუდამაყარი, ხევსურეთი — შატილი, მუცო, ბარისახო), თიანეთის მთიანი ზონა, ფშავი
- **კახეთი (მთიანი):** ახმეტის მუნიციპალიტეტი — თუშეთის სოფლები (ომალო, შენაქო, დართლო), ფშავ-ხევსურეთის ნაწილი
- **სამცხე-ჯავახეთი (მთიანი):** ჯავახეთის პლატო — ახალქალაქი, ნინოწმინდა (1700მ+); ბორჯომის ხეობის მთიანი სოფლები (ბაკურიანი, წაღვერი, ციხისჯვარი); ადიგენის მთიანი ნაწილი; ასპინძის მთიანი სოფლები
- **იმერეთი (მთიანი):** საჩხერის, ჭიათურის, ხარაგაულის, ბაღდათის, ტყიბულის მთიანი სოფლები
- **გურია (მთიანი):** ჩოხატაურის მთიანი სოფლები (ბახმარო, გომისმთა)
- **აჭარა (მთიანი):** ხულო, შუახევი, ქედის მთიანი სოფლები (ბეშუმი, გოდერძი)

**წესი ბოტისთვის:**
1. თუ მომხმარებელი ქალაქს ასახელებს (მაგ. ბათუმი, ზუგდიდი, თელავი) — 10.50 ₾
2. თუ ბარის სოფელს — 10.50 ₾
3. თუ მაღალმთიან სოფელს ან რეგიონს (რაჭა, სვანეთი, ხევსურეთი, თუშეთი, მთიულეთი, ჯავახეთი, ხულო და ა.შ.) — 15.50 ₾
4. ამბროლაური/ონი/მესტია — მიუხედავად ქალაქი არის თუ სოფელი, ეს რეგიონები ოფიციალურად მაღალმთიანია → **15.50 ₾**
5. თუ ვერ ხვდები რომელ ზონაა სოფელი — **დააზუსტე**: "სოფელი რომელ მუნიციპალიტეტში მდებარეობს? მაღალმთიანი ხომ არ არის?"

⏱️ მიწოდების ვადები:
- **ქალაქებში:** დაახლოებით **3 დღე**
- **რეგიონებში/სოფლებში:** **3-დან 6 დღემდე**
- **მნიშვნელოვანი:** მომხმარებელმა აუცილებლად უნდა ჰქონდეს **ჩართული ის ტელეფონის ნომერი**, რომელიც საკონტაქტო ინფორმაციაში მიუთითა — კურიერი დარეკავს ჩაბარების წინ
- **შაბათ-კვირას შეკვეთილი ნივთები იგზავნება ორშაბათი დღიდან**, რადგან ფოსტები შაბათ-კვირას არ მუშაობს

🔄 დაბრუნების პოლიტიკა:
- მომხმარებელს უფლება აქვს დააბრუნოს ნივთი **14 კალენდარული დღის** განმავლობაში
- ნივთი უნდა იყოს გამოუყენებელი, თავდაპირველ შეფუთვაში, ყველა ეტიკეტით
- დაბრუნების ტრანსპორტირების ხარჯი ეკისრება მომხმარებელს (გარდა იმ შემთხვევისა, თუ ნივთი დაზიანებულია ან აღწერას არ შეესაბამება)

🎁 კრედიტების სისტემა (რეფერალური):
- ყოველი მომხმარებელი იღებს უნიკალურ რეფერალურ კოდს თავის პროფილში
- როცა ვინმე შენი კოდით დარეგისტრირდება და შეიძენს რამეს — შენ ერიცხება **${referralCredit} კრედიტი**
- 1 კრედიტი = **${creditToGel} ლარი** (გადახდისას ფასდაკლების სახით გამოიყენება)
- კრედიტები ავტომატურად ერიცხება და ჩანს მომხმარებლის პროფილში

🎣 სათევზაო ადგილების ცოდნა (დასავლეთ საქართველო):
- **ქაშაპზე** კარგი ადგილებია:
  • ხანის წყალი
  • წყალწითელა
  • გუბის წყალი (განსაკუთრებით დილით — ქაშაპუნებს დილა უყვართ)
  • ტეხურა
  • ნოღელა
  • ხობის წყალი
- **საშუკეთ (ქარიყლაპიაზე, ქორჭილაზე)** კარგი ადგილებია:
  • ვარციხის ტბები
  • შაორის წყალსაცავი (აქ დიდი ქარიყლაპიები და ქორჭილები გვხვდება)
- როცა მომხმარებელი იკითხავს "სად მოვიჭიდო ქაშაპი/ქარიყლაპია?" ან მსგავსს — დაასახელე ეს ადგილები და დააკავშირე შესაბამის პროდუქტთან (ჯოხი/ვობლერი/წნული) რომელიც სიაშია მარაგში.

📋 მომხმარებლის შეკვეთები (ცოცხალი მონაცემები ბაზიდან):
${ordersBlock}

📋 წესები და პირობები (ოფიციალური დოკუმენტი):
${termsText}

🧠 ადმინის ცოცხალი ცოდნა (წინა ცოცხალი მიმოწერებიდან ნასწავლი — გამოიყენე ანალოგიურ კითხვებზე პასუხის გასაცემად, განსაკუთრებით სათევზაო რჩევებზე):
${kbBlock}

📦 პროდუქტების სია (მხოლოდ აქედან ისაუბრე):
${productList}`;

      const contents: any[] = [];
      const recent = history.slice(-6);
      for (const m of recent) {
        if (!m.message) continue;
        contents.push({
          role: m.senderType === "user" ? "user" : "model",
          parts: [{ text: String(m.message) }],
        });
      }
      contents.push({ role: "user", parts: [{ text: userMessage }] });

      const body = JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 800,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      return await new Promise<string | null>((resolve) => {
        const req = https.request({
          hostname: "generativelanguage.googleapis.com",
          path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body).toString(),
          },
          timeout: 15000,
        }, (resp) => {
          let data = "";
          resp.on("data", (c) => (data += c));
          resp.on("end", () => {
            try {
              const parsed = JSON.parse(data);
              const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text && typeof text === "string") {
                resolve(text.trim().substring(0, 1500));
              } else {
                console.error("Gemini empty response:", data.substring(0, 300));
                resolve(null);
              }
            } catch (e) {
              console.error("Gemini parse error:", data.substring(0, 300));
              resolve(null);
            }
          });
        });
        req.on("error", (err) => {
          console.error("Gemini request error:", err);
          resolve(null);
        });
        req.on("timeout", () => {
          req.destroy();
          resolve(null);
        });
        req.write(body);
        req.end();
      });
    } catch (err) {
      console.error("Gemini setup error:", err);
      return null;
    }
  }

  // Get current user's chat messages (also marks admin/bot msgs as read)
  app.get("/api/chat/messages", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub as string;
      await storage.markAdminMessagesRead(userId);
      const messages = await storage.getChatMessages(userId);
      res.json(messages);
    } catch (err) {
      console.error("Chat get error:", err);
      res.status(500).json({ message: "სერვერის შეცდომა" });
    }
  });

  // Get unread count for current user (admin/bot messages not yet seen)
  app.get("/api/chat/unread-count", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub as string;
      const count = await storage.getUnreadCountForUser(userId);
      res.json({ count });
    } catch (err) {
      console.error("Chat unread count error:", err);
      res.status(500).json({ message: "სერვერის შეცდომა" });
    }
  });

  // Send message (user)
  app.post("/api/chat/messages", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub as string;
      const { message } = req.body;
      if (!message || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ message: "შეტყობინება სავალდებულოა" });
      }

      const userMsg = await storage.createChatMessage({
        userId,
        message: message.trim().substring(0, 1000),
        senderType: "user",
        isRead: 0,
      });

      // Delayed AI reply: usually 20s buffer so a human admin can step in first.
      // For simple greetings / presence checks ("გამარჯობა", "აქ ხარ?", etc.),
      // shorten to 5s so the bot feels alive like a Messenger chat.
      const trimmedMsg = message.trim();
      const isQuickGreeting = /^(გამარჯ|სალამ|ჰელო|დილა\s?მშვი|საღამო\s?მშვი|ღამე\s?მშვი|გაიხარ|აქ\s?ხარ|აქხარ|გესმი|მისმენ|პასუხი|მიპასუხ|ხარ\s*\??$|hello|hi|hey|yo)/i.test(trimmedMsg);
      const delayMs = isQuickGreeting ? 5000 : 20000;
      scheduleDelayedBotReply(userId, trimmedMsg, delayMs);

      // Send push notification to admin subscribers
      try {
        const adminSubs = await storage.getAdminPushSubscriptions();
        const payload = JSON.stringify({
          title: "💬 ახალი შეტყობინება",
          body: message.trim().substring(0, 100),
          url: "/admin-dashboard",
        });
        for (const sub of adminSubs) {
          webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { urgency: "high", TTL: 60 }
          ).catch(() => storage.removePushSubscription(sub.endpoint));
        }
      } catch (_) {}

      res.json(userMsg);
    } catch (err) {
      console.error("Chat send error:", err);
      res.status(500).json({ message: "სერვერის შეცდომა" });
    }
  });

  // Admin: search registered users by name/email (to start a new chat)
  app.get("/api/chat/user-search", requireAdmin, async (req, res) => {
    try {
      const q = String(req.query.q || "").trim().toLowerCase();
      if (!q) return res.json([]);
      const all = await storage.getUsers();
      const matches = all
        .filter((u) => {
          const full = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
          return (
            full.includes(q) ||
            (u.email || "").toLowerCase().includes(q) ||
            (u.phone || "").toLowerCase().includes(q)
          );
        })
        .slice(0, 20)
        .map((u) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email }));
      res.json(matches);
    } catch (err) {
      console.error("User search error:", err);
      res.status(500).json({ message: "სერვერის შეცდომა" });
    }
  });

  // Admin: get all conversations
  app.get("/api/chat/conversations", requireAdmin, async (_req, res) => {
    try {
      const convs = await storage.getAllChatConversations();
      res.json(convs);
    } catch (err) {
      console.error("Chat conversations error:", err);
      res.status(500).json({ message: "სერვერის შეცდომა" });
    }
  });

  // Admin: get messages for specific user
  app.get("/api/chat/messages/:userId", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      await storage.markChatRead(userId);
      const messages = await storage.getChatMessages(userId);
      res.json(messages);
    } catch (err) {
      console.error("Chat admin get error:", err);
      res.status(500).json({ message: "სერვერის შეცდომა" });
    }
  });

  // Admin: reply to user
  app.post("/api/chat/reply/:userId", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { message } = req.body;
      if (!message || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ message: "შეტყობინება სავალდებულოა" });
      }
      // Admin is handling this conversation — cancel any pending AI reply.
      cancelPendingBotReply(userId);

      const msg = await storage.createChatMessage({
        userId,
        message: message.trim().substring(0, 1000),
        senderType: "admin",
        isRead: 0,
      });

      // Send push notification to the user so they get it even when app is closed
      try {
        const userSubs = await storage.getUserPushSubscriptions(userId);
        console.log(`[push] chat reply to ${userId}: ${userSubs.length} subscription(s)`);
        if (userSubs.length > 0) {
          const payload = JSON.stringify({
            title: "📩 spiningebi.ge — პასუხი",
            body: message.trim().substring(0, 120),
            url: "/live-contact",
            tag: `chat-reply-${Date.now()}`,
          });
          for (const sub of userSubs) {
            webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload,
              { urgency: "high", TTL: 60 }
            ).then(() => {
              console.log(`[push] ✓ sent to ${userId} endpoint: ${sub.endpoint.slice(0, 50)}...`);
            }).catch((err: any) => {
              console.warn(`[push] ✗ failed for ${userId}:`, err?.statusCode, err?.message);
              storage.removePushSubscription(sub.endpoint);
            });
          }
        } else {
          console.log(`[push] no subscriptions for user ${userId} — push not sent`);
        }
      } catch (e) {
        console.warn("[push] chat reply push error:", e);
      }

      res.json(msg);
    } catch (err) {
      console.error("Chat reply error:", err);
      res.status(500).json({ message: "სერვერის შეცდომა" });
    }
  });

  // Push notification: get VAPID public key
  app.get("/api/push/vapid-key", (_req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || "" });
  });

  // Admin: push subscription stats per user
  app.get("/api/admin/push-stats", requireAdmin, async (_req, res) => {
    try {
      const all = await storage.getAllPushSubscriptions();
      const byUser: Record<string, number> = {};
      for (const sub of all) {
        byUser[sub.userId] = (byUser[sub.userId] || 0) + 1;
      }
      res.json({ total: all.length, byUser });
    } catch (err) {
      res.status(500).json({ message: "სერვერის შეცდომა" });
    }
  });

  // Admin: test push to specific user
  app.post("/api/admin/push-test/:userId", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const subs = await storage.getUserPushSubscriptions(userId);
      if (!subs.length) {
        return res.json({ sent: 0, message: "ამ მომხმარებელს push subscription არ აქვს" });
      }
      const payload = JSON.stringify({
        title: "🔔 ტესტ შეტყობინება",
        body: "Push notification მუშაობს!",
        url: "/live-contact",
        tag: `test-${Date.now()}`,
      });
      let sent = 0;
      for (const sub of subs) {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { urgency: "high", TTL: 60 }
        ).then(() => { sent++; }).catch(async (err: any) => {
          console.warn(`[push-test] failed:`, err?.statusCode);
          if (err?.statusCode === 410) await storage.removePushSubscription(sub.endpoint);
        });
      }
      res.json({ sent, total: subs.length });
    } catch (err) {
      res.status(500).json({ message: "სერვერის შეცდომა" });
    }
  });

  // Push notification: subscribe (any logged-in user)
  app.post("/api/push/subscribe", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub as string;
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ message: "არასრული subscription" });
      }
      await storage.savePushSubscription(userId, endpoint, keys.p256dh, keys.auth);
      res.json({ ok: true });
    } catch (err) {
      console.error("Push subscribe error:", err);
      res.status(500).json({ message: "სერვერის შეცდომა" });
    }
  });

  // Push notification: unsubscribe
  app.post("/api/push/unsubscribe", requireAuth, async (req, res) => {
    try {
      const { endpoint } = req.body;
      if (endpoint) await storage.removePushSubscription(endpoint);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: "სერვერის შეცდომა" });
    }
  });

  // ─── Broadcasts ───────────────────────────────────────────────────────────
  // Admin: send broadcast to all users
  app.post("/api/admin/broadcast", requireAdmin, async (req, res) => {
    try {
      const { title, body, url, imageUrl } = req.body;
      if (!title?.trim() || !body?.trim()) {
        return res.status(400).json({ message: "სათაური და ტექსტი სავალდებულოა" });
      }
      const broadcast = await storage.createBroadcast({
        title: title.trim(),
        body: body.trim(),
        url: url?.trim() || undefined,
        imageUrl: imageUrl?.trim() || undefined,
      });

      // Send push notifications to all subscribers
      try {
        const rawSubs = await storage.getAllPushSubscriptions();
        // Deduplicate: send at most one push per userId (use newest subscription per user)
        const seenUsers = new Set<string>();
        const allSubs = rawSubs
          .slice()
          .sort((a, b) => b.id - a.id) // newest first
          .filter(s => {
            if (seenUsers.has(s.userId)) return false;
            seenUsers.add(s.userId);
            return true;
          });

        // Build absolute image URL so Android/Chrome can fetch it for the rich notification
        const siteOrigin = process.env.SITE_URL ||
          `${req.protocol}://${req.get("host")}`;
        const absoluteImage = imageUrl
          ? (imageUrl.startsWith("http") ? imageUrl : `${siteOrigin}${imageUrl}`)
          : undefined;

        // Also build absolute icon using the site's PWA icon
        const absoluteIcon = `${siteOrigin}/pwa-icon.png`;

        const baseUrl = url || "/";
        const payload = JSON.stringify({
          title: title.trim(),
          body: body.trim().substring(0, 120),
          url: baseUrl,
          broadcastId: broadcast.id,
          image: absoluteImage,
          icon: absoluteIcon,
          tag: `broadcast-${broadcast.id}`,
        });
        console.log(`[broadcast] pushing to ${allSubs.length} subs, image: ${absoluteImage}`);
        let pushSent = 0, pushFailed = 0;
        for (const sub of allSubs) {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { urgency: "high", TTL: 60 }
          ).then(() => { pushSent++; }).catch(async (err: any) => {
            pushFailed++;
            console.warn(`[broadcast] push failed: status=${err?.statusCode} msg=${err?.message} endpoint=${sub.endpoint.slice(0, 60)}`);
            if (err?.statusCode === 410 || err?.statusCode === 404) {
              await storage.removePushSubscription(sub.endpoint);
            }
          });
        }
        console.log(`[broadcast] push done: ${pushSent} sent, ${pushFailed} failed`);
      } catch (pushErr) {
        console.error(`[broadcast] push error:`, pushErr);
      }

      res.json(broadcast);
    } catch (err) {
      console.error("Broadcast error:", err);
      res.status(500).json({ message: "სერვერის შეცდომა" });
    }
  });

  // Admin: list all broadcasts
  app.get("/api/admin/broadcasts", requireAdmin, async (_req, res) => {
    try {
      res.json(await storage.getBroadcasts());
    } catch (err) {
      res.status(500).json({ message: "სერვერის შეცდომა" });
    }
  });

  // Admin: delete broadcast
  app.delete("/api/admin/broadcast/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteBroadcast(Number(req.params.id));
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: "სერვერის შეცდომა" });
    }
  });

  // User: get unread broadcasts
  app.get("/api/notifications/unread", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub as string;
      res.json(await storage.getUnreadBroadcastsForUser(userId));
    } catch (err) {
      res.status(500).json({ message: "სერვერის შეცდომა" });
    }
  });

  // User: mark broadcast read
  app.post("/api/notifications/read/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub as string;
      await storage.markBroadcastRead(Number(req.params.id), userId);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: "სერვერის შეცდომა" });
    }
  });

  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const allProducts = await storage.getProducts();
      const baseUrl = "https://spiningebi.ge";
      const now = new Date().toISOString().split("T")[0];

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

      for (const p of allProducts) {
        xml += `
  <url>
    <loc>${baseUrl}/product/${p.id}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }

      xml += `\n</urlset>`;
      res.set("Content-Type", "application/xml").send(xml);
    } catch {
      res.status(500).send("Error generating sitemap");
    }
  });

  app.get("/robots.txt", (_req, res) => {
    res.set("Content-Type", "text/plain").send(
`User-agent: *
Allow: /
Disallow: /admin-login
Disallow: /admin-dashboard
Disallow: /api/

Sitemap: https://spiningebi.ge/sitemap.xml`
    );
  });

  // ── Flitt Payment (official SDK) ───────────────────────────────────────────
  const FlittPayMod: any = await import("@flittpayments/flitt-node-js-sdk");
  const FlittPay = FlittPayMod.default || FlittPayMod;
  const flittClient = new FlittPay({
    merchantId: Number(process.env.FLITT_MERCHANT_ID || "1549901"),
    secretKey: process.env.FLITT_SECRET_KEY || "test",
  });

  app.post("/api/flitt/pay", async (req: any, res) => {
    try {
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ message: "გაიარეთ ავტორიზაცია" });
      }
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { description, orderId, orderIds, cardOnly } = req.body;

      // Collect the orders to pay for (single order or a whole cart). The
      // amount is derived from these orders on the server, so the browser
      // can never dictate how much is actually charged.
      const rawIds: any[] = Array.isArray(orderIds) && orderIds.length > 0
        ? orderIds
        : (orderId != null ? [orderId] : []);
      const ids = Array.from(new Set(rawIds.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0)));
      if (ids.length === 0) {
        return res.status(400).json({ message: "შეკვეთა აუცილებელია" });
      }

      let totalGel = 0;
      for (const id of ids) {
        const ord = await storage.getOrder(id);
        if (!ord) {
          return res.status(404).json({ message: "შეკვეთა ვერ მოიძებნა" });
        }
        if (ord.userId !== userId) {
          return res.status(403).json({ message: "წვდომა აკრძალულია" });
        }
        if (ord.status !== "awaiting_payment") {
          return res.status(400).json({ message: "შეკვეთა გადახდას არ ელოდება" });
        }
        // Purchase-limited products: unpaid checkouts stop counting toward the
        // limit after 20 minutes (see storage.limitConditions), so a stale
        // order must not be re-payable — otherwise paying it after the slot
        // was freed (and re-used) would overshoot the limit. Cancel it and
        // ask the buyer to place a fresh order, which re-checks the limit.
        const prodForLimit = await storage.getProduct(Number(ord.productId));
        if (Number(prodForLimit?.purchaseLimit ?? 0) > 0) {
          const ageMs = Date.now() - new Date(ord.createdAt as any).getTime();
          if (ageMs > 20 * 60 * 1000) {
            try { await storage.updateOrderStatus(ord.id, "cancelled"); } catch {}
            return res.status(400).json({ message: "გადახდის დრო ამოიწურა — გთხოვთ, გააკეთოთ ახალი შეკვეთა" });
          }
        }
        totalGel += Number(ord.productPrice);
      }
      if (!(totalGel > 0)) {
        return res.status(400).json({ message: "არასწორი თანხა" });
      }

      // Always use the canonical www host: the apex spiningebi.ge 301-redirects
      // to www, and Flitt's server-to-server POST callback does NOT follow 301s,
      // so an apex callback URL would silently drop every payment confirmation.
      const appUrl = (process.env.APP_URL || "https://www.spiningebi.ge")
        .replace(/\/$/, "")
        .replace(/:\/\/spiningebi\.ge/, "://www.spiningebi.ge");
      const amountTetri = Math.round(totalGel * 100); // GEL → tetri
      const oid = String(ids[0]);

      // Flitt rejects duplicate order_ids — always add timestamp suffix to make unique
      const uniqueOid = `${oid}-${Date.now()}`;

      const requestData: Record<string, string | number> = {
        order_id: uniqueOid,
        order_desc: (description || "spiningebi.ge შეკვეთა").substring(0, 255),
        currency: "GEL",
        amount: amountTetri,
        response_url: `${appUrl}/payment/success?oid=${encodeURIComponent(oid)}`,
        server_callback_url: `${appUrl}/api/flitt/callback`,
        // Payment link expires after 15 minutes: purchase-limit counting only
        // holds unpaid checkouts for 20 minutes, so an expired link must not
        // be payable after the limit slot has been freed.
        lifetime: 900,
      };

      if (cardOnly) {
        requestData.default_payment_system = "card";
        requestData.required_rectoken = "n";
      }

      // Atomically bind the exact Flitt order_id onto every order in this
      // payment BEFORE creating the checkout. Binding only succeeds while an
      // order is still awaiting and unbound, so a second/parallel pay request
      // can't rebind these orders and orphan this payment's settlement.
      const boundIds: number[] = [];
      let bindConflict = false;
      for (const id of ids) {
        const ok = await storage.bindFlittOrderId(id, uniqueOid);
        if (ok) {
          boundIds.push(id);
        } else {
          bindConflict = true;
          break;
        }
      }
      if (bindConflict) {
        // Roll back our partial bindings so a later retry can rebind cleanly.
        for (const id of boundIds) {
          try { await storage.clearFlittOrderId(id); } catch {}
        }
        return res.status(409).json({ message: "გადახდა უკვე მიმდინარეობს ამ შეკვეთაზე" });
      }

      let result: any;
      try {
        result = await flittClient.Checkout(requestData);
      } catch (checkoutErr) {
        // Checkout never started → release the bindings so the user can retry.
        for (const id of boundIds) {
          try { await storage.clearFlittOrderId(id); } catch {}
        }
        throw checkoutErr;
      }
      const resp = result?.response || result;

      if (resp?.checkout_url) {
        return res.json({ payUrl: resp.checkout_url, paymentId: resp.payment_id });
      }
      // No checkout URL → release bindings so the user can retry.
      for (const id of boundIds) {
        try { await storage.clearFlittOrderId(id); } catch {}
      }
      console.error("[Flitt pay] bad response:", resp?.error_message || "unknown");
      return res.status(502).json({ message: "გადახდის ბმულის მიღება ვერ მოხერხდა" });
    } catch (err: any) {
      console.error("[Flitt pay] error:", err?.message || err);
      return res.status(500).json({ message: "გადახდის შეცდომა" });
    }
  });

  app.get("/api/products/:id/reactions", async (req: any, res) => {
    try {
      const { pool } = await import("./db");
      const pid = parseInt(req.params.id);
      if (isNaN(pid)) return res.status(400).json({ message: "Invalid id" });
      const counts = await pool.query(
        `SELECT type, COUNT(*)::int AS c FROM product_reactions WHERE product_id=$1 GROUP BY type`,
        [pid]
      );
      let likes = 0, dislikes = 0;
      for (const row of counts.rows) {
        if (row.type === "like") likes = row.c;
        else if (row.type === "dislike") dislikes = row.c;
      }
      let mine: string | null = null;
      if (req.isAuthenticated && req.isAuthenticated()) {
        const userId = req.user?.claims?.sub;
        if (userId) {
          const r = await pool.query(`SELECT type FROM product_reactions WHERE product_id=$1 AND user_id=$2`, [pid, userId]);
          mine = r.rows[0]?.type ?? null;
        }
      }
      res.json({ likes, dislikes, mine });
    } catch (err) {
      console.error("reactions get error", err);
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.post("/api/products/:id/reactions", async (req: any, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "გთხოვთ გაიაროთ ავტორიზაცია" });
    }
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const pid = parseInt(req.params.id);
      if (isNaN(pid)) return res.status(400).json({ message: "Invalid id" });
      const type = req.body?.type;
      const { pool } = await import("./db");
      if (type === null) {
        await pool.query(`DELETE FROM product_reactions WHERE product_id=$1 AND user_id=$2`, [pid, userId]);
      } else if (type === "like" || type === "dislike") {
        await pool.query(
          `INSERT INTO product_reactions(product_id,user_id,type) VALUES($1,$2,$3)
           ON CONFLICT (product_id,user_id) DO UPDATE SET type=EXCLUDED.type, created_at=NOW()`,
          [pid, userId, type]
        );
      } else {
        return res.status(400).json({ message: "Invalid type" });
      }
      res.json({ ok: true });
    } catch (err) {
      console.error("reactions post error", err);
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.get("/api/products/:id/comments", async (req, res) => {
    try {
      const { pool } = await import("./db");
      const pid = parseInt(req.params.id);
      if (isNaN(pid)) return res.status(400).json({ message: "Invalid id" });
      const r = await pool.query(
        `SELECT c.id, c.text, c.created_at, c.user_id, u.first_name, u.last_name
         FROM product_comments c
         LEFT JOIN users u ON u.id = c.user_id
         WHERE c.product_id=$1
         ORDER BY c.created_at DESC
         LIMIT 200`,
        [pid]
      );
      res.json(r.rows.map((row) => ({
        id: row.id,
        text: row.text,
        createdAt: row.created_at,
        userId: row.user_id,
        firstName: row.first_name,
        lastName: row.last_name,
      })));
    } catch (err) {
      console.error("comments get error", err);
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.post("/api/products/:id/comments", async (req: any, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "გთხოვთ გაიაროთ ავტორიზაცია" });
    }
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const pid = parseInt(req.params.id);
      if (isNaN(pid)) return res.status(400).json({ message: "Invalid id" });
      const text = String(req.body?.text || "").trim().slice(0, 1000);
      if (!text) return res.status(400).json({ message: "ცარიელი კომენტარი" });
      const { pool } = await import("./db");
      const r = await pool.query(
        `INSERT INTO product_comments(product_id,user_id,text) VALUES($1,$2,$3) RETURNING id, created_at`,
        [pid, userId, text]
      );
      const user = await storage.getUser(userId);
      res.status(201).json({
        id: r.rows[0].id,
        text,
        createdAt: r.rows[0].created_at,
        userId,
        firstName: user?.firstName ?? null,
        lastName: user?.lastName ?? null,
      });
    } catch (err) {
      console.error("comments post error", err);
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.patch("/api/products/:id/comments/:commentId", async (req: any, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "გთხოვთ გაიაროთ ავტორიზაცია" });
    }
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const cid = parseInt(req.params.commentId);
      if (isNaN(cid)) return res.status(400).json({ message: "Invalid id" });
      const text = String(req.body?.text || "").trim().slice(0, 1000);
      if (!text) return res.status(400).json({ message: "ცარიელი კომენტარი" });
      const { pool } = await import("./db");
      const r = await pool.query(
        `UPDATE product_comments SET text=$1 WHERE id=$2 AND user_id=$3 RETURNING id`,
        [text, cid, userId]
      );
      if (r.rowCount === 0) return res.status(403).json({ message: "უფლება არ გაქვთ" });
      res.json({ ok: true });
    } catch (err) {
      console.error("comments patch error", err);
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.delete("/api/products/:id/comments/:commentId", async (req: any, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "გთხოვთ გაიაროთ ავტორიზაცია" });
    }
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const cid = parseInt(req.params.commentId);
      if (isNaN(cid)) return res.status(400).json({ message: "Invalid id" });
      const { pool } = await import("./db");
      const r = await pool.query(
        `DELETE FROM product_comments WHERE id=$1 AND user_id=$2`,
        [cid, userId]
      );
      if (r.rowCount === 0) return res.status(403).json({ message: "უფლება არ გაქვთ" });
      res.json({ ok: true });
    } catch (err) {
      console.error("comments delete error", err);
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  // Reduce inventory for a realized sale exactly once. Uses the atomic
  // stock_deducted claim so no path (Flitt settlement, credit purchase, admin
  // marking shipped) can double-count. Branches on selectedColor per the
  // two-source stock model. Returns true if this call performed the deduction.
  async function applyStockDeduction(order: any, source: string): Promise<boolean> {
    const claimed = await storage.markStockDeductedIfNot(order.id);
    if (!claimed) return false;
    await storage.incrementSoldCount(order.productId, order.quantity);
    if (order.selectedColor) {
      await storage.decrementColorStock(order.productId, order.selectedColor, order.quantity);
    } else {
      await storage.decrementStock(order.productId, order.quantity);
    }
    console.log(`[stock] deducted ${order.quantity} for product ${order.productId} (order ${order.id}, ${source})`);
    return true;
  }

  // Settle an order whose payment is confirmed real. Idempotent: only acts on
  // orders still in "awaiting_payment", so the callback and the success-page
  // confirmation can both call it without double-crediting.
  async function settlePaidOrder(ourOrderId: number, source: string): Promise<boolean> {
    const order = await storage.getOrder(ourOrderId);
    if (!order || order.status !== "awaiting_payment") return false;

    // Visibility guard: payment links expire after 15 min and stale limited
    // orders can't be re-paid, so a confirmed payment for an order older than
    // 25 min shouldn't normally happen. Settle it anyway (the money is real),
    // but log it so a possible purchase-limit overshoot can be reviewed.
    const settleAgeMs = Date.now() - new Date(order.createdAt as any).getTime();
    if (settleAgeMs > 25 * 60 * 1000) {
      console.warn(`[Flitt] settling STALE order ${order.id} (age ${Math.round(settleAgeMs / 60000)} min, ${source}) — check purchase-limit overshoot for product ${order.productId}`);
    }

    // Atomically claim this order. Only the single caller that actually performs
    // the awaiting_payment → pending transition proceeds; concurrent callback +
    // confirm calls cannot both count the sale or award referral credit twice.
    const claimed = await storage.markOrderPaidIfAwaiting(ourOrderId);
    if (!claimed) return false;

    // The payment is real → count the sale and reduce stock now (not at
    // checkout), so abandoned/unpaid card orders never eat inventory.
    await applyStockDeduction(order, source);

    // Award the referral credit now (and only now), with anti-fraud checks:
    // valid referrer, not self-referral, once per buyer.
    if (order.refCode) {
      try {
        const referrer = await storage.getUserByReferralCode(order.refCode);
        if (referrer && referrer.id !== order.userId) {
          const alreadyRewarded = await storage.hasReferralLogForBuyer(referrer.id, order.userId);
          if (!alreadyRewarded) {
            const creditSetting = await storage.getSetting("referral_credit_amount");
            const creditAmount = creditSetting ? Number(creditSetting) : DEFAULT_REFERRAL_CREDIT;
            await storage.addCredit(referrer.id, creditAmount);
            await storage.createReferralLog({
              referrerUserId: referrer.id,
              buyerUserId: order.userId,
              orderId: order.id,
              productName: order.productName,
              productPrice: order.productPrice,
              creditAwarded: creditAmount,
            });
            console.log(`Referral credit: +${creditAmount} to user ${referrer.id} for paid order ${order.id} (${source})`);
          }
        }
      } catch (refErr) {
        console.error("Referral credit error:", refErr);
      }
      await storage.clearOrderRef(ourOrderId);
    }

    // Award the BUYER a purchase bonus credit (separate from referral credit),
    // a fixed admin-configurable amount per real (card) purchase. 0 = disabled.
    // Only applies to card payments, not credit-paid orders, to avoid farming.
    // Chest-promo purchases are excluded — the discount is the reward.
    if (order.userId && !order.chestApplied) {
      try {
        const purchaseSetting = await storage.getSetting("purchase_credit_amount");
        const purchaseCredit = purchaseSetting ? Number(purchaseSetting) : 0;
        if (purchaseCredit > 0) {
          await storage.addCredit(order.userId, purchaseCredit);
          await storage.createPurchaseCreditLog({
            buyerUserId: order.userId,
            orderId: order.id,
            productName: order.productName,
            productPrice: order.productPrice,
            creditAwarded: purchaseCredit,
          });
          console.log(`Purchase credit: +${purchaseCredit} to buyer ${order.userId} for paid order ${order.id} (${source})`);
        }
      } catch (pcErr) {
        console.error("Purchase credit error:", pcErr);
      }
    }
    console.log(`[Flitt] order ${ourOrderId} settled via ${source}`);
    return true;
  }

  // Settle every order that shares one Flitt order_id (a multi-item cart pays
  // for several orders under a single payment). Idempotent per order.
  async function settlePaidOrderGroup(flittOrderId: string, source: string): Promise<number> {
    let settledCount = 0;
    try {
      const group = await storage.getOrdersByFlittOrderId(flittOrderId);
      for (const o of group) {
        const ok = await settlePaidOrder(o.id, source);
        if (ok) settledCount++;
      }
    } catch (err) {
      console.error("[Flitt] settlePaidOrderGroup error:", err);
    }
    return settledCount;
  }

  app.post("/api/flitt/callback", express.json(), async (req: any, res) => {
    // Log only non-sensitive fields for audit
    const { order_id, payment_id, order_status, response_status } = req.body || {};
    console.log("[Flitt callback]", { order_id, payment_id, order_status, response_status });

    // Always ack Flitt so it stops retrying; do processing best-effort below.
    res.sendStatus(200);

    try {
      // Verify the callback signature so forged "approved" callbacks can't grant
      // free referral credits or mark orders paid.
      if (!flittClient.isValidResponse(req.body)) {
        console.warn("[Flitt callback] invalid signature — ignored");
        return;
      }

      if (order_status !== "approved") return;

      // order_id is the exact Flitt order_id we stored on every order in this
      // payment, so settle the whole group (cart purchases pay for several).
      if (!order_id) return;
      await settlePaidOrderGroup(String(order_id), "callback");
    } catch (err) {
      console.error("[Flitt callback] processing error:", err);
    }
  });

  // Safety net: the buyer always returns to /payment/success after paying, but
  // Flitt's server callback may be delayed or undelivered. This endpoint lets the
  // success page confirm the payment by asking Flitt's API directly (authoritative,
  // unspoofable), then settles the order the same way the callback would.
  app.post("/api/flitt/confirm", async (req: any, res) => {
    try {
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = req.user?.claims?.sub;
      const ourOrderId = parseInt(String(req.body?.orderId), 10);
      if (!userId || !Number.isFinite(ourOrderId)) {
        return res.status(400).json({ message: "Invalid order" });
      }

      const order = await storage.getOrder(ourOrderId);
      if (!order || order.userId !== userId) {
        return res.status(404).json({ message: "Order not found" });
      }
      // Sum the purchase-bonus credit awarded for this payment (whole Flitt
      // group if it was a multi-item cart), so the success page can celebrate.
      const bonusForGroup = async (): Promise<number> => {
        try {
          let ids: number[] = [ourOrderId];
          if (order.flittOrderId) {
            const group = await storage.getOrdersByFlittOrderId(order.flittOrderId);
            if (group.length) ids = group.map((o: any) => o.id);
          }
          let total = await storage.getPurchaseCreditTotalForOrders(userId, ids);
          if (total > 0) return total;
          // Race guard: the Flitt callback may have claimed the settlement and
          // still be mid-write on the purchase-credit log. If a bonus is
          // configured, re-read briefly before reporting 0.
          const configured = Number((await storage.getSetting("purchase_credit_amount")) || 0);
          if (configured > 0) {
            for (let i = 0; i < 3 && total === 0; i++) {
              await new Promise((r) => setTimeout(r, 500));
              total = await storage.getPurchaseCreditTotalForOrders(userId, ids);
            }
          }
          return total;
        } catch {
          return 0;
        }
      };

      if (order.status !== "awaiting_payment") {
        // Already settled (e.g. by the Flitt callback) — still report the bonus
        // so the success page can show the celebration popup.
        return res.json({ settled: false, status: order.status, bonusAwarded: await bonusForGroup() });
      }
      if (!order.flittOrderId) {
        return res.json({ settled: false, status: order.status });
      }

      // Ask Flitt for the authoritative payment status of this order.
      const statusResp = await flittClient.Status({ order_id: order.flittOrderId });
      const r = statusResp?.response || statusResp;
      if (r?.order_status === "approved") {
        const settledCount = await settlePaidOrderGroup(order.flittOrderId, "confirm");
        return res.json({ settled: settledCount > 0, status: "pending", bonusAwarded: await bonusForGroup() });
      }
      return res.json({ settled: false, status: order.status, flittStatus: r?.order_status });
    } catch (err: any) {
      console.error("[Flitt confirm] error:", err?.message || err);
      return res.status(500).json({ message: "შეცდომა" });
    }
  });

  return httpServer;
}
