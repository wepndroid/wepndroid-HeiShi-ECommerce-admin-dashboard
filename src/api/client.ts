import { mockAdminApi } from './mock/mockAdminApi';
import type {
  AccountStatus,
  BundleItem,
  ListingStatus,
  ListingType,
  OrderStatus,
  Party,
  PaymentStatus,
  ReportStatus,
  ReviewStatus,
  VerificationStatus,
} from './domain';

export type {
  AccountStatus,
  BundleItem,
  BundleItemStatus,
  ListingStatus,
  ListingType,
  OrderStatus,
  Party,
  PaymentStatus,
  ReportStatus,
  ReviewStatus,
  VerificationStatus,
} from './domain';

const TOKEN_KEY = 'heymarket_admin_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body.message || body.detail?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type Paginated<T> = { items: T[]; total: number; page: number; pageSize: number };

export type PopularCategory = { key: string; labelEn: string; labelZh: string; count: number };
export type PopularSearchTerm = { term: string; count: number };

export type DashboardStats = {
  totalUsers: number;
  newUsersToday: number;
  totalListings: number;
  activeListingCount: number;
  pendingReviewCount: number;
  reportCount: number;
  orderCount: number;
  completedTradeCount: number;
  disputeOrderCount: number;
  dau: number;
  pendingVerificationCount: number;
  popularCategories: PopularCategory[];
  popularSearchTerms: PopularSearchTerm[];
};

export type UserRow = {
  id: string;
  nickname: string;
  phone: string;
  city: string | null;
  avatarUrl: string | null;
  identityVerified: boolean;
  accountStatus: AccountStatus;
  createdAt: string | null;
};

export type UserDetail = UserRow & {
  businessVerified: boolean;
  banReason: string | null;
  adminNotes: string | null;
  // Moderation controls (禁言 / 限制发布 / 异常用户标记).
  isMuted: boolean;
  muteReason: string | null;
  publishRestricted: boolean;
  publishRestrictReason: string | null;
  isFlagged: boolean;
  flagReason: string | null;
  listingCount: number;
  orderCount: number;
};

export type RiskLevel = 'high' | 'normal';

export type ContentItem = {
  id: number;
  type: ListingType;
  title: string;
  price: number;
  reviewStatus: ReviewStatus;
  status?: ListingStatus;
  publisher: Party | null;
  city: string;
  area?: string;
  categoryKey?: string;
  tagKey?: string;
  isRecommended?: boolean;
  isPinned?: boolean;
  // Review risk-control (发布审核): sensitive words hit + high-risk flag.
  matchedKeywords?: string[];
  riskLevel?: RiskLevel;
  createdAt: string | null;
};

export type ContentDetail = ContentItem & {
  description: string;
  images: string[];
  reviewNote: string | null;
  publisherCity: string | null;
  // Location & trade options
  locationLabel: string | null;
  currency: string;
  negotiable: boolean;
  escrowSupported: boolean;
  meetInPublic: boolean;
  pickupMethods: string[];
  // Type-specific attributes
  conditionKey: string | null; // second-hand condition
  serviceIcon: string | null; // service visual type
  merchantPost: boolean; // job posted by a business
  // Seller trust
  sellerTrades: number;
  sellerRating: number; // positive rating rate, 0–100
  sellerVerified: boolean;
  // Engagement
  viewCount: number;
  favoriteCount: number;
  updatedAt: string | null;
  // Bundle-specific — nested meta mirrors the mobile app's BundleMetaDto.
  bundleMeta: {
    allowSeparateSale: boolean;
    pickupWindow: string | null;
    pickupDeadline: string | null;
    items: BundleItem[];
  } | null;
};

export type VerificationRow = {
  id: string;
  userId: string;
  nickname: string | null;
  phone: string | null;
  avatarUrl?: string | null;
  status: VerificationStatus;
  legalName: string;
  createdAt: string | null;
};

export type VerificationDetail = VerificationRow & {
  idCountry: string;
  idFrontUrl: string;
  idBackUrl: string | null;
  businessName: string | null;
  businessRegUrl: string | null;
  abn: string | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
};

export type ReportRow = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: ReportStatus;
  reporter: Party;
  createdAt: string | null;
};

export type ReportDetail = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  evidenceUrls: string[];
  status: ReportStatus;
  handlerNote: string | null;
  reporter: Party;
  reportedUser: Party | null;
  targetSummary: Record<string, unknown> | null;
  createdAt: string | null;
};

