import { pgTable, text, serial, numeric, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  originalPrice: numeric("original_price", { precision: 10, scale: 2 }).notNull(),
  discountPrice: numeric("discount_price", { precision: 10, scale: 2 }),
  shippingPrice: numeric("shipping_price", { precision: 10, scale: 2 }),
  stock: integer("stock").notNull().default(0),
  colorStock: text("color_stock").default("{}"),
  youtubeUrl: text("youtube_url"),
  imageUrl: text("image_url"),
  albumImages: text("album_images").default("[]"),
  categoryId: integer("category_id"),
  soldCount: integer("sold_count").notNull().default(0),
  viewCount: integer("view_count").notNull().default(0),
});

export const media = pgTable("media", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  path: text("path").notNull(),
  size: numeric("size"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon"),
});

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertMediaSchema = createInsertSchema(media).omit({ id: true, createdAt: true });

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertMedia = z.infer<typeof insertMediaSchema>;
export type Media = typeof media.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type CreateProductRequest = InsertProduct;
export type ProductResponse = Product;
export type MediaResponse = Media;

export { sessions, users, orders, referralLogs, siteSettings } from "./models/auth";
export type { User, UpsertUser, Order, InsertOrder, ReferralLog, SiteSetting } from "./models/auth";
