import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar, serial, integer, text, numeric } from "drizzle-orm/pg-core";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  address: varchar("address"),
  city: varchar("city"),
  phone: varchar("phone"),
  referralCode: varchar("referral_code").unique(),
  myCredit: numeric("my_credit", { precision: 10, scale: 2 }).default("0"),
  role: varchar("role").default("user"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  productPrice: varchar("product_price").notNull(),
  quantity: integer("quantity").notNull().default(1),
  selectedColor: varchar("selected_color"),
  fullName: varchar("full_name").notNull(),
  country: varchar("country").notNull().default("საქართველო"),
  city: varchar("city").notNull(),
  address: text("address").notNull(),
  phone: varchar("phone").notNull(),
  status: varchar("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const referralLogs = pgTable("referral_logs", {
  id: serial("id").primaryKey(),
  referrerUserId: varchar("referrer_user_id").notNull(),
  buyerUserId: varchar("buyer_user_id").notNull(),
  orderId: integer("order_id").notNull(),
  productName: text("product_name").notNull(),
  productPrice: varchar("product_price").notNull(),
  creditAwarded: numeric("credit_awarded", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const siteSettings = pgTable("site_settings", {
  key: varchar("key").primaryKey(),
  value: varchar("value").notNull(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type ReferralLog = typeof referralLogs.$inferSelect;
export type SiteSetting = typeof siteSettings.$inferSelect;

export const pageVisits = pgTable("page_visits", {
  id: serial("id").primaryKey(),
  referrerDomain: varchar("referrer_domain"),
  referrerUrl: text("referrer_url"),
  pagePath: text("page_path").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_page_visits_created").on(table.createdAt), index("IDX_page_visits_domain").on(table.referrerDomain)]);

export type PageVisit = typeof pageVisits.$inferSelect;
export type InsertPageVisit = typeof pageVisits.$inferInsert;
