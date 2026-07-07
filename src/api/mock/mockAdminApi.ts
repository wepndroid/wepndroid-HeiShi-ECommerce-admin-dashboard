// Mock implementation of the admin API — same interface as the real client, backed by the
// localStorage store. Lets the Admin Web run fully on mock data with no backend, while
// applying the correct state transitions (ban, moderation, verification, disputes, config).
import type {
  AdminApi,
  BannerRow,
  CategoryRow,
  ContentItem,
  DashboardStats,
  FlaggedMessage,
  KeywordRow,
  OrderRow,
  Paginated,
  PlatformSettings,
  ProductTagRow,
  RegionRow,
  ReportRow,
  ReportReasonRow,
  TopicRow,
  UserRow,
  VerificationRow,
} from '../client';
import { readDb, writeDb, type MockDb } from './store';

const PAGE_SIZE = 20;

// Seed admin credentials mirror Backend/app/config.py (admin_seed_phone / admin_seed_password).
const ADMIN_PHONE = '0499999001';
const ADMIN_PASSWORD = 'Admin123!';

function paginate<T>(items: T[], page: number): Paginated<T> {
  const start = (page - 1) * PAGE_SIZE;
  return { items: items.slice(start, start + PAGE_SIZE), total: items.length, page, pageSize: PAGE_SIZE };
}

function nowIso(): string {
  return new Date().toISOString();
}

function mutate<T>(fn: (db: MockDb) => T): T {
  const db = readDb();
  const result = fn(db);
  writeDb(db);
  return result;
}

const OK = { ok: true } as const;

// Avatars live on the user record; every other view references a user by id, so we resolve
// the avatar from the users table at read time (single source of truth, mirrors mobile).
function avatarOf(db: MockDb, userId?: string | null): string | null {
  if (!userId) return null;
  return db.users.find((u) => u.id === userId)?.avatarUrl ?? null;
}

function toUserRow(u: MockDb['users'][number]): UserRow {
  const { id, nickname, phone, city, avatarUrl, identityVerified, accountStatus, createdAt } = u;
  return { id, nickname, phone, city, avatarUrl, identityVerified, accountStatus, createdAt };
}

// 发布审核 risk-control: matched sensitive words (from active keywords) + high-risk flag
// (keyword hit OR flagged seller) — mirrors the backend _listing_risk definition.
function riskFor(db: MockDb, c: MockDb['content'][number]): { matchedKeywords: string[]; riskLevel: 'high' | 'normal' } {
  const hay = `${c.title} ${c.description ?? ''}`.toLowerCase();
  const matched = db.keywords.filter((k) => k.active && hay.includes(k.pattern.toLowerCase())).map((k) => k.pattern);
  const sellerFlagged = !!(c.publisher && db.users.find((u) => u.id === c.publisher!.id)?.isFlagged);
  return { matchedKeywords: matched, riskLevel: matched.length || sellerFlagged ? 'high' : 'normal' };
}

function toContentItem(c: MockDb['content'][number], db?: MockDb): ContentItem {
  const { id, type, title, price, reviewStatus, status, publisher, city, area, categoryKey, tagKey, isRecommended, isPinned, createdAt } = c;
  const risk = db ? riskFor(db, c) : { matchedKeywords: [] as string[], riskLevel: 'normal' as const };
  return { id, type, title, price, reviewStatus, status, publisher, city, area, categoryKey, tagKey, isRecommended, isPinned, matchedKeywords: risk.matchedKeywords, riskLevel: risk.riskLevel, createdAt };
}

function toOrderRow(o: MockDb['orders'][number], db: MockDb): OrderRow {
  const { id, buyer, seller, title, amount, status, paymentStatus, pspTransactionId, createdAt } = o;
  return {
    id,
    // Re-resolve each party's avatar from the users table (single source of truth, mirrors mobile).
    buyer: buyer ? { ...buyer, avatarUrl: avatarOf(db, buyer.id) } : null,
    seller: seller ? { ...seller, avatarUrl: avatarOf(db, seller.id) } : null,
    title, amount, status, paymentStatus, pspTransactionId, createdAt,
  };
}

function toVerificationRow(v: MockDb['verifications'][number], db: MockDb): VerificationRow {
  const { id, userId, nickname, phone, status, legalName, createdAt } = v;
  return { id, userId, nickname, phone, status, legalName, createdAt, avatarUrl: avatarOf(db, userId) };
}

