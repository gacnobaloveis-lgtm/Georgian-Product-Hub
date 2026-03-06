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
  app.use(express.static(path.join(process.cwd(), "public")));

  app.use("/uploads", (req, res, next) => {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    next();
  }, express.static(uploadsDir));

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

        await sharp(file.buffer)
          .resize(800, null, { withoutEnlargement: true })
          .webp({ quality: 82 })
          .toFile(outputPath);

        const stats = fs.statSync(outputPath);
        const mediaItem = await storage.createMedia({
          filename,
          originalName: sanitizeFilename(file.originalname),
          path: `/uploads/${filename}`,
          size: String(stats.size),
        });
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
      res.json(usersList);
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
      res.json(updated);
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
      res.json(updated);
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
      const address = await storage.getSetting("contact_address") || "საქართველო, ბათუმი";
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

  return httpServer;
}