export type OrderRow = {
  id: number;
  buyer: Party | null;
  seller: Party | null;
  title: string | null;
  amount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus | null;
  pspTransactionId: string | null;
  createdAt: string | null;
};

export type OrderDetail = OrderRow & {
  listingId: number;
  escrowFee: number;
  paymentMethod: string | null;
  psp: string | null;
  pspPaymentId: string | null;
  payoutPaused: boolean;
  isAbnormal: boolean;
  adminNotes: string | null;
  disputeStatus: string | null;
  disputeReason: string | null;
};

// Identical shape to the mobile app's ChatMessageDto (Frontend/src/api/types.ts) so the
// buyer↔seller conversation is retrieved and rendered exactly as it exists on the mobile side.
export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  sentAt: string;
  ackRead?: boolean;
};

export type CategoryRow = {
  id: number;
  type: string;
  key: string;
  labelEn: string;
  labelZh: string;
  sortOrder: number;
  enabled: boolean;
  icon?: string | null;
  showOnHome?: boolean;
};

// 评价管理 — buyer/seller reviews for moderation.
export type ReviewRow = {
  id: string;
  orderId: number;
  rating: number;
  comment: string | null;
  isHidden: boolean;
  isRemoved: boolean;
  reviewer: Party | null;
  listingId: number | null;
  listingTitle: string | null;
  createdAt: string | null;
};

export type ReviewDetail = ReviewRow & {
  adminNote: string | null;
  reviewee: Party | null;
  listing: ContentItem | null;
  qualityRating: number | null;
  communicationRating: number | null;
  expertiseRating: number | null;
  professionalismRating: number | null;
  hireAgainRating: number | null;
};

// 系统配置 — blocked keywords / report reasons / product tags / generic settings.
export type KeywordRow = { id: number; pattern: string; locale: string; active: boolean };
export type ReportReasonRow = { id: number; key: string; labelEn: string; labelZh: string; sortOrder: number; active: boolean };
export type ProductTagRow = { id: number; key: string; labelEn: string; labelZh: string; sortOrder: number; active: boolean };
export type PlatformSettings = Record<string, string>;

// A report record as shown inline on a listing's moderation page (查看举报记录).
export type ContentReportRow = {
  id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  reporter: Party | null;
  createdAt: string | null;
};

// 专题 (topic zone) — curated feature area, distinct from banners.
export type TopicRow = {
  id: number;
  title: string;
  titleZh: string | null;
  subtitle: string | null;
  coverImageUrl: string;
  tagKey: string | null;
  linkUrl: string | null;
  onlineAt: string | null;
  offlineAt: string | null;
  sortOrder: number;
  enabled: boolean;
};

// 认证管理 — per-user phone/email/real-name auth status.
export type AuthStatusRow = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  phone: string | null;
  phoneVerified: boolean;
  email: string | null;
  emailVerified: boolean;
  identityVerified: boolean;
  businessVerified: boolean;
};

// 聊天风控 — a chat message that hit a blocked keyword (敏感词命中).
export type FlaggedMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  sender: Party | null;
  senderMuted: boolean;
  text: string;
  matched: string[];
  sentAt: string | null;
};

export type RegionRow = {
  id: number;
  country: string;
  state: string;
  city: string;
  area: string | null;
  labelEn: string;
  labelZh: string;
  isDefaultCity: boolean;
  sortOrder: number;
  enabled: boolean;
};

export type BannerRow = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  position: string;
  onlineAt: string | null;
  offlineAt: string | null;
  enabled: boolean;
};

export type AdminMe = { id: string; nickname: string; phone: string; isAdmin: boolean };