function toReportRow(r: MockDb['reports'][number], db: MockDb): ReportRow {
  return {
    id: r.id,
    targetType: r.targetType,
    targetId: r.targetId,
    reason: r.reason,
    status: r.status,
    reporter: { ...r.reporter, avatarUrl: avatarOf(db, r.reporter.id) },
    createdAt: r.createdAt,
  };
}

function notFound(entity: string): never {
  throw new Error(`${entity} not found`);
}

export const mockAdminApi: AdminApi = {
  async login(phone: string, password: string) {
    if (phone.trim() === ADMIN_PHONE && password === ADMIN_PASSWORD) {
      return { accessToken: `mock-admin-${Date.now()}` };
    }
    throw new Error('Invalid phone or password');
  },

  // Mirrors the require_admin-guarded /v1/admin/me: only a holder of a valid admin token
  // (issued by login above) resolves; anyone else is rejected so the route guard can block them.
  async me() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('heymarket_admin_token') : null;
    if (!token || !token.startsWith('mock-admin-')) throw new Error('Not authenticated');
    return { id: 'admin-1', nickname: 'Admin', phone: ADMIN_PHONE, isAdmin: true };
  },

  async stats(): Promise<DashboardStats> {
    const db = readDb();
    const todayPrefix = nowIso().slice(0, 10);
    // 热门分类: rank active listings by category, resolve display labels from the config table.
    const counts = new Map<string, number>();
    db.content
      .filter((c) => c.status === 'active')
      .forEach((c) => {
        const key = c.categoryKey ?? 'misc';
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
    const popularCategories = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count]) => {
        const cat = db.categories.find((c) => c.key === key);
        return { key, labelEn: cat?.labelEn ?? key, labelZh: cat?.labelZh ?? key, count };
      });
    // 热门搜索词: mock has no search log, so surface a representative static ranking.
    const popularSearchTerms = [
      { term: 'iphone', count: 42 },
      { term: 'desk', count: 31 },
      { term: 'moving', count: 27 },
      { term: 'camera', count: 19 },
      { term: 'graduation', count: 12 },
    ];
    return {
      totalUsers: db.users.length,
      newUsersToday: db.users.filter((u) => (u.createdAt ?? '').slice(0, 10) === todayPrefix).length,
      totalListings: db.content.length,
      activeListingCount: db.content.filter((c) => c.status === 'active').length,
      pendingReviewCount: db.content.filter((c) => c.reviewStatus === 'pendingReview').length,
      reportCount: db.reports.filter((r) => r.status === 'pending').length,
      orderCount: db.orders.length,
      completedTradeCount: db.orders.filter((o) => o.status === 'completed').length,
      disputeOrderCount: db.orders.filter((o) => o.status === 'inDispute' || o.status === 'refundInProgress').length,
      dau: 42,
      pendingVerificationCount: db.verifications.filter((v) => v.status === 'pending').length,
      popularCategories,
      popularSearchTerms,
    };
  },

  async users(page = 1) {
    return paginate(readDb().users.map(toUserRow), page);
  },
  async user(id: string) {
    const u = readDb().users.find((x) => x.id === id);
    return u ?? notFound('User');
  },
  async userListings(id: string) {
    const db = readDb();
    return { items: db.content.filter((c) => c.publisher?.id === id).map((c) => toContentItem(c, db)) };
  },
  async userOrders(id: string) {
    const db = readDb();
    return { items: db.orders.filter((o) => o.buyer?.id === id || o.seller?.id === id).map((o) => toOrderRow(o, db)) };
  },
  async banUser(id: string, reason: string) {
    return mutate((db) => {
      const u = db.users.find((x) => x.id === id) ?? notFound('User');
      u.accountStatus = 'banned';
      u.banReason = reason;
      return OK;
    });
  },
  async unbanUser(id: string) {
    return mutate((db) => {
      const u = db.users.find((x) => x.id === id) ?? notFound('User');
      u.accountStatus = 'normal';
      u.banReason = null;
      return OK;
    });
  },
  async setUserNotes(id: string, note: string) {
    return mutate((db) => {
      const u = db.users.find((x) => x.id === id) ?? notFound('User');
      u.adminNotes = note;
      return OK;
    });
  },
  async muteUser(id: string, reason = '') {
    return mutate((db) => {
      const u = db.users.find((x) => x.id === id) ?? notFound('User');
      u.isMuted = true;
      u.muteReason = reason || null;
      return OK;
    });
  },
  async unmuteUser(id: string) {
    return mutate((db) => {
      const u = db.users.find((x) => x.id === id) ?? notFound('User');
      u.isMuted = false;
      u.muteReason = null;
      return OK;
    });
  },
  async restrictPublish(id: string, reason = '') {
    return mutate((db) => {
      const u = db.users.find((x) => x.id === id) ?? notFound('User');
      u.publishRestricted = true;
      u.publishRestrictReason = reason || null;
      return OK;
    });
  },
  async unrestrictPublish(id: string) {
    return mutate((db) => {
      const u = db.users.find((x) => x.id === id) ?? notFound('User');
      u.publishRestricted = false;
      u.publishRestrictReason = null;
      return OK;
    });
  },
  async flagUser(id: string, reason = '') {
    return mutate((db) => {
      const u = db.users.find((x) => x.id === id) ?? notFound('User');
      u.isFlagged = true;
      u.flagReason = reason || null;
      return OK;
    });
  },
  async unflagUser(id: string) {
    return mutate((db) => {
      const u = db.users.find((x) => x.id === id) ?? notFound('User');
      u.isFlagged = false;
      u.flagReason = null;
      return OK;
    });
  },

  async content(reviewStatus?: string, contentType?: string, page = 1, riskLevel?: string, search?: string) {
    const db = readDb();
    const term = search?.trim().toLowerCase();
    let items = db.content
      .filter((c) => (reviewStatus ? c.reviewStatus === reviewStatus : true))
      .filter((c) => (contentType ? c.type === contentType : true))
      .filter((c) => (term ? c.title.toLowerCase().includes(term) : true))
      .map((c) => toContentItem(c, db));
    if (riskLevel === 'high') items = items.filter((i) => i.riskLevel === 'high');
    return paginate(items, page);
  },
  async contentDetail(id: number) {
    const db = readDb();
    const c = db.content.find((x) => x.id === id);
    if (!c) return notFound('Listing');
    const risk = riskFor(db, c);
    return {
      ...c,
      matchedKeywords: risk.matchedKeywords,
      riskLevel: risk.riskLevel,
      publisher: c.publisher ? { ...c.publisher, avatarUrl: avatarOf(db, c.publisher.id) } : null,
    };
  },
  async approveContent(id: number) {
    return mutate((db) => {
      const c = db.content.find((x) => x.id === id) ?? notFound('Listing');
      c.reviewStatus = 'approved';
      c.status = 'active';
      return OK;
    });
  },
  async rejectContent(id: number, reason: string) {
    return mutate((db) => {
      const c = db.content.find((x) => x.id === id) ?? notFound('Listing');
      c.reviewStatus = 'rejected';
      c.status = 'inactive';
      c.reviewNote = reason;
      return OK;
    });
  },
  async removeContent(id: number, note?: string) {
    return mutate((db) => {
      const c = db.content.find((x) => x.id === id) ?? notFound('Listing');
      c.reviewStatus = 'removed';
      c.status = 'inactive';
      if (note) c.reviewNote = note;
      return OK;
    });
  },
  async restoreContent(id: number) {
    return mutate((db) => {
      const c = db.content.find((x) => x.id === id) ?? notFound('Listing');
      c.reviewStatus = 'approved';
      c.status = 'active';
      return OK;
    });
  },
  async setContentFlags(id: number, flags: { recommended?: boolean; pinned?: boolean }) {
    return mutate((db) => {
      const c = db.content.find((x) => x.id === id) ?? notFound('Listing');
      if (flags.recommended !== undefined) c.isRecommended = flags.recommended;
      if (flags.pinned !== undefined) c.isPinned = flags.pinned;
      return OK;
    });
  },
  async setContentNote(id: number, note: string) {
    return mutate((db) => {
      const c = db.content.find((x) => x.id === id) ?? notFound('Listing');
      c.reviewNote = note;
      return OK;
    });
  },
  async editContent(id: number, patch: { title?: string; description?: string; categoryKey?: string }) {
    return mutate((db) => {
      const c = db.content.find((x) => x.id === id) ?? notFound('Listing');
      if (patch.title !== undefined) c.title = patch.title;
      if (patch.description !== undefined) c.description = patch.description;
      if (patch.categoryKey !== undefined) c.categoryKey = patch.categoryKey;
      return OK;
    });
  },
  async setContentTags(id: number, tagKey: string) {
    return mutate((db) => {
      const c = db.content.find((x) => x.id === id) ?? notFound('Listing');
      c.tagKey = tagKey;
      return OK;
    });
  },
  async contentReports(id: number) {
    const db = readDb();
    const items = db.reports
      .filter((r) => (r.targetType === 'listing' || r.targetType === 'service') && r.targetId === String(id))
      .map((r) => ({
        id: r.id,
        reason: r.reason,
        details: r.details,
        status: r.status,
        reporter: { ...r.reporter, avatarUrl: avatarOf(db, r.reporter.id) },
        createdAt: r.createdAt,
      }));
    return { items };
  },
  async deleteContent(id: number) {
    return mutate((db) => {
      const hasOrders = db.orders.some((o) => o.listingId === id);
      if (hasOrders) {
        const c = db.content.find((x) => x.id === id) ?? notFound('Listing');
        c.reviewStatus = 'removed';
        c.status = 'inactive';
        return { ok: true as const, deleted: false };
      }
      db.content = db.content.filter((x) => x.id !== id);
      return { ok: true as const, deleted: true };
    });
  },

  async reviews(filter: 'all' | 'visible' | 'hidden' | 'removed' = 'all') {
    const db = readDb();
    const items = db.reviews
      .filter((r) =>
        filter === 'visible' ? !r.isHidden && !r.isRemoved
        : filter === 'hidden' ? r.isHidden
        : filter === 'removed' ? r.isRemoved
        : true,
      )
      .map((r) => ({
        id: r.id, orderId: r.orderId, rating: r.rating, comment: r.comment,
        isHidden: r.isHidden, isRemoved: r.isRemoved,
        reviewer: r.reviewer ? { ...r.reviewer, avatarUrl: avatarOf(db, r.reviewer.id) } : null,
        listingId: r.listingId, listingTitle: r.listingTitle, createdAt: r.createdAt,
      }));
    return { items };
  },
  async review(id: string) {
    const db = readDb();
    const r = db.reviews.find((x) => x.id === id);
    if (!r) return notFound('Review');
    return {
      ...r,
      reviewer: r.reviewer ? { ...r.reviewer, avatarUrl: avatarOf(db, r.reviewer.id) } : null,
      reviewee: r.reviewee ? { ...r.reviewee, avatarUrl: avatarOf(db, r.reviewee.id) } : null,
    };
  },
  async hideReview(id: string, note = '') {
    return mutate((db) => {
      const r = db.reviews.find((x) => x.id === id) ?? notFound('Review');
      r.isHidden = true;
      if (note) r.adminNote = note;
      return OK;
    });
  },
  async unhideReview(id: string) {
    return mutate((db) => {
      const r = db.reviews.find((x) => x.id === id) ?? notFound('Review');
      r.isHidden = false;
      return OK;
    });
  },
  async deleteReview(id: string, note = '') {
    return mutate((db) => {
      const r = db.reviews.find((x) => x.id === id) ?? notFound('Review');
      r.isRemoved = true;
      if (note) r.adminNote = note;
      return OK;
    });
  },

  async verifications() {
    const db = readDb();
    return { items: db.verifications.map((v) => toVerificationRow(v, db)) };
  },
  async verification(id: string) {
    const db = readDb();
    const v = db.verifications.find((x) => x.id === id);
    if (!v) return notFound('Verification');
    return { ...v, avatarUrl: avatarOf(db, v.userId) };
  },
  async approveVerification(id: string) {
    return mutate((db) => {
      const v = db.verifications.find((x) => x.id === id) ?? notFound('Verification');
      v.status = 'approved';
      v.reviewedAt = nowIso();
      v.rejectionReason = null;
      const u = db.users.find((x) => x.id === v.userId);
      if (u) {
        u.identityVerified = true;
        if (v.businessName) u.businessVerified = true;
      }
      return OK;
    });
  },
  async rejectVerification(id: string, reason: string) {
    return mutate((db) => {
      const v = db.verifications.find((x) => x.id === id) ?? notFound('Verification');
      v.status = 'rejected';
      v.rejectionReason = reason;
      v.reviewedAt = nowIso();
      // Revoke the user's verified flags — covers rejecting a previously approved submission.
      const u = db.users.find((x) => x.id === v.userId);
      if (u) {
        u.identityVerified = false;
        if (v.businessName) u.businessVerified = false;
      }
      return OK;
    });
  },

  async reports() {
    const db = readDb();
    return { items: db.reports.map((r) => toReportRow(r, db)) };
  },
  async report(id: string) {
    const db = readDb();
    const r = db.reports.find((x) => x.id === id);
    if (!r) return notFound('Report');
    return {
      ...r,
      reporter: { ...r.reporter, avatarUrl: avatarOf(db, r.reporter.id) },
      reportedUser: r.reportedUser ? { ...r.reportedUser, avatarUrl: avatarOf(db, r.reportedUser.id) } : null,
    };
  },
  async reportAction(id: string, action: string, note = '') {
    return mutate((db) => {
      const r = db.reports.find((x) => x.id === id) ?? notFound('Report');
      r.status = action === 'ignore' ? 'ignored' : 'processed';
      if (note) r.handlerNote = note;
      if (action === 'ban_user' && r.reportedUser) {
        const u = db.users.find((x) => x.id === r.reportedUser!.id);
        if (u) {
          u.accountStatus = 'banned';
          u.banReason = `Report ${r.id}: ${r.reason}`;
        }
      }
      if (r.targetType === 'listing') {
        const listingId = Number(r.targetId);
        const c = db.content.find((x) => x.id === listingId);
        if (c && action === 'remove_content') {
          c.reviewStatus = 'removed';
          c.status = 'inactive';
        }
        if (c && action === 'restore_content') {
          c.reviewStatus = 'approved';
          c.status = 'active';
        }
      }
      return OK;
    });
  },
  async setReportNote(id: string, note: string) {
    return mutate((db) => {
      const r = db.reports.find((x) => x.id === id) ?? notFound('Report');
      r.handlerNote = note;
      return OK;
    });
  },
  async chatTranscript(id: string) {
    return { messages: readDb().transcripts[id] ?? [] };
  },

  async orders() {
    const db = readDb();
    return { items: db.orders.map((o) => toOrderRow(o, db)) };
  },
  async orderChat(id: number) {
    return { messages: readDb().orderChats[String(id)] ?? [] };
  },
  async order(id: number) {
    const db = readDb();
    const o = db.orders.find((x) => x.id === id);
    if (!o) return notFound('Order');
    return {
      ...o,
      buyer: o.buyer ? { ...o.buyer, avatarUrl: avatarOf(db, o.buyer.id) } : null,
      seller: o.seller ? { ...o.seller, avatarUrl: avatarOf(db, o.seller.id) } : null,
    };
  },
  async pausePayout(id: number) {
    return mutate((db) => {
      const o = db.orders.find((x) => x.id === id) ?? notFound('Order');
      o.payoutPaused = true;
      return OK;
    });
  },
  async markAbnormal(id: number) {
    return mutate((db) => {
      const o = db.orders.find((x) => x.id === id) ?? notFound('Order');
      o.isAbnormal = true;
      return OK;
    });
  },
  async setOrderNotes(id: number, note: string) {
    return mutate((db) => {
      const o = db.orders.find((x) => x.id === id) ?? notFound('Order');
      o.adminNotes = note;
      return OK;
    });
  },
  async resolveDispute(id: number, resolution: string, note: string) {
    return mutate((db) => {
      const o = db.orders.find((x) => x.id === id) ?? notFound('Order');
      if (resolution === 'refund') {
        o.status = 'refundInProgress';
        o.paymentStatus = 'refundInProgress';
        o.payoutPaused = true;
      } else if (resolution === 'complete') {
        o.status = 'completed';
        o.payoutPaused = false;
      } else if (resolution === 'cancel') {
        o.status = 'cancelled';
        o.payoutPaused = true;
      }
      o.disputeStatus = 'resolved';
      o.adminNotes = note || o.adminNotes;
      return OK;
    });
  },

  async categories() {
    return { items: readDb().categories.map((c) => ({ ...c })) };
  },
  async createCategory(body: Omit<CategoryRow, 'id'>) {
    return mutate((db) => {
      const id = db.categories.reduce((max, c) => Math.max(max, c.id), 0) + 1;
      db.categories.push({ ...body, id });
      return { id };
    });
  },
  async patchCategory(id: number, patch: Partial<CategoryRow>) {
    return mutate((db) => {
      const c = db.categories.find((x) => x.id === id) ?? notFound('Category');
      if (patch.labelEn !== undefined) c.labelEn = patch.labelEn;
      if (patch.labelZh !== undefined) c.labelZh = patch.labelZh;
      if (patch.sortOrder !== undefined) c.sortOrder = patch.sortOrder;
      if (patch.enabled !== undefined) c.enabled = patch.enabled;
      if (patch.icon !== undefined) c.icon = patch.icon;
      if (patch.showOnHome !== undefined) c.showOnHome = patch.showOnHome;
      return OK;
    });
  },

  async regions() {
    return { items: readDb().regions.map((r) => ({ ...r })) };
  },
  async createRegion(body: Omit<RegionRow, 'id'>) {
    return mutate((db) => {
      const id = db.regions.reduce((max, r) => Math.max(max, r.id), 0) + 1;
      if (body.isDefaultCity) db.regions.forEach((r) => (r.isDefaultCity = false));
      db.regions.push({ ...body, id });
      return { id };
    });
  },
  async patchRegion(id: number, patch: Partial<RegionRow>) {
    return mutate((db) => {
      const r = db.regions.find((x) => x.id === id) ?? notFound('Region');
      if (patch.isDefaultCity) db.regions.forEach((x) => (x.isDefaultCity = false));
      if (patch.labelEn !== undefined) r.labelEn = patch.labelEn;
      if (patch.labelZh !== undefined) r.labelZh = patch.labelZh;
      if (patch.isDefaultCity !== undefined) r.isDefaultCity = patch.isDefaultCity;
      if (patch.sortOrder !== undefined) r.sortOrder = patch.sortOrder;
      if (patch.enabled !== undefined) r.enabled = patch.enabled;
      return OK;
    });
  },

  async banners() {
    return { items: readDb().banners.map((b) => ({ ...b })) };
  },
  async createBanner(body: Omit<BannerRow, 'id'>) {
    return mutate((db) => {
      const id = `b${Date.now()}`;
      db.banners.push({ ...body, id });
      return { id };
    });
  },
  async patchBanner(id: string, patch: Partial<BannerRow>) {
    return mutate((db) => {
      const b = db.banners.find((x) => x.id === id) ?? notFound('Banner');
      if (patch.title !== undefined) b.title = patch.title;
      if (patch.imageUrl !== undefined) b.imageUrl = patch.imageUrl;
      if (patch.linkUrl !== undefined) b.linkUrl = patch.linkUrl;
      if (patch.position !== undefined) b.position = patch.position;
      if (patch.onlineAt !== undefined) b.onlineAt = patch.onlineAt;
      if (patch.offlineAt !== undefined) b.offlineAt = patch.offlineAt;
      if (patch.enabled !== undefined) b.enabled = patch.enabled;
      return OK;
    });
  },

  async keywords() {
    return { items: readDb().keywords.map((k) => ({ ...k })) };
  },
  async createKeyword(body: Omit<KeywordRow, 'id'>) {
    return mutate((db) => {
      const id = db.keywords.reduce((max, k) => Math.max(max, k.id), 0) + 1;
      db.keywords.push({ ...body, id });
      return { id };
    });
  },
  async patchKeyword(id: number, patch: Partial<Omit<KeywordRow, 'id'>>) {
    return mutate((db) => {
      const k = db.keywords.find((x) => x.id === id) ?? notFound('Keyword');
      if (patch.pattern !== undefined) k.pattern = patch.pattern;
      if (patch.locale !== undefined) k.locale = patch.locale;
      if (patch.active !== undefined) k.active = patch.active;
      return OK;
    });
  },
  async deleteKeyword(id: number) {
    return mutate((db) => {
      db.keywords = db.keywords.filter((x) => x.id !== id);
      return OK;
    });
  },

  async reportReasons() {
    return { items: readDb().reportReasons.map((r) => ({ ...r })) };
  },
  async createReportReason(body: Omit<ReportReasonRow, 'id'>) {
    return mutate((db) => {
      const id = db.reportReasons.reduce((max, r) => Math.max(max, r.id), 0) + 1;
      db.reportReasons.push({ ...body, id });
      return { id };
    });
  },
  async patchReportReason(id: number, patch: Partial<Omit<ReportReasonRow, 'id' | 'key'>>) {
    return mutate((db) => {
      const r = db.reportReasons.find((x) => x.id === id) ?? notFound('Reason');
      if (patch.labelEn !== undefined) r.labelEn = patch.labelEn;
      if (patch.labelZh !== undefined) r.labelZh = patch.labelZh;
      if (patch.sortOrder !== undefined) r.sortOrder = patch.sortOrder;
      if (patch.active !== undefined) r.active = patch.active;
      return OK;
    });
  },
  async deleteReportReason(id: number) {
    return mutate((db) => {
      db.reportReasons = db.reportReasons.filter((x) => x.id !== id);
      return OK;
    });
  },

  async productTags() {
    return { items: readDb().productTags.map((t) => ({ ...t })) };
  },
  async createProductTag(body: Omit<ProductTagRow, 'id'>) {
    return mutate((db) => {
      const id = db.productTags.reduce((max, t) => Math.max(max, t.id), 0) + 1;
      db.productTags.push({ ...body, id });
      return { id };
    });
  },
  async patchProductTag(id: number, patch: Partial<Omit<ProductTagRow, 'id' | 'key'>>) {
    return mutate((db) => {
      const t = db.productTags.find((x) => x.id === id) ?? notFound('Tag');
      if (patch.labelEn !== undefined) t.labelEn = patch.labelEn;
      if (patch.labelZh !== undefined) t.labelZh = patch.labelZh;
      if (patch.sortOrder !== undefined) t.sortOrder = patch.sortOrder;
      if (patch.active !== undefined) t.active = patch.active;
      return OK;
    });
  },
  async deleteProductTag(id: number) {
    return mutate((db) => {
      db.productTags = db.productTags.filter((x) => x.id !== id);
      return OK;
    });
  },

  async settings() {
    return { values: { ...readDb().settings } };
  },
  async patchSettings(values: PlatformSettings) {
    return mutate((db) => {
      db.settings = { ...db.settings, ...values };
      return OK;
    });
  },

  async topics() {
    return { items: readDb().topics.map((t) => ({ ...t })) };
  },
  async createTopic(body: Omit<TopicRow, 'id'>) {
    return mutate((db) => {
      const id = db.topics.reduce((max, t) => Math.max(max, t.id), 0) + 1;
      db.topics.push({ ...body, id });
      return { id };
    });
  },
  async patchTopic(id: number, patch: Partial<Omit<TopicRow, 'id'>>) {
    return mutate((db) => {
      const t = db.topics.find((x) => x.id === id) ?? notFound('Topic');
      Object.assign(t, patch);
      return OK;
    });
  },
  async deleteTopic(id: number) {
    return mutate((db) => {
      db.topics = db.topics.filter((x) => x.id !== id);
      return OK;
    });
  },

  async authStatus(page = 1) {
    const db = readDb();
    const items = db.users.map((u) => {
      const first = u.nickname.trim().toLowerCase().split(' ')[0];
      return {
        id: u.id,
        nickname: u.nickname,
        avatarUrl: u.avatarUrl,
        phone: u.phone,
        phoneVerified: !!u.phone,
        // Deterministic demo emails: verified users have a confirmed campus email.
        email: `${first}@student.edu.au`,
        emailVerified: u.identityVerified,
        identityVerified: u.identityVerified,
        businessVerified: u.businessVerified,
      };
    });
    return paginate(items, page);
  },

  async chatFlagged() {
    const db = readDb();
    const active = db.keywords.filter((k) => k.active);
    const items: FlaggedMessage[] = [];
    const scan = (convId: string, msgs: { senderId: string; text: string; sentAt: string | null }[], idPrefix: string) => {
      msgs.forEach((m, i) => {
        const matched = active.filter((k) => m.text.toLowerCase().includes(k.pattern.toLowerCase())).map((k) => k.pattern);
        if (!matched.length) return;
        const u = db.users.find((x) => x.id === m.senderId);
        items.push({
          id: `${idPrefix}-${i}`,
          conversationId: convId,
          senderId: m.senderId,
          sender: u ? { id: u.id, nickname: u.nickname, avatarUrl: u.avatarUrl, phone: u.phone } : null,
          senderMuted: !!u?.isMuted,
          text: m.text,
          matched,
          sentAt: m.sentAt,
        });
      });
    };
    Object.entries(db.transcripts).forEach(([k, msgs]) => scan(k, msgs, `t-${k}`));
    Object.entries(db.orderChats).forEach(([k, msgs]) =>
      scan(k, msgs.map((m) => ({ senderId: m.senderId, text: m.text, sentAt: m.sentAt })), `o-${k}`),
    );
    return { items };
  },
};
