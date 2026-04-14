import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import express from "express";
import cookieParser from "cookie-parser";
import https from "https";
import { pool } from "./db";
import webpush from "web-push";

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(cookieParser());

  app.get("/uploads/:filename", async (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);

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
        res.setHeader("Content-Type", row.mime_type || "image/webp");
        res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
        return res.send(row.data);
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
    if (!ADMIN_SECRET) {
      return res.status(500).json({ message: "ადმინ გასაღები არ არის კონფიგურირებული" });
    }
    if (secretKey === ADMIN_SECRET) {
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
      });
      res.status(201).json(product);
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
      if (req.body.soldCount !== undefined) updates.soldCount = Number(req.body.soldCount) || 0;
      if (req.body.viewCount !== undefined) updates.viewCount = Number(req.body.viewCount) || 0;
      if (req.body.albumImages !== undefined) {
        let albumArr: string[] = [];
        try { albumArr = JSON.parse(req.body.albumImages); } catch {}
        albumArr = albumArr.filter(img => typeof img === "string" && img.startsWith("/uploads/"));
        updates.albumImages = JSON.stringify(albumArr);
        updates.imageUrl = albumArr.length > 0 ? albumArr[0] : product.imageUrl;
      }

      const updated = await storage.updateProduct(id, updates);
      res.json(updated);
    } catch (err) {
      console.error("Product update error:", err);
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

  app.post(api.media.upload.path, requireAdmin, upload.array("files", 20), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "ფაილები არ არის ატვირთული" });
      }

      const results = [];
      for (const file of files) {
        const filename = `${randomUUID()}.webp`;
        const outputPath = path.join(uploadsDir, filename);

        const webpBuffer = await sharp(file.buffer)
          .resize(800, null, { withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();

        fs.writeFileSync(outputPath, webpBuffer);

        const mediaItem = await storage.createMedia({
          filename,
          originalName: sanitizeFilename(file.originalname),
          path: `/uploads/${filename}`,
          size: String(webpBuffer.length),
        });

        try {
          await pool.query(
            "UPDATE media SET data = $1, mime_type = $2 WHERE id = $3",
            [webpBuffer, "image/webp", mediaItem.id]
          );
        } catch (dbErr) {
          console.error("Failed to store image in DB:", dbErr);
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

  app.post("/api/orders", async (req: any, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { productId, productName, productPrice, fullName, city, address, phone, quantity, selectedColor } = req.body;
      if (!productId || !fullName || !city || !address || !phone) {
        return res.status(400).json({ message: "ყველა ველი აუცილებელია" });
      }

      const orderQty = quantity ? Number(quantity) : 1;

      if (selectedColor) {
        const prod = await storage.getProduct(Number(productId));
        if (prod) {
          let colorStock: Record<string, number> = {};
          try { colorStock = JSON.parse(prod.colorStock || "{}"); } catch {}
          const available = colorStock[selectedColor] ?? 0;
          if (available < orderQty) {
            return res.status(400).json({ message: `"${selectedColor}" ამოწურულია ან არასაკმარისია (მარაგში: ${available})` });
          }
          colorStock[selectedColor] = available - orderQty;
          await storage.updateProduct(prod.id, { colorStock: JSON.stringify(colorStock) });
        }
      }

      await storage.updateUserDetails(userId, {
        address: sanitizeString(String(address)),
        city: sanitizeString(String(city)),
        phone: sanitizeString(String(phone)),
      });

      const order = await storage.createOrder({
        userId,
        productId: Number(productId),
        productName: sanitizeString(String(productName)),
        productPrice: String(productPrice),
        quantity: orderQty,
        selectedColor: selectedColor ? sanitizeString(String(selectedColor)) : null,
        fullName: sanitizeString(String(fullName)),
        country: "საქართველო",
        city: sanitizeString(String(city)),
        address: sanitizeString(String(address)),
        phone: sanitizeString(String(phone)),
      });

      await storage.incrementSoldCount(Number(productId), orderQty);

      const refCode = req.cookies?.ref;
      if (refCode && typeof refCode === "string") {
        try {
          const referrer = await storage.getUserByReferralCode(refCode);
          if (referrer && referrer.id !== userId) {
            const alreadyRewarded = await storage.hasReferralLogForBuyer(referrer.id, userId);
            if (!alreadyRewarded) {
              const creditSetting = await storage.getSetting("referral_credit_amount");
              const creditAmount = creditSetting ? Number(creditSetting) : DEFAULT_REFERRAL_CREDIT;
              await storage.addCredit(referrer.id, creditAmount);
              await storage.createReferralLog({
                referrerUserId: referrer.id,
                buyerUserId: userId,
                orderId: order.id,
                productName: String(productName),
                productPrice: String(productPrice),
                creditAwarded: creditAmount,
              });
              console.log(`Referral credit: +${creditAmount} to user ${referrer.id} (code: ${refCode})`);
            } else {
              console.log(`Referral credit skipped: buyer ${userId} already rewarded referrer ${referrer.id}`);
            }
          }
        } catch (refErr) {
          console.error("Referral credit error:", refErr);
        }
        res.clearCookie("ref");
      }

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

      const { productId, productName, productPrice, quantity, selectedColor, fullName, city, address, phone } = req.body;
      if (!productId || !productName || !productPrice || !quantity || !fullName || !city || !address || !phone) {
        return res.status(400).json({ message: "ყველა ველი აუცილებელია" });
      }

      const orderQty = Math.max(1, Number(quantity));
      const totalPrice = Number(productPrice);

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

      const order = await storage.createOrder({
        userId,
        productId: Number(productId),
        productName: sanitizeString(String(productName)),
        productPrice: String(totalPrice),
        quantity: orderQty,
        selectedColor: selectedColor ? sanitizeString(String(selectedColor)) : null,
        fullName: sanitizeString(String(fullName)),
        country: "საქართველო",
        city: sanitizeString(String(city)),
        address: sanitizeString(String(address)),
        phone: sanitizeString(String(phone)),
        status: "pending",
      });

      await storage.incrementSoldCount(Number(productId), orderQty);

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

  app.patch("/api/admin/orders/:id/status", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id) || id <= 0) return res.status(400).json({ message: "არასწორი ID" });
      const { status } = req.body;
      if (!status || !["pending", "shipped", "completed", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "არასწორი სტატუსი" });
      }
      const updated = await storage.updateOrderStatus(id, status);
      if (!updated) return res.status(404).json({ message: "შეკვეთა ვერ მოიძებნა" });
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

  app.get("/api/credit-info", async (_req, res) => {
    try {
      const creditToGel = await storage.getSetting("credit_to_gel") || "1";
      res.json({ credit_to_gel: creditToGel });
    } catch (err) {
      console.error("Credit info error:", err);
      res.status(500).json({ message: "შეცდომა" });
    }
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

  app.get("/api/admin/settings", requireAdmin, async (_req, res) => {
    try {
      const creditAmount = await storage.getSetting("referral_credit_amount") || "5";
      const creditToGel = await storage.getSetting("credit_to_gel") || "1";
      res.json({ referral_credit_amount: creditAmount, credit_to_gel: creditToGel });
    } catch (err) {
      res.status(500).json({ message: "შეცდომა" });
    }
  });

  app.put("/api/admin/settings", requireAdminOnly, async (req, res) => {
    try {
      const { referral_credit_amount, credit_to_gel } = req.body;
      if (referral_credit_amount !== undefined) {
        const val = Number(referral_credit_amount);
        if (isNaN(val) || val < 0) {
          return res.status(400).json({ message: "არასწორი კრედიტის რაოდენობა" });
        }
        await storage.setSetting("referral_credit_amount", String(val));
      }
      if (credit_to_gel !== undefined) {
        const val = Number(credit_to_gel);
        if (isNaN(val) || val < 0) {
          return res.status(400).json({ message: "არასწორი კრედიტის კურსი" });
        }
        await storage.setSetting("credit_to_gel", String(val));
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
      const { phone, email, whatsapp, address, workHours, dayOff } = req.body;
      if (phone !== undefined) await storage.setSetting("contact_phone", phone);
      if (email !== undefined) await storage.setSetting("contact_email", email);
      if (whatsapp !== undefined) await storage.setSetting("contact_whatsapp", whatsapp);
      if (address !== undefined) await storage.setSetting("contact_address", address);
      if (workHours !== undefined) await storage.setSetting("contact_work_hours", workHours);
      if (dayOff !== undefined) await storage.setSetting("contact_day_off", dayOff);
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
      if (!product || !product.imageUrl) {
        return res.status(404).end();
      }
      const imgPath = product.imageUrl.startsWith("/")
        ? path.join(process.cwd(), "public", product.imageUrl)
        : product.imageUrl;

      if (!fs.existsSync(imgPath)) {
        return res.status(404).end();
      }

      const jpegBuffer = await sharp(imgPath)
        .resize(1200, 630, { fit: "cover", position: "center" })
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

      const description = product.description.substring(0, 200).replace(/\n/g, " ");

      const html = `<!DOCTYPE html>
<html lang="ka">
<head>
<meta charset="UTF-8">
<title>${product.name} — ₾${Number(price).toFixed(2)} | ${SITE_NAME}</title>
<meta name="description" content="${description}">
<meta property="og:type" content="product">
<meta property="og:title" content="${product.name} — ₾${Number(price).toFixed(2)}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${imageUrl}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:url" content="${productUrl}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:locale" content="ka_GE">
<meta property="product:price:amount" content="${Number(price).toFixed(2)}">
<meta property="product:price:currency" content="GEL">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${product.name} — ₾${Number(price).toFixed(2)}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${imageUrl}">
</head>
<body>
<h1>${product.name}</h1>
<p>${description}</p>
<img src="${imageUrl}" alt="${product.name}">
<p>₾${Number(price).toFixed(2)}</p>
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
      const title = req.body?.title?.trim();
      const content = req.body?.content?.trim();
      if (!title || !content) {
        return res.status(400).json({ message: "სათაური და შინაარსი აუცილებელია" });
      }
      const sortOrder = req.body?.sortOrder !== undefined ? Number(req.body.sortOrder) : 0;
      const section = await storage.createTermsSection({
        title: sanitizeString(title),
        content: sanitizeString(content),
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
        const title = req.body.title.trim();
        if (!title) return res.status(400).json({ message: "სათაური აუცილებელია" });
        updates.title = sanitizeString(title);
      }
      if (req.body?.content !== undefined) {
        const content = req.body.content.trim();
        if (!content) return res.status(400).json({ message: "შინაარსი აუცილებელია" });
        updates.content = sanitizeString(content);
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

      const existing = await storage.getChatMessages(userId);
      const userMsg = await storage.createChatMessage({
        userId,
        message: message.trim().substring(0, 1000),
        senderType: "user",
        isRead: 0,
      });

      // Auto bot reply only if this is the first user message
      const prevUserMsgs = existing.filter(m => m.senderType === "user");
      if (prevUserMsgs.length === 0) {
        await storage.createChatMessage({
          userId,
          message: "გმადლობთ შეკითხვისთვის! spiningebi.ge ადმინისტრატორი 24 საათში გიპასუხებთ.",
          senderType: "bot",
          isRead: 0,
        });
      }

      // Send push notification to admin subscribers
      try {
        const adminSubs = await storage.getAdminPushSubscriptions();
        const payload = JSON.stringify({
          title: "💬 ახალი შეტყობინება",
          body: message.trim().substring(0, 100),
          url: "/admin/chat",
        });
        for (const sub of adminSubs) {
          webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          ).catch(() => storage.removePushSubscription(sub.endpoint));
        }
      } catch (_) {}

      res.json(userMsg);
    } catch (err) {
      console.error("Chat send error:", err);
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
              payload
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
          payload
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
        const allSubs = await storage.getAllPushSubscriptions();

        // Build absolute image URL so Android/Chrome can fetch it for the rich notification
        const siteOrigin = process.env.SITE_URL ||
          `${req.protocol}://${req.get("host")}`;
        const absoluteImage = imageUrl
          ? (imageUrl.startsWith("http") ? imageUrl : `${siteOrigin}${imageUrl}`)
          : undefined;

        // Also build absolute icon using the site's PWA icon
        const absoluteIcon = `${siteOrigin}/pwa-icon.png`;

        const payload = JSON.stringify({
          title: title.trim(),
          body: body.trim().substring(0, 120),
          url: url || "/",
          image: absoluteImage,
          icon: absoluteIcon,
          tag: `broadcast-${broadcast.id}`,
        });
        console.log(`[broadcast] pushing to ${allSubs.length} subs, image: ${absoluteImage}`);
        for (const sub of allSubs) {
          webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          ).catch(() => storage.removePushSubscription(sub.endpoint));
        }
      } catch (_) {}

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

  // TBC Bank Payment
  const TBC_BASE_URL = "https://api.tbcbank.ge";

  async function tbcRequest(method: string, path: string, body?: object, token?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const bodyStr = body ? JSON.stringify(body) : undefined;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "apikey": process.env.TBC_API_KEY || "",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      if (bodyStr) headers["Content-Length"] = Buffer.byteLength(bodyStr).toString();

      const url = new URL(TBC_BASE_URL + path);
      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method,
        headers,
      };

      console.log(`[TBC request] ${method} ${path}`);
      const req = https.request(options, (resp) => {
        let data = "";
        resp.on("data", (chunk) => (data += chunk));
        resp.on("end", () => {
          console.log(`[TBC response] ${resp.statusCode}:`, data.substring(0, 300));
          try { resolve(JSON.parse(data)); } catch { resolve(data); }
        });
      });
      req.on("error", reject);
      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  }

  async function tbcGetToken(): Promise<string> {
    const apiKey = process.env.TBC_API_KEY || "";
    const clientSecret = process.env.TBC_CLIENT_SECRET || "";
    const body = `grant_type=client_credentials&client_id=${encodeURIComponent(apiKey)}&client_secret=${encodeURIComponent(clientSecret)}`;
    return new Promise((resolve, reject) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body).toString(),
      };
      const url = new URL(TBC_BASE_URL + "/v1/tbc/protocol/openid-connect/token");
      const req = https.request({ hostname: url.hostname, path: url.pathname, method: "POST", headers }, (resp) => {
        let data = "";
        resp.on("data", (c) => (data += c));
        resp.on("end", () => {
          console.log("[TBC token] status:", resp.statusCode, "body:", data);
          try {
            const parsed = JSON.parse(data);
            if (parsed.access_token) resolve(parsed.access_token);
            else reject(new Error(`TBC token error (${resp.statusCode}): ${data}`));
          } catch { reject(new Error(`TBC token parse error: ${data}`)); }
        });
      });
      req.on("error", reject);
      req.write(body);
      req.end();
    });
  }

  app.post("/api/pay", async (req: any, res) => {
    try {
      const { amount, description, orderId, returnUrl } = req.body;

      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        return res.status(400).json({ message: "თანხა აუცილებელია" });
      }

      const appUrl = process.env.APP_URL || "https://spiningebi.ge";
      const successUrl = returnUrl || `${appUrl}/payment/success`;
      const failUrl = `${appUrl}/payment/fail`;

      const token = await tbcGetToken();

      const payload = {
        amount: {
          currency: "GEL",
          total: Math.round(Number(amount) * 100),
          subTotal: Math.round(Number(amount) * 100),
          tax: 0,
          shipping: 0,
        },
        returnUrl: successUrl,
        extra: description || "spiningebi.ge შეკვეთა",
        expirationMinutes: 10,
        methods: [0],
        installmentProducts: [],
        callbackUrl: `${appUrl}/api/pay/callback`,
        preAuth: false,
        language: "KA",
        merchantPaymentId: orderId ? String(orderId) : randomUUID(),
        skipInfoMessage: false,
        saveCard: false,
        saveCardToDate: null,
      };

      const result = await tbcRequest("POST", "/v1/tbc/checkout/payments", payload, token);

      if (result.payId && result.links) {
        const payLink = result.links.find((l: any) => l.rel === "approval_url" || l.rel === "pay");
        const href = payLink?.href || result.links[0]?.href;
        return res.json({ payId: result.payId, payUrl: href });
      }

      console.error("TBC pay response:", JSON.stringify(result));
      return res.status(502).json({ message: "გადახდის ბმულის მიღება ვერ მოხერხდა", detail: result });
    } catch (err: any) {
      console.error("TBC pay error:", err);
      return res.status(500).json({ message: "გადახდის შეცდომა", detail: err.message });
    }
  });

  app.get("/api/pay/status/:payId", async (req, res) => {
    try {
      const { payId } = req.params;
      const token = await tbcGetToken();
      const result = await tbcRequest("GET", `/v1/tbc/checkout/payments/${payId}`, undefined, token);
      return res.json(result);
    } catch (err: any) {
      console.error("TBC status error:", err);
      return res.status(500).json({ message: "სტატუსის შეცდომა", detail: err.message });
    }
  });

  app.post("/api/pay/callback", express.json(), (req, res) => {
    console.log("TBC callback:", JSON.stringify(req.body));
    res.sendStatus(200);
  });

  return httpServer;
}
