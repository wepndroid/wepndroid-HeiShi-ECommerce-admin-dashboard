// Mock implementation of the admin API — same interface as the real client, backed by the
// localStorage store. Lets the Admin Web run fully on mock data with no backend, while
// applying the correct state transitions (ban, moderation, verification, disputes, config).
import type {
  AdminApi,
  BannerRow,
  CategoryRow,
  ContentItem,
  DashboardStats,
  OrderRow,
  Paginated,
  RegionRow,
  ReportRow,
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

function toContentItem(c: MockDb['content'][number]): ContentItem {
  const { id, type, title, price, reviewStatus, status, publisher, city, area, categoryKey, tagKey, isRecommended, isPinned, createdAt } = c;
  return { id, type, title, price, reviewStatus, status, publisher, city, area, categoryKey, tagKey, isRecommended, isPinned, createdAt };
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
    return {
      totalUsers: db.users.length,
      newUsersToday: db.users.filter((u) => (u.createdAt ?? '').slice(0, 10) === todayPrefix).length,
      totalListings: db.content.length,
      pendingReviewCount: db.content.filter((c) => c.reviewStatus === 'pendingReview').length,
      reportCount: db.reports.filter((r) => r.status === 'pending').length,
      orderCount: db.orders.length,
      disputeOrderCount: db.orders.filter((o) => o.status === 'inDispute' || o.status === 'refundInProgress').length,
      dau: 42,
      promotionClicks: 128,
      pendingVerificationCount: db.verifications.filter((v) => v.status === 'pending').length,
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
    return { items: readDb().content.filter((c) => c.publisher?.id === id).map(toContentItem) };
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

  async content(reviewStatus?: string, contentType?: string, page = 1) {
    const items = readDb().content
      .filter((c) => (reviewStatus ? c.reviewStatus === reviewStatus : true))
      .filter((c) => (contentType ? c.type === contentType : true))
      .map(toContentItem);
    return paginate(items, page);
  },
  async contentDetail(id: number) {
    const db = readDb();
    const c = db.content.find((x) => x.id === id);
    if (!c) return notFound('Listing');
    return {
      ...c,
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
};