const realAdminApi = {
  login(phone: string, password: string) {
    return request<{ accessToken: string }>('/v1/admin/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
  },
  /** Verifies the current token belongs to an admin; the route is guarded by require_admin. */
  me: () => request<AdminMe>('/v1/admin/me'),
  stats: () => request<DashboardStats>('/v1/admin/stats'),
  users: (page = 1) => request<Paginated<UserRow>>(`/v1/admin/users?page=${page}`),
  user: (id: string) => request<UserDetail>(`/v1/admin/users/${id}`),
  userListings: (id: string) => request<{ items: ContentItem[] }>(`/v1/admin/users/${id}/listings`),
  userOrders: (id: string) => request<{ items: OrderRow[] }>(`/v1/admin/users/${id}/orders`),
  banUser: (id: string, reason: string) =>
    request<{ ok: boolean }>(`/v1/admin/users/${id}/ban`, { method: 'POST', body: JSON.stringify({ reason }) }),
  unbanUser: (id: string) => request<{ ok: boolean }>(`/v1/admin/users/${id}/unban`, { method: 'POST' }),
  setUserNotes: (id: string, note: string) =>
    request<{ ok: boolean }>(`/v1/admin/users/${id}/notes`, { method: 'PATCH', body: JSON.stringify({ note }) }),
  muteUser: (id: string, reason = '') =>
    request<{ ok: boolean }>(`/v1/admin/users/${id}/mute`, { method: 'POST', body: JSON.stringify({ reason }) }),
  unmuteUser: (id: string) => request<{ ok: boolean }>(`/v1/admin/users/${id}/unmute`, { method: 'POST' }),
  restrictPublish: (id: string, reason = '') =>
    request<{ ok: boolean }>(`/v1/admin/users/${id}/restrict-publish`, { method: 'POST', body: JSON.stringify({ reason }) }),
  unrestrictPublish: (id: string) =>
    request<{ ok: boolean }>(`/v1/admin/users/${id}/unrestrict-publish`, { method: 'POST' }),
  flagUser: (id: string, reason = '') =>
    request<{ ok: boolean }>(`/v1/admin/users/${id}/flag`, { method: 'POST', body: JSON.stringify({ reason }) }),
  unflagUser: (id: string) => request<{ ok: boolean }>(`/v1/admin/users/${id}/unflag`, { method: 'POST' }),

  content: (reviewStatus?: string, contentType?: string, page = 1, riskLevel?: string, search?: string) => {
    const params = new URLSearchParams({ page: String(page) });
    if (reviewStatus) params.set('reviewStatus', reviewStatus);
    if (contentType) params.set('contentType', contentType);
    if (riskLevel) params.set('riskLevel', riskLevel);
    if (search && search.trim()) params.set('search', search.trim());
    return request<Paginated<ContentItem>>(`/v1/admin/content?${params}`);
  },
  contentDetail: (id: number) => request<ContentDetail>(`/v1/admin/content/${id}`),
  approveContent: (id: number) => request<{ ok: boolean }>(`/v1/admin/content/${id}/approve`, { method: 'POST' }),
  rejectContent: (id: number, reason: string) =>
    request<{ ok: boolean }>(`/v1/admin/content/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  removeContent: (id: number, note?: string) =>
    request<{ ok: boolean }>(`/v1/admin/content/${id}/remove`, {
      method: 'POST',
      body: JSON.stringify(note ? { note } : {}),
    }),
  restoreContent: (id: number) =>
    request<{ ok: boolean }>(`/v1/admin/content/${id}/restore`, { method: 'POST' }),
  setContentFlags: (id: number, flags: { recommended?: boolean; pinned?: boolean }) =>
    request<{ ok: boolean }>(`/v1/admin/content/${id}/flags`, {
      method: 'PATCH',
      body: JSON.stringify(flags),
    }),
  setContentNote: (id: number, note: string) =>
    request<{ ok: boolean }>(`/v1/admin/content/${id}/note`, {
      method: 'PATCH',
      body: JSON.stringify({ note }),
    }),
  editContent: (id: number, patch: { title?: string; description?: string; categoryKey?: string }) =>
    request<{ ok: boolean }>(`/v1/admin/content/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  setContentTags: (id: number, tagKey: string) =>
    request<{ ok: boolean }>(`/v1/admin/content/${id}/tags`, { method: 'PATCH', body: JSON.stringify({ tagKey }) }),
  contentReports: (id: number) =>
    request<{ items: ContentReportRow[] }>(`/v1/admin/content/${id}/reports`),
  deleteContent: (id: number) =>
    request<{ ok: boolean; deleted: boolean }>(`/v1/admin/content/${id}`, { method: 'DELETE' }),

  reviews: (filter: 'all' | 'visible' | 'hidden' | 'removed' = 'all') =>
    request<{ items: ReviewRow[] }>(`/v1/admin/reviews?filter=${filter}`),
  review: (id: string) => request<ReviewDetail>(`/v1/admin/reviews/${id}`),
  hideReview: (id: string, note = '') =>
    request<{ ok: boolean }>(`/v1/admin/reviews/${id}/hide`, { method: 'POST', body: JSON.stringify({ note }) }),
  unhideReview: (id: string) => request<{ ok: boolean }>(`/v1/admin/reviews/${id}/unhide`, { method: 'POST' }),
  deleteReview: (id: string, note = '') =>
    request<{ ok: boolean }>(`/v1/admin/reviews/${id}`, { method: 'DELETE', body: JSON.stringify({ note }) }),

  verifications: () => request<{ items: VerificationRow[] }>('/v1/admin/verifications'),
  verification: (id: string) => request<VerificationDetail>(`/v1/admin/verifications/${id}`),
  approveVerification: (id: string) =>
    request<{ ok: boolean }>(`/v1/admin/verifications/${id}/approve`, { method: 'POST' }),
  rejectVerification: (id: string, reason: string) =>
    request<{ ok: boolean }>(`/v1/admin/verifications/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  reports: () => request<{ items: ReportRow[] }>('/v1/admin/reports'),
  report: (id: string) => request<ReportDetail>(`/v1/admin/reports/${id}`),
  reportAction: (id: string, action: string, note = '') =>
    request<{ ok: boolean }>(`/v1/admin/reports/${id}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, note }),
    }),
  setReportNote: (id: string, note: string) =>
    request<{ ok: boolean }>(`/v1/admin/reports/${id}/notes`, { method: 'PATCH', body: JSON.stringify({ note }) }),
  chatTranscript: (id: string) =>
    request<{ messages: { senderId: string; text: string; sentAt: string | null }[] }>(
      `/v1/admin/reports/${id}/chat-transcript`,
    ),

  orders: () => request<{ items: OrderRow[] }>('/v1/admin/orders'),
  order: (id: number) => request<OrderDetail>(`/v1/admin/orders/${id}`),
  orderChat: (id: number) => request<{ messages: ChatMessage[] }>(`/v1/admin/orders/${id}/chat`),
  pausePayout: (id: number) => request<{ ok: boolean }>(`/v1/admin/orders/${id}/pause-payout`, { method: 'POST' }),
  markAbnormal: (id: number) =>
    request<{ ok: boolean }>(`/v1/admin/orders/${id}/mark-abnormal`, { method: 'POST' }),
  setOrderNotes: (id: number, note: string) =>
    request<{ ok: boolean }>(`/v1/admin/orders/${id}/notes`, { method: 'PATCH', body: JSON.stringify({ note }) }),
  resolveDispute: (id: number, resolution: string, note: string) =>
    request<{ ok: boolean }>(`/v1/admin/orders/${id}/resolve-dispute`, {
      method: 'POST',
      body: JSON.stringify({ resolution, note }),
    }),

  categories: () => request<{ items: CategoryRow[] }>('/v1/admin/config/categories'),
  createCategory: (body: Omit<CategoryRow, 'id'>) =>
    request<{ id: number }>('/v1/admin/config/categories', {
      method: 'POST',
      body: JSON.stringify({
        type: body.type,
        key: body.key,
        labelEn: body.labelEn,
        labelZh: body.labelZh,
        sortOrder: body.sortOrder,
        enabled: body.enabled,
        icon: body.icon ?? null,
        showOnHome: body.showOnHome ?? true,
      }),
    }),
  patchCategory: (id: number, patch: Partial<CategoryRow>) =>
    request<{ ok: boolean }>(`/v1/admin/config/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        labelEn: patch.labelEn,
        labelZh: patch.labelZh,
        sortOrder: patch.sortOrder,
        enabled: patch.enabled,
        icon: patch.icon,
        showOnHome: patch.showOnHome,
      }),
    }),

  regions: () => request<{ items: RegionRow[] }>('/v1/admin/config/regions'),
  createRegion: (body: Omit<RegionRow, 'id'>) =>
    request<{ id: number }>('/v1/admin/config/regions', {
      method: 'POST',
      body: JSON.stringify({
        country: body.country,
        state: body.state,
        city: body.city,
        area: body.area,
        labelEn: body.labelEn,
        labelZh: body.labelZh,
        isDefaultCity: body.isDefaultCity,
        sortOrder: body.sortOrder,
        enabled: body.enabled,
      }),
    }),
  patchRegion: (id: number, patch: Partial<RegionRow>) =>
    request<{ ok: boolean }>(`/v1/admin/config/regions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        labelEn: patch.labelEn,
        labelZh: patch.labelZh,
        isDefaultCity: patch.isDefaultCity,
        sortOrder: patch.sortOrder,
        enabled: patch.enabled,
      }),
    }),

  banners: () => request<{ items: BannerRow[] }>('/v1/admin/config/banners'),
  createBanner: (body: Omit<BannerRow, 'id'>) =>
    request<{ id: string }>('/v1/admin/config/banners', {
      method: 'POST',
      body: JSON.stringify({
        title: body.title,
        imageUrl: body.imageUrl,
        linkUrl: body.linkUrl,
        position: body.position,
        onlineAt: body.onlineAt,
        offlineAt: body.offlineAt,
        enabled: body.enabled,
      }),
    }),
  patchBanner: (id: string, patch: Partial<BannerRow>) =>
    request<{ ok: boolean }>(`/v1/admin/config/banners/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: patch.title,
        imageUrl: patch.imageUrl,
        linkUrl: patch.linkUrl,
        position: patch.position,
        onlineAt: patch.onlineAt,
        offlineAt: patch.offlineAt,
        enabled: patch.enabled,
      }),
    }),

  // 禁发关键词
  keywords: () => request<{ items: KeywordRow[] }>('/v1/admin/config/keywords'),
  createKeyword: (body: Omit<KeywordRow, 'id'>) =>
    request<{ id: number }>('/v1/admin/config/keywords', { method: 'POST', body: JSON.stringify(body) }),
  patchKeyword: (id: number, patch: Partial<Omit<KeywordRow, 'id'>>) =>
    request<{ ok: boolean }>(`/v1/admin/config/keywords/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteKeyword: (id: number) =>
    request<{ ok: boolean }>(`/v1/admin/config/keywords/${id}`, { method: 'DELETE' }),

  // 举报原因配置
  reportReasons: () => request<{ items: ReportReasonRow[] }>('/v1/admin/config/report-reasons'),
  createReportReason: (body: Omit<ReportReasonRow, 'id'>) =>
    request<{ id: number }>('/v1/admin/config/report-reasons', { method: 'POST', body: JSON.stringify(body) }),
  patchReportReason: (id: number, patch: Partial<Omit<ReportReasonRow, 'id' | 'key'>>) =>
    request<{ ok: boolean }>(`/v1/admin/config/report-reasons/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteReportReason: (id: number) =>
    request<{ ok: boolean }>(`/v1/admin/config/report-reasons/${id}`, { method: 'DELETE' }),

  // 商品标签配置
  productTags: () => request<{ items: ProductTagRow[] }>('/v1/admin/config/tags'),
  createProductTag: (body: Omit<ProductTagRow, 'id'>) =>
    request<{ id: number }>('/v1/admin/config/tags', { method: 'POST', body: JSON.stringify(body) }),
  patchProductTag: (id: number, patch: Partial<Omit<ProductTagRow, 'id' | 'key'>>) =>
    request<{ ok: boolean }>(`/v1/admin/config/tags/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteProductTag: (id: number) =>
    request<{ ok: boolean }>(`/v1/admin/config/tags/${id}`, { method: 'DELETE' }),

  // 首页开关 / 用户协议 / 隐私政策 (generic key→value settings)
  settings: () => request<{ values: PlatformSettings }>('/v1/admin/config/settings'),
  patchSettings: (values: PlatformSettings) =>
    request<{ ok: boolean }>('/v1/admin/config/settings', { method: 'PATCH', body: JSON.stringify({ values }) }),

  // 专题 (topic zones)
  topics: () => request<{ items: TopicRow[] }>('/v1/admin/config/topics'),
  createTopic: (body: Omit<TopicRow, 'id'>) =>
    request<{ id: number }>('/v1/admin/config/topics', { method: 'POST', body: JSON.stringify(body) }),
  patchTopic: (id: number, patch: Partial<Omit<TopicRow, 'id'>>) =>
    request<{ ok: boolean }>(`/v1/admin/config/topics/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteTopic: (id: number) =>
    request<{ ok: boolean }>(`/v1/admin/config/topics/${id}`, { method: 'DELETE' }),

  // 认证管理 — phone/email auth status
  authStatus: (page = 1) => request<Paginated<AuthStatusRow>>(`/v1/admin/auth-status?page=${page}`),

  // 聊天风控 — sensitive-word hits across chats
  chatFlagged: () => request<{ items: FlaggedMessage[] }>('/v1/admin/chat-risk/flagged'),
};

/** Full admin API surface — the mock must implement every method. */
export type AdminApi = typeof realAdminApi;

// Frontend + mock phase: default to the mock API (no backend). Set VITE_ADMIN_USE_MOCK=false
// to talk to the real /v1/admin backend once it is available.
const USE_MOCK = (import.meta.env.VITE_ADMIN_USE_MOCK as string | undefined) !== 'false';

export const adminApi: AdminApi = USE_MOCK ? mockAdminApi : realAdminApi;
