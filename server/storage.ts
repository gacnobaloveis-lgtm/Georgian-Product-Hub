import { db } from "./db";
import { products, media, categories, termsSections, chatMessages, pushSubscriptions, type InsertProduct, type Product, type InsertMedia, type Media, type InsertCategory, type Category, type InsertTermsSection, type TermsSection, type InsertChatMessage, type ChatMessage, type PushSubscription } from "@shared/schema";
import { users, orders, referralLogs, siteSettings, pageVisits, type User, type Order, type InsertOrder, type ReferralLog, type InsertPageVisit } from "@shared/models/auth";
import { eq, desc, sql, lt, asc } from "drizzle-orm";

export interface IStorage {
  getProducts(): Promise<Product[]>;
  getProductsByCategory(categoryId: number): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<void>;
  getMedia(): Promise<Media[]>;
  getMediaItem(id: number): Promise<Media | undefined>;
  createMedia(item: InsertMedia): Promise<Media>;
  deleteMedia(id: number): Promise<void>;
  getCategories(): Promise<Category[]>;
  createCategory(cat: InsertCategory): Promise<Category>;
  updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<void>;
  getUsers(): Promise<User[]>;
  updateUserDetails(id: string, details: { address?: string; city?: string; phone?: string; firstName?: string; lastName?: string; email?: string }): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  createOrder(order: InsertOrder): Promise<Order>;
  getOrders(): Promise<Order[]>;
  getOrdersByUser(userId: string): Promise<Order[]>;
  updateOrderStatus(orderId: number, status: string): Promise<Order | undefined>;
  deleteOrdersOlderThan(date: Date): Promise<number>;
  incrementSoldCount(productId: number, qty: number): Promise<void>;
  incrementViewCount(productId: number): Promise<void>;
  getUserByReferralCode(code: string): Promise<User | undefined>;
  addCredit(userId: string, amount: number): Promise<void>;
  deductCredit(userId: string, amount: number): Promise<boolean>;
  setReferralCode(userId: string, code: string): Promise<void>;
  setUserRole(userId: string, role: string): Promise<User | undefined>;
  getUser(id: string): Promise<User | undefined>;
  createReferralLog(log: { referrerUserId: string; buyerUserId: string; orderId: number; productName: string; productPrice: string; creditAwarded: number }): Promise<ReferralLog>;
  getReferralLogs(): Promise<ReferralLog[]>;
  hasReferralLogForBuyer(referrerUserId: string, buyerUserId: string): Promise<boolean>;
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
  recordPageVisit(visit: InsertPageVisit): Promise<void>;
  getAnalytics(days: number): Promise<{ domain: string; count: number }[]>;
  getAnalyticsTotal(days: number): Promise<number>;
  getTermsSections(): Promise<TermsSection[]>;
  createTermsSection(section: InsertTermsSection): Promise<TermsSection>;
  updateTermsSection(id: number, updates: Partial<InsertTermsSection>): Promise<TermsSection | undefined>;
  deleteTermsSection(id: number): Promise<void>;
  getChatMessages(userId: string): Promise<ChatMessage[]>;
  createChatMessage(msg: InsertChatMessage): Promise<ChatMessage>;
  getAllChatConversations(): Promise<{ userId: string; firstName: string | null; lastName: string | null; lastMessage: string; lastAt: Date | null; unread: number }[]>;
  markChatRead(userId: string): Promise<void>;
  getUnreadCountForUser(userId: string): Promise<number>;
  markAdminMessagesRead(userId: string): Promise<void>;
  savePushSubscription(userId: string, endpoint: string, p256dh: string, auth: string): Promise<void>;
  removePushSubscription(endpoint: string): Promise<void>;
  getAdminPushSubscriptions(): Promise<PushSubscription[]>;
}

