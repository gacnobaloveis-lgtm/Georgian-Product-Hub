import { pgTable, text, serial, numeric, timestamp, integer, varchar } from "drizzle-orm/pg-core";
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
  data: text("data"),
  mimeType: text("mime_type"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon"),
});

export const termsSections = pgTable("terms_sections", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertTermsSectionSchema = createInsertSchema(termsSections).omit({ id: true });
export type InsertTermsSection = z.infer<typeof insertTermsSectionSchema>;
export type TermsSection = typeof termsSections.$inferSelect;

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  message: text("message").notNull(),
  senderType: varchar("sender_type").notNull(), // 'user' | 'admin' | 'bot'
  createdAt: timestamp("created_at").defaultNow(),
  isRead: integer("is_read").default(0),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;

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
