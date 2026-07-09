import { db } from "./db";
import { products, media, categories, termsSections, chatMessages, pushSubscriptions, broadcasts, broadcastReads, stockNotifications, productInterests, type InsertProduct, type Product, type InsertMedia, type Media, type InsertCategory, type Category, type InsertTermsSection, type TermsSection, type InsertChatMessage, type ChatMessage, type PushSubscription, type Broadcast, type StockNotification } from "@shared/schema";
import { users, orders, referralLogs, purchaseCreditLogs, siteSettings, pageVisits, type User, type Order, type InsertOrder, type ReferralLog, type PurchaseCreditLog, type InsertPageVisit } from "@shared/models/auth";
import { eq, desc, sql, lt, asc, and, isNull, ne } from "drizzle-orm";

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
  getOrder(orderId: number): Promise<Order | undefined>;
  clearOrderRef(orderId: number): Promise<void>;
  setFlittOrderId(orderId: number, flittOrderId: string): Promise<void>;
  getOrdersByFlittOrderId(flittOrderId: string): Promise<Order[]>;
  bindFlittOrderId(orderId: number, flittOrderId: string): Promise<boolean>;
  clearFlittOrderId(orderId: number): Promise<void>;
  markOrderPaidIfAwaiting(orderId: number): Promise<boolean>;
  markStockDeductedIfNot(orderId: number): Promise<boolean>;
  getOrdersByUser(userId: string): Promise<Order[]>;
  getPurchasedQtyForLimit(productId: number, userId: string, phone: string): Promise<number>;
  createOrderWithLimit(order: InsertOrder, limit: number): Promise<{ order?: Order; already: number }>;
  updateOrderStatus(orderId: number, status: string): Promise<Order | undefined>;
  deleteOrdersOlderThan(date: Date): Promise<number>;
  deleteOrder(orderId: number): Promise<boolean>;
  deleteAllOrders(): Promise<number>;
  incrementSoldCount(productId: number, qty: number): Promise<void>;
  decrementColorStock(productId: number, color: string, qty: number): Promise<void>;
  decrementStock(productId: number, qty: number): Promise<void>;
  incrementViewCount(productId: number): Promise<void>;
  incrementShareCount(productId: number): Promise<void>;
  getUserByReferralCode(code: string): Promise<User | undefined>;
  addCredit(userId: string, amount: number): Promise<void>;
  deductCredit(userId: string, amount: number): Promise<boolean>;
  setReferralCode(userId: string, code: string): Promise<void>;
  setUserRole(userId: string, role: string): Promise<User | undefined>;
  getUser(id: string): Promise<User | undefined>;
  createReferralLog(log: { referrerUserId: string; buyerUserId: string; orderId: number; productName: string; productPrice: string; creditAwarded: number }): Promise<ReferralLog>;
  createPurchaseCreditLog(log: { buyerUserId: string; orderId: number; productName: string; productPrice: string; creditAwarded: number }): Promise<PurchaseCreditLog>;
  getPurchaseCreditLogs(): Promise<PurchaseCreditLog[]>;
  getReferralLogs(): Promise<ReferralLog[]>;
  hasReferralLogForBuyer(referrerUserId: string, buyerUserId: string): Promise<boolean>;
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
  recordPageVisit(visit: InsertPageVisit): Promise<void>;
  getAnalytics(days: number): Promise<{ domain: string; count: number }[]>;
  getAnalyticsTotal(days: number): Promise<number>;
  recordProductInterest(productId: number, productName: string): Promise<void>;
  getProductInterests(): Promise<{ productId: number; name: string; categoryName: string | null; count: number; lastAt: Date | null }[]>;
  clearProductInterests(): Promise<void>;
  getTermsSections(): Promise<TermsSection[]>;
  createTermsSection(section: InsertTermsSection): Promise<TermsSection>;
  updateTermsSection(id: number, updates: Partial<InsertTermsSection>): Promise<TermsSection | undefined>;
  deleteTermsSection(id: number): Promise<void>;
  getChatMessages(userId: string): Promise<ChatMessage[]>;
  createChatMessage(msg: InsertChatMessage): Promise<ChatMessage>;
  getAllChatConversations(): Promise<{ userId: string; firstName: string | null; lastName: string | null; lastMessage: string; lastAt: Date | null; unread: number }[]>;
  getAdminKnowledgeBase(limit?: number): Promise<{ question: string | null; answer: string }[]>;
  markChatRead(userId: string): Promise<void>;
  getUnreadCountForUser(userId: string): Promise<number>;
  markAdminMessagesRead(userId: string): Promise<void>;
  savePushSubscription(userId: string, endpoint: string, p256dh: string, auth: string): Promise<void>;
  removePushSubscription(endpoint: string): Promise<void>;
  getAdminPushSubscriptions(): Promise<PushSubscription[]>;
  getAllPushSubscriptions(): Promise<PushSubscription[]>;
  getUserPushSubscriptions(userId: string): Promise<PushSubscription[]>;
  createBroadcast(data: { title: string; body: string; url?: string; imageUrl?: string }): Promise<Broadcast>;
  getBroadcasts(): Promise<Broadcast[]>;
  deleteBroadcast(id: number): Promise<void>;
  getUnreadBroadcastsForUser(userId: string): Promise<Broadcast[]>;
  markBroadcastRead(broadcastId: number, userId: string): Promise<void>;
  createStockNotification(data: { productId: number; email: string; userId?: string | null; selectedColor?: string | null }): Promise<StockNotification>;
  getPendingStockNotifications(productId: number): Promise<StockNotification[]>;
  markStockNotificationsSent(ids: number[]): Promise<void>;
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

  // Only real orders. Card orders sit in "awaiting_payment" from the moment the
  // checkout form is submitted until Flitt confirms the payment, so an abandoned
  // checkout would otherwise show up here as a phantom order. Hide those until
  // they are actually paid (settlePaidOrder flips them to "pending").
  async getOrders(): Promise<Order[]> {
    return await db.select().from(orders)
      .where(ne(orders.status, "awaiting_payment"))
      .orderBy(orders.createdAt);
  }

  async getOrder(orderId: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    return order;
  }

  async clearOrderRef(orderId: number): Promise<void> {
    await db.update(orders).set({ refCode: null }).where(eq(orders.id, orderId));
  }

  async setFlittOrderId(orderId: number, flittOrderId: string): Promise<void> {
    await db.update(orders).set({ flittOrderId }).where(eq(orders.id, orderId));
  }

  async getOrdersByFlittOrderId(flittOrderId: string): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.flittOrderId, flittOrderId));
  }

  // Atomically claim an order for one Flitt payment: only binds if the order is
  // still awaiting and not already bound to another in-flight payment. Prevents
  // a second/parallel pay request from rebinding an order and orphaning the
  // first payment's settlement. Returns true only for the caller that bound it.
  async bindFlittOrderId(orderId: number, flittOrderId: string): Promise<boolean> {
    const rows = await db
      .update(orders)
      .set({ flittOrderId })
      .where(and(
        eq(orders.id, orderId),
        eq(orders.status, "awaiting_payment"),
        isNull(orders.flittOrderId),
      ))
      .returning({ id: orders.id });
    return rows.length > 0;
  }

  async clearFlittOrderId(orderId: number): Promise<void> {
    await db.update(orders).set({ flittOrderId: null }).where(eq(orders.id, orderId));
  }

  // Atomic, race-safe transition: flips an order from "awaiting_payment" to
  // "pending" only if it is still awaiting. Returns true only for the single
  // caller that actually performed the transition, so callback + confirm can
  // both run without double-crediting or double-counting the sale.
  async markOrderPaidIfAwaiting(orderId: number): Promise<boolean> {
    const rows = await db
      .update(orders)
      .set({ status: "pending" })
      .where(and(eq(orders.id, orderId), eq(orders.status, "awaiting_payment")))
      .returning({ id: orders.id });
    return rows.length > 0;
  }

  // Atomically claim stock deduction for an order. Flips stock_deducted
  // false → true and returns true only for the single caller that won the
  // claim, so a sale's stock is reduced exactly once no matter which path
  // realizes it (Flitt settlement, credit purchase, or admin marking shipped).
  async markStockDeductedIfNot(orderId: number): Promise<boolean> {
    const rows = await db
      .update(orders)
      .set({ stockDeducted: true })
      .where(and(eq(orders.id, orderId), eq(orders.stockDeducted, false)))
      .returning({ id: orders.id });
    return rows.length > 0;
  }

  async incrementSoldCount(productId: number, qty: number): Promise<void> {
    await db.update(products)
      .set({ soldCount: sql`COALESCE(${products.soldCount}, 0) + ${qty}` })
      .where(eq(products.id, productId));
  }

  // Reduce the stock of a single color (clamped at 0). colorStock is a JSON map
  // {color: count} stored as text, so we read-modify-write the current product.
  // Called only when a sale becomes real (card payment confirmed / credit paid).
  async decrementColorStock(productId: number, color: string, qty: number): Promise<void> {
    const [prod] = await db.select().from(products).where(eq(products.id, productId));
    if (!prod) return;
    let colorStock: Record<string, number> = {};
    try { colorStock = JSON.parse(prod.colorStock || "{}"); } catch {}
    const available = colorStock[color] ?? 0;
    colorStock[color] = Math.max(0, available - qty);
    await db.update(products)
      .set({ colorStock: JSON.stringify(colorStock) })
      .where(eq(products.id, productId));
  }

  // Reduce the general (color-less) stock atomically, clamped at 0. Used for
  // products without color variants, where the displayed "მარაგი" is the
  // products.stock integer. Called only when a sale becomes real.
  async decrementStock(productId: number, qty: number): Promise<void> {
    await db.update(products)
      .set({ stock: sql`GREATEST(0, COALESCE(${products.stock}, 0) - ${qty})` })
      .where(eq(products.id, productId));
  }

  async incrementViewCount(productId: number): Promise<void> {
    await db.update(products)
      .set({ viewCount: sql`COALESCE(${products.viewCount}, 0) + 1` })
      .where(eq(products.id, productId));
  }

  async incrementShareCount(productId: number): Promise<void> {
    await db.update(products)
      .set({ shareCount: sql`COALESCE(${products.shareCount}, 0) + 1` })
      .where(eq(products.id, productId));
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    // Hide abandoned/unpaid card checkouts (see getOrders) from the buyer too.
    return await db.select().from(orders)
      .where(and(eq(orders.userId, userId), ne(orders.status, "awaiting_payment")))
      .orderBy(orders.createdAt);
  }

  // Counts how many units of a product a customer has already ordered, matched
  // by user account OR by (normalized) phone number, so the same person can't
  // dodge a per-customer purchase limit by registering another account with the
  // same phone. Cancelled orders don't count; unpaid card checkouts only count
  // for 48h so an abandoned checkout doesn't consume the limit forever.
  private static limitPhoneKey(phone: string): string | null {
    const digits = String(phone || "").replace(/\D/g, "");
    const last9 = digits.slice(-9);
    // Georgian numbers are 9 digits — only a full 9-digit tail counts as a
    // reliable identity; anything shorter falls back to account-only matching.
    return last9.length === 9 ? last9 : null;
  }

  private static limitConditions(productId: number, userId: string, phone: string) {
    const last9 = DatabaseStorage.limitPhoneKey(phone);
    const identityCond = last9
      ? sql`(${orders.userId} = ${userId} OR RIGHT(regexp_replace(${orders.phone}, '\\D', '', 'g'), 9) = ${last9})`
      : sql`${orders.userId} = ${userId}`;
    return and(
      eq(orders.productId, productId),
      sql`(${orders.status} NOT IN ('awaiting_payment', 'cancelled') OR (${orders.status} = 'awaiting_payment' AND ${orders.createdAt} > NOW() - INTERVAL '48 hours'))`,
      identityCond,
    );
  }

  async getPurchasedQtyForLimit(productId: number, userId: string, phone: string): Promise<number> {
    const [row] = await db
      .select({ total: sql<number>`COALESCE(SUM(${orders.quantity}), 0)` })
      .from(orders)
      .where(DatabaseStorage.limitConditions(productId, userId, phone));
    return Number(row?.total || 0);
  }

  // Race-safe order creation under a per-product purchase limit: takes
  // transaction-scoped advisory locks on (product, account) and (product,
  // phone) so two parallel checkouts can't both pass the count check and
  // overshoot the cap. Returns { already } without an order when over limit.
  async createOrderWithLimit(order: InsertOrder, limit: number): Promise<{ order?: Order; already: number }> {
    return await db.transaction(async (tx) => {
      const userKey = `plimit:${order.productId}:u:${order.userId}`;
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${userKey}))`);
      const last9 = DatabaseStorage.limitPhoneKey(String(order.phone || ""));
      if (last9) {
        const phoneKey = `plimit:${order.productId}:p:${last9}`;
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${phoneKey}))`);
      }
      const [row] = await tx
        .select({ total: sql<number>`COALESCE(SUM(${orders.quantity}), 0)` })
        .from(orders)
        .where(DatabaseStorage.limitConditions(Number(order.productId), String(order.userId), String(order.phone || "")));
      const already = Number(row?.total || 0);
      const qty = Number(order.quantity || 1);
      if (already + qty > limit) {
        return { already };
      }
      const [newOrder] = await tx.insert(orders).values(order).returning();
      return { order: newOrder, already };
    });
  }

  async updateOrderStatus(orderId: number, status: string): Promise<Order | undefined> {
    const [updated] = await db.update(orders).set({ status }).where(eq(orders.id, orderId)).returning();
    return updated;
  }

  async deleteOrdersOlderThan(date: Date): Promise<number> {
    const deleted = await db.delete(orders).where(lt(orders.createdAt, date)).returning();
    return deleted.length;
  }

  async deleteOrder(orderId: number): Promise<boolean> {
    const deleted = await db.delete(orders).where(eq(orders.id, orderId)).returning();
    return deleted.length > 0;
  }

  async deleteAllOrders(): Promise<number> {
    const deleted = await db.delete(orders).returning();
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

  async createPurchaseCreditLog(log: { buyerUserId: string; orderId: number; productName: string; productPrice: string; creditAwarded: number }): Promise<PurchaseCreditLog> {
    const [entry] = await db.insert(purchaseCreditLogs).values({
      buyerUserId: log.buyerUserId,
      orderId: log.orderId,
      productName: log.productName,
      productPrice: log.productPrice,
      creditAwarded: String(log.creditAwarded),
    }).returning();
    return entry;
  }

  async getPurchaseCreditLogs(): Promise<PurchaseCreditLog[]> {
    return await db.select().from(purchaseCreditLogs).orderBy(desc(purchaseCreditLogs.createdAt));
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

  async recordProductInterest(productId: number, productName: string): Promise<void> {
    await db.insert(productInterests).values({ productId, productName });
  }

  async getProductInterests(): Promise<{ productId: number; name: string; categoryName: string | null; count: number; lastAt: Date | null }[]> {
    const rows = await db
      .select({
        productId: productInterests.productId,
        snapshotName: sql<string>`MAX(${productInterests.productName})`,
        count: sql<number>`COUNT(*)::int`,
        lastAt: sql<Date>`MAX(${productInterests.createdAt})`,
      })
      .from(productInterests)
      .groupBy(productInterests.productId);

    if (rows.length === 0) return [];

    const [prods, cats] = await Promise.all([
      db.select().from(products),
      db.select().from(categories),
    ]);
    const prodMap = new Map(prods.map((p) => [p.id, p]));
    const catMap = new Map(cats.map((c) => [c.id, c.name]));

    const result: { productId: number; name: string; categoryName: string | null; count: number; lastAt: Date | null }[] = [];
    for (const r of rows) {
      const p = prodMap.get(r.productId);
      if (!p) continue; // product no longer exists on site
      // compute total available stock
      let total = p.stock ?? 0;
      try {
        const cs = JSON.parse(p.colorStock || "{}");
        const keys = Object.keys(cs);
        if (keys.length > 0) total = keys.reduce((a, k) => a + Number(cs[k] || 0), 0);
      } catch {}
      if (total > 0) continue; // only items currently out of stock
      result.push({
        productId: r.productId,
        name: p.name || r.snapshotName,
        categoryName: p.categoryId != null ? (catMap.get(p.categoryId) ?? null) : null,
        count: r.count,
        lastAt: r.lastAt ?? null,
      });
    }
    result.sort((a, b) => b.count - a.count);
    return result;
  }

  async clearProductInterests(): Promise<void> {
    await db.delete(productInterests);
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

  async getAdminKnowledgeBase(limit: number = 150): Promise<{ question: string | null; answer: string }[]> {
    // Pull recent admin replies along with the most recent preceding user message
    // (i.e., what the customer asked right before the admin answered).
    const result = await db.execute(sql`
      WITH admin_msgs AS (
        SELECT id, user_id, message, created_at
        FROM chat_messages
        WHERE sender_type = 'admin'
          AND length(trim(message)) >= 8
        ORDER BY created_at DESC
        LIMIT ${limit}
      )
      SELECT
        a.message AS answer,
        (
          SELECT u.message
          FROM chat_messages u
          WHERE u.user_id = a.user_id
            AND u.sender_type = 'user'
            AND u.created_at < a.created_at
          ORDER BY u.created_at DESC
          LIMIT 1
        ) AS question
      FROM admin_msgs a
      ORDER BY a.created_at DESC
    `);
    return (result.rows as any[]).map(r => ({
      question: r.question || null,
      answer: r.answer,
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
    // Upsert by endpoint
    await db.execute(sql`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
      VALUES (${userId}, ${endpoint}, ${p256dh}, ${auth})
      ON CONFLICT (endpoint) DO UPDATE SET user_id = ${userId}, p256dh = ${p256dh}, auth = ${auth}
    `);
    // Keep at most 3 subscriptions per user (for up to 3 devices).
    // Delete oldest beyond that limit to avoid duplicate notifications.
    await db.execute(sql`
      DELETE FROM push_subscriptions
      WHERE user_id = ${userId}
        AND id NOT IN (
          SELECT id FROM push_subscriptions
          WHERE user_id = ${userId}
          ORDER BY id DESC
          LIMIT 3
        )
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
      id: r.id, userId: r.user_id, endpoint: r.endpoint,
      p256dh: r.p256dh, auth: r.auth, createdAt: r.created_at,
    }));
  }

  async getAllPushSubscriptions(): Promise<PushSubscription[]> {
    const result = await db.execute(sql`SELECT * FROM push_subscriptions`);
    return (result.rows as any[]).map(r => ({
      id: r.id, userId: r.user_id, endpoint: r.endpoint,
      p256dh: r.p256dh, auth: r.auth, createdAt: r.created_at,
    }));
  }

  async getUserPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    const result = await db.execute(sql`
      SELECT * FROM push_subscriptions WHERE user_id = ${userId}
    `);
    return (result.rows as any[]).map(r => ({
      id: r.id, userId: r.user_id, endpoint: r.endpoint,
      p256dh: r.p256dh, auth: r.auth, createdAt: r.created_at,
    }));
  }

  async createBroadcast(data: { title: string; body: string; url?: string; imageUrl?: string }): Promise<Broadcast> {
    const [row] = await db.insert(broadcasts).values({
      title: data.title,
      body: data.body,
      url: data.url ?? null,
      imageUrl: data.imageUrl ?? null,
    }).returning();
    return row;
  }

  async getBroadcasts(): Promise<Broadcast[]> {
    return await db.select().from(broadcasts).orderBy(desc(broadcasts.createdAt));
  }

  async deleteBroadcast(id: number): Promise<void> {
    await db.delete(broadcastReads).where(eq(broadcastReads.broadcastId, id));
    await db.delete(broadcasts).where(eq(broadcasts.id, id));
  }

  async getUnreadBroadcastsForUser(userId: string): Promise<Broadcast[]> {
    const result = await db.execute(sql`
      SELECT b.* FROM broadcasts b
      WHERE b.id NOT IN (
        SELECT broadcast_id FROM broadcast_reads WHERE user_id = ${userId}
      )
      ORDER BY b.created_at DESC
      LIMIT 5
    `);
    return (result.rows as any[]).map(r => ({
      id: r.id, title: r.title, body: r.body,
      url: r.url, imageUrl: r.image_url, createdAt: r.created_at,
    }));
  }

  async markBroadcastRead(broadcastId: number, userId: string): Promise<void> {
    await db.execute(sql`
      INSERT INTO broadcast_reads (broadcast_id, user_id)
      VALUES (${broadcastId}, ${userId})
      ON CONFLICT DO NOTHING
    `);
  }

  async createStockNotification(data: { productId: number; email: string; userId?: string | null; selectedColor?: string | null }): Promise<StockNotification> {
    const [row] = await db.insert(stockNotifications).values({
      productId: data.productId,
      email: data.email.toLowerCase().trim(),
      userId: data.userId || null,
      selectedColor: data.selectedColor || null,
    }).returning();
    return row;
  }

  async getPendingStockNotifications(productId: number): Promise<StockNotification[]> {
    return await db.select().from(stockNotifications).where(
      sql`${stockNotifications.productId} = ${productId} AND ${stockNotifications.notifiedAt} IS NULL`
    );
  }

  async markStockNotificationsSent(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await db.execute(sql`UPDATE stock_notifications SET notified_at = NOW() WHERE id = ANY(${ids})`);
  }
}

export const storage = new DatabaseStorage();