export class DatabaseStorage implements IStorage {
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(desc(products.soldCount));
  }

  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.categoryId, categoryId));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    return updated;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async getMedia(): Promise<Media[]> {
    return await db.select().from(media).orderBy(media.createdAt);
  }

  async getMediaItem(id: number): Promise<Media | undefined> {
    const [item] = await db.select().from(media).where(eq(media.id, id));
    return item;
  }

  async createMedia(item: InsertMedia): Promise<Media> {
    const [newItem] = await db.insert(media).values(item).returning();
    return newItem;
  }

  async deleteMedia(id: number): Promise<void> {
    await db.delete(media).where(eq(media.id, id));
  }

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async createCategory(cat: InsertCategory): Promise<Category> {
    const [newCat] = await db.insert(categories).values(cat).returning();
    return newCat;
  }

  async updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updated] = await db.update(categories).set(updates).where(eq(categories.id, id)).returning();
    return updated;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }

  async updateUserDetails(id: string, details: { address?: string; city?: string; phone?: string; firstName?: string; lastName?: string; email?: string }): Promise<User | undefined> {
    const [updated] = await db.update(users).set({ ...details, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(orders).where(eq(orders.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async getOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(orders.createdAt);
  }

  async incrementSoldCount(productId: number, qty: number): Promise<void> {
    await db.update(products)
      .set({ soldCount: sql`COALESCE(${products.soldCount}, 0) + ${qty}` })
      .where(eq(products.id, productId));
  }

  async incrementViewCount(productId: number): Promise<void> {
    await db.update(products)
      .set({ viewCount: sql`COALESCE(${products.viewCount}, 0) + 1` })
      .where(eq(products.id, productId));
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(orders.createdAt);
  }

  async updateOrderStatus(orderId: number, status: string): Promise<Order | undefined> {
    const [updated] = await db.update(orders).set({ status }).where(eq(orders.id, orderId)).returning();
    return updated;
  }

  async deleteOrdersOlderThan(date: Date): Promise<number> {
    const deleted = await db.delete(orders).where(lt(orders.createdAt, date)).returning();
    return deleted.length;
  }

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.referralCode, code));
    return user;
  }

  async addCredit(userId: string, amount: number): Promise<void> {
    await db.update(users)
      .set({ myCredit: sql`COALESCE(${users.myCredit}, 0) + ${amount}` })
      .where(eq(users.id, userId));
  }

  async deductCredit(userId: string, amount: number): Promise<boolean> {
    const [user] = await db.select({ myCredit: users.myCredit }).from(users).where(eq(users.id, userId));
    if (!user || Number(user.myCredit || 0) < amount) return false;
    await db.update(users)
      .set({ myCredit: sql`COALESCE(${users.myCredit}, 0) - ${amount}` })
      .where(eq(users.id, userId));
    return true;
  }

  async setReferralCode(userId: string, code: string): Promise<void> {
    await db.update(users)
      .set({ referralCode: code })
      .where(eq(users.id, userId));
  }

  async setUserRole(userId: string, role: string): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createReferralLog(log: { referrerUserId: string; buyerUserId: string; orderId: number; productName: string; productPrice: string; creditAwarded: number }): Promise<ReferralLog> {
    const [entry] = await db.insert(referralLogs).values({
      referrerUserId: log.referrerUserId,
      buyerUserId: log.buyerUserId,
      orderId: log.orderId,
      productName: log.productName,
      productPrice: log.productPrice,
      creditAwarded: String(log.creditAwarded),
    }).returning();
    return entry;
  }

  async getReferralLogs(): Promise<ReferralLog[]> {
    return await db.select().from(referralLogs).orderBy(desc(referralLogs.createdAt));
  }

  async hasReferralLogForBuyer(referrerUserId: string, buyerUserId: string): Promise<boolean> {
    const [existing] = await db.select({ id: referralLogs.id })
      .from(referralLogs)
      .where(sql`${referralLogs.referrerUserId} = ${referrerUserId} AND ${referralLogs.buyerUserId} = ${buyerUserId}`)
      .limit(1);
    return !!existing;
  }

  async getSetting(key: string): Promise<string | null> {
    const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    return row?.value ?? null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await db.insert(siteSettings).values({ key, value }).onConflictDoUpdate({ target: siteSettings.key, set: { value } });
  }

  async recordPageVisit(visit: InsertPageVisit): Promise<void> {
    await db.insert(pageVisits).values(visit);
  }

  async getAnalytics(days: number): Promise<{ domain: string; count: number }[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await db
      .select({
        domain: sql<string>`COALESCE(${pageVisits.referrerDomain}, 'პირდაპირი შესვლა')`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(pageVisits)
      .where(sql`${pageVisits.createdAt} >= ${since}`)
      .groupBy(sql`COALESCE(${pageVisits.referrerDomain}, 'პირდაპირი შესვლა')`)
      .orderBy(sql`COUNT(*) DESC`);
    return rows;
  }

  async getAnalyticsTotal(days: number): Promise<number> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [row] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(pageVisits)
      .where(sql`${pageVisits.createdAt} >= ${since}`);
    return row?.count ?? 0;
  }

  async getTermsSections(): Promise<TermsSection[]> {
    return await db.select().from(termsSections).orderBy(asc(termsSections.sortOrder));
  }

  async createTermsSection(section: InsertTermsSection): Promise<TermsSection> {
    const [newSection] = await db.insert(termsSections).values(section).returning();
    return newSection;
  }

  async updateTermsSection(id: number, updates: Partial<InsertTermsSection>): Promise<TermsSection | undefined> {
    const [updated] = await db.update(termsSections).set(updates).where(eq(termsSections.id, id)).returning();
    return updated;
  }

  async deleteTermsSection(id: number): Promise<void> {
    await db.delete(termsSections).where(eq(termsSections.id, id));
  }

  async getChatMessages(userId: string): Promise<ChatMessage[]> {
    return await db.select().from(chatMessages).where(eq(chatMessages.userId, userId)).orderBy(asc(chatMessages.createdAt));
  }

  async createChatMessage(msg: InsertChatMessage): Promise<ChatMessage> {
    const [created] = await db.insert(chatMessages).values(msg).returning();
    return created;
  }

  async getAllChatConversations(): Promise<{ userId: string; firstName: string | null; lastName: string | null; lastMessage: string; lastAt: Date | null; unread: number }[]> {
    const result = await db.execute(sql`
      SELECT
        cm.user_id,
        u.first_name,
        u.last_name,
        (SELECT message FROM chat_messages WHERE user_id = cm.user_id ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT created_at FROM chat_messages WHERE user_id = cm.user_id ORDER BY created_at DESC LIMIT 1) AS last_at,
        (SELECT COUNT(*) FROM chat_messages WHERE user_id = cm.user_id AND sender_type = 'user' AND is_read = 0) AS unread
      FROM (SELECT DISTINCT user_id FROM chat_messages) cm
      LEFT JOIN users u ON u.id = cm.user_id
      ORDER BY last_at DESC
    `);
    return (result.rows as any[]).map(r => ({
      userId: r.user_id,
      firstName: r.first_name,
      lastName: r.last_name,
      lastMessage: r.last_message,
      lastAt: r.last_at,
      unread: Number(r.unread),
    }));
  }

  async markChatRead(userId: string): Promise<void> {
    await db.execute(sql`UPDATE chat_messages SET is_read = 1 WHERE user_id = ${userId} AND sender_type = 'user'`);
  }

  async getUnreadCountForUser(userId: string): Promise<number> {
    const result = await db.execute(sql`
      SELECT COUNT(*) AS cnt FROM chat_messages
      WHERE user_id = ${userId} AND sender_type IN ('admin', 'bot') AND is_read = 0
    `);
    return Number((result.rows[0] as any)?.cnt ?? 0);
  }

  async markAdminMessagesRead(userId: string): Promise<void> {
    await db.execute(sql`UPDATE chat_messages SET is_read = 1 WHERE user_id = ${userId} AND sender_type IN ('admin', 'bot')`);
  }

  async savePushSubscription(userId: string, endpoint: string, p256dh: string, auth: string): Promise<void> {
    await db.execute(sql`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
      VALUES (${userId}, ${endpoint}, ${p256dh}, ${auth})
      ON CONFLICT (endpoint) DO UPDATE SET user_id = ${userId}, p256dh = ${p256dh}, auth = ${auth}
    `);
  }

  async removePushSubscription(endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }

  async getAdminPushSubscriptions(): Promise<PushSubscription[]> {
    const result = await db.execute(sql`
      SELECT ps.* FROM push_subscriptions ps
      JOIN users u ON u.id = ps.user_id
      WHERE u.role = 'admin'
    `);
    return (result.rows as any[]).map(r => ({
      id: r.id,
      userId: r.user_id,
      endpoint: r.endpoint,
      p256dh: r.p256dh,
      auth: r.auth,
      createdAt: r.created_at,
    }));
  }
}

export const storage = new DatabaseStorage();
