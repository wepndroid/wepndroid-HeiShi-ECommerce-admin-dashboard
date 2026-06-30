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

export type DashboardStats = {
  totalUsers: number;
  newUsersToday: number;
  totalListings: number;
  pendingReviewCount: number;
  reportCount: number;
  orderCount: number;
  disputeOrderCount: number;
  dau: number;
  promotionClicks: number;
  pendingVerificationCount: number;
};

export type UserRow = {
  id: string;
  nickname: string;
  phone: string;
  city: string | null;
  identityVerified: boolean;
  accountStatus: string;
  createdAt: string | null;
};

export type UserDetail = UserRow & {
  businessVerified: boolean;
  banReason: string | null;
  adminNotes: string | null;
  listingCount: number;
  orderCount: number;
};

export type ContentItem = {
  id: number;
  type: string;
  title: string;
  price: number;
  reviewStatus: string;
  status?: string;
  publisher: string | null;
  publisherId?: string;
  city: string;
  area?: string;
  categoryKey?: string;
  tagKey?: string;
  isRecommended?: boolean;
  isPinned?: boolean;
  createdAt: string | null;
};

export type ContentDetail = ContentItem & {
  description: string;
  images: string[];
  reviewNote: string | null;
  publisherPhone: string | null;
  publisherCity: string | null;
};

export type VerificationRow = {
  id: string;
  userId: string;
  nickname: string | null;
  phone: string | null;
  status: string;
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
  status: string;
  reporter: string;
  reporterId: string;
  createdAt: string | null;
};

export type ReportDetail = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  evidenceUrls: string[];
  status: string;
  handlerNote: string | null;
  reporter: { id: string; nickname: string | null; phone: string | null };
  reportedUser: { id: string; nickname: string; phone: string } | null;
  targetSummary: Record<string, unknown> | null;
  createdAt: string | null;
};

export type OrderRow = {
  id: number;
  buyer: string | null;
  buyerId?: string;
  seller: string | null;
  sellerId?: string;
  title: string | null;
  amount: number;
  status: string;
  paymentStatus: string | null;
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

export type CategoryRow = {
  id: number;
  type: string;
  key: string;
  labelEn: string;
  labelZh: string;
  sortOrder: number;
  enabled: boolean;
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

export const adminApi = {
  login(phone: string, password: string) {
    return request<{ accessToken: string }>('/v1/admin/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
  },
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

  content: (reviewStatus?: string, contentType?: string, page = 1) => {
    const params = new URLSearchParams({ page: String(page) });
    if (reviewStatus) params.set('reviewStatus', reviewStatus);
    if (contentType) params.set('contentType', contentType);
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
  chatTranscript: (id: string) =>
    request<{ messages: { senderId: string; text: string; sentAt: string | null }[] }>(
      `/v1/admin/reports/${id}/chat-transcript`,
    ),

  orders: () => request<{ items: OrderRow[] }>('/v1/admin/orders'),
  order: (id: number) => request<OrderDetail>(`/v1/admin/orders/${id}`),
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
};
