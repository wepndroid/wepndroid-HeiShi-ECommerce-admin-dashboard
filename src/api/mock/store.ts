// Mock data store for the Admin Web running without a backend (frontend + mock phase).
// State is seeded once and persisted to localStorage so admin actions (ban, approve,
// resolve dispute, config edits) survive navigation and reload.
import type {
  BannerRow,
  BundleItem,
  CategoryRow,
  ChatMessage,
  ContentDetail,
  KeywordRow,
  OrderDetail,
  Party,
  PlatformSettings,
  ProductTagRow,
  RegionRow,
  ReportDetail,
  ReportReasonRow,
  ReviewDetail,
  TopicRow,
  UserDetail,
  VerificationDetail,
} from '../client';

const DB_KEY = 'heymarket_admin_mock_db';
// Bump when the seed shape changes so persisted localStorage reseeds with new fields.
const DB_VERSION = 9;

export type TranscriptMsg = { senderId: string; text: string; sentAt: string | null };

export interface MockDb {
  version: number;
  users: UserDetail[];
  content: ContentDetail[];
  verifications: VerificationDetail[];
  reports: ReportDetail[];
  orders: OrderDetail[];
  reviews: ReviewDetail[];
  categories: CategoryRow[];
  regions: RegionRow[];
  banners: BannerRow[];
  topics: TopicRow[];
  keywords: KeywordRow[];
  reportReasons: ReportReasonRow[];
  productTags: ProductTagRow[];
  settings: PlatformSettings;
  transcripts: Record<string, TranscriptMsg[]>;
  // Buyer↔seller conversations keyed by order id — same ChatMessage shape as the mobile app.
  orderChats: Record<string, ChatMessage[]>;
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}

function img(seed: string): string {
  return `https://picsum.photos/seed/${seed}/480/480`;
}

// Portrait avatars mirror the mobile app's PERSON_AVATAR_URLS (Frontend/src/data/avatarPhotos.ts):
// real Pexels photos, keyed by the user's first name, with a shared default fallback.
const AVATAR_URLS: Record<string, string> = {
  amy: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg',
  ben: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg',
  chloe: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
  dan: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg',
  ella: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg',
  frank: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg',
  grace: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg',
  default: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg',
};

// Same field name (avatarUrl) and Pexels-resize params (?auto=compress…&w=&h=&fit=crop) as mobile.
function avatarPhoto(nickname: string): string {
  const key = nickname.trim().toLowerCase().split(' ')[0];
  const base = AVATAR_URLS[key] ?? AVATAR_URLS.default;
  return `${base}?auto=compress&cs=tinysrgb&w=128&h=128&fit=crop`;
}

function seed(): MockDb {
  const today = new Date().toISOString();

  const users: UserDetail[] = ([
    { id: 'u1', nickname: 'Amy', phone: '0400000001', city: 'Melbourne', identityVerified: true, accountStatus: 'normal', createdAt: daysAgo(120), businessVerified: false, banReason: null, adminNotes: null, listingCount: 3, orderCount: 5 },
    { id: 'u2', nickname: 'Ben', phone: '0400000002', city: 'Sydney', identityVerified: false, accountStatus: 'normal', createdAt: daysAgo(70), businessVerified: false, banReason: null, adminNotes: null, listingCount: 2, orderCount: 1 },
    { id: 'u3', nickname: 'Chloe', phone: '0400000003', city: 'Melbourne', identityVerified: true, accountStatus: 'normal', createdAt: daysAgo(45), businessVerified: false, banReason: null, adminNotes: null, listingCount: 2, orderCount: 3 },
    { id: 'u4', nickname: 'Dan', phone: '0400000004', city: 'Brisbane', identityVerified: false, accountStatus: 'banned', createdAt: daysAgo(30), businessVerified: false, banReason: 'Repeated prohibited-item listings', adminNotes: 'Escalated 2026-06-20', listingCount: 1, orderCount: 0 },
    { id: 'u5', nickname: 'Ella', phone: '0400000005', city: 'Perth', identityVerified: true, accountStatus: 'normal', createdAt: daysAgo(20), businessVerified: true, banReason: null, adminNotes: null, listingCount: 2, orderCount: 2 },
    { id: 'u6', nickname: 'Frank', phone: '0400000006', city: 'Melbourne', identityVerified: false, accountStatus: 'normal', createdAt: today, businessVerified: false, banReason: null, adminNotes: null, listingCount: 1, orderCount: 0 },
    { id: 'u7', nickname: 'Grace', phone: '0400000007', city: 'Adelaide', identityVerified: true, accountStatus: 'normal', createdAt: today, businessVerified: false, banReason: null, adminNotes: null, listingCount: 0, orderCount: 1 },
    { id: 'u8', nickname: 'HeyMarket User', phone: '0400000000', city: 'Melbourne', identityVerified: false, accountStatus: 'normal', createdAt: daysAgo(5), businessVerified: false, banReason: null, adminNotes: null, listingCount: 0, orderCount: 4 },
  ] as Omit<UserDetail, 'avatarUrl' | 'isMuted' | 'muteReason' | 'publishRestricted' | 'publishRestrictReason' | 'isFlagged' | 'flagReason'>[]).map((u) => ({
    ...u,
    avatarUrl: avatarPhoto(u.nickname),
    // Demo moderation state: Dan (banned) is also flagged; Ben is muted for off-platform pitching.
    isMuted: u.id === 'u2',
    muteReason: u.id === 'u2' ? 'Repeatedly pushed off-platform payment in chat' : null,
    publishRestricted: u.id === 'u4',
    publishRestrictReason: u.id === 'u4' ? 'Prohibited-item listings under review' : null,
    isFlagged: u.id === 'u4',
    flagReason: u.id === 'u4' ? 'Abnormal account — multiple reports' : null,
  }));

  // Enriches a compact seed row into a full ContentDetail — seller trust is derived from the
  // publishing user, and type-appropriate defaults fill trade options so every post is complete.
  type SeedContent = {
    id: number; type: ContentDetail['type']; title: string; price: number;
    reviewStatus: ContentDetail['reviewStatus']; status: NonNullable<ContentDetail['status']>; publisherId: string;
    city: string; area: string; categoryKey: string; tagKey: string;
    createdAt: string; description: string; images: string[];
    views: number; favorites: number;
    isRecommended?: boolean; isPinned?: boolean; reviewNote?: string;
    conditionKey?: string; serviceIcon?: string; merchantPost?: boolean;
    negotiable?: boolean; escrowSupported?: boolean; meetInPublic?: boolean;
    pickupMethods?: string[]; rating?: number;
    bundle?: { allowSeparateSale: boolean; pickupWindow: string | null; pickupDeadline: string | null; items: BundleItem[] };
  };

  const mkContent = (c: SeedContent): ContentDetail => {
    const u = users.find((x) => x.id === c.publisherId)!;
    return {
      id: c.id, type: c.type, title: c.title, price: c.price,
      reviewStatus: c.reviewStatus, status: c.status,
      publisher: { id: u.id, nickname: u.nickname, avatarUrl: u.avatarUrl, phone: u.phone },
      city: c.city, area: c.area, categoryKey: c.categoryKey, tagKey: c.tagKey,
      isRecommended: c.isRecommended ?? false, isPinned: c.isPinned ?? false,
      createdAt: c.createdAt,
      description: c.description, images: c.images, reviewNote: c.reviewNote ?? null,
      publisherCity: u.city,
      locationLabel: `${c.area}, ${c.city}`,
      currency: 'AUD',
      negotiable: c.negotiable ?? false,
      escrowSupported: c.escrowSupported ?? (c.type === 'product' || c.type === 'service' || c.type === 'bundle'),
      meetInPublic: c.meetInPublic ?? (c.type === 'product' || c.type === 'bundle'),
      pickupMethods: c.pickupMethods ?? (c.type === 'product' || c.type === 'bundle' ? ['meetup'] : []),
      conditionKey: c.conditionKey ?? null,
      serviceIcon: c.serviceIcon ?? null,
      merchantPost: c.merchantPost ?? false,
      sellerTrades: u.orderCount,
      sellerRating: c.rating ?? 98,
      sellerVerified: u.identityVerified,
      viewCount: c.views, favoriteCount: c.favorites, updatedAt: c.createdAt,
      bundleMeta: c.bundle
        ? {
            allowSeparateSale: c.bundle.allowSeparateSale,
            pickupWindow: c.bundle.pickupWindow,
            pickupDeadline: c.bundle.pickupDeadline,
            items: c.bundle.items,
          }
        : null,
    };
  };

  const content: ContentDetail[] = [
    mkContent({ id: 1, type: 'product', title: 'iPhone 13 128GB', price: 650, reviewStatus: 'pendingReview', status: 'draft', publisherId: 'u1', city: 'Melbourne', area: 'Clayton', categoryKey: 'digital', tagKey: 'lightlyUsed', createdAt: daysAgo(1), description: 'Excellent condition, boxed, battery health 92%.', images: [img('iphone1'), img('iphone2')], views: 342, favorites: 28, conditionKey: 'likeNew90', negotiable: true, pickupMethods: ['meetup', 'delivery'], rating: 99 }),
    mkContent({ id: 2, type: 'product', title: 'IKEA study desk', price: 80, reviewStatus: 'approved', status: 'active', publisherId: 'u3', city: 'Melbourne', area: 'Box Hill', categoryKey: 'home', tagKey: 'lightlyUsed', createdAt: daysAgo(6), description: 'White desk, minor scratches, pickup only.', images: [img('desk1')], reviewNote: 'Approved 2026-06-25', views: 156, favorites: 12, conditionKey: 'lightlyUsed', isRecommended: true, pickupMethods: ['meetup'] }),
    mkContent({ id: 3, type: 'service', title: 'Two-person moving help', price: 120, reviewStatus: 'pendingReview', status: 'draft', publisherId: 'u5', city: 'Perth', area: 'Cannington', categoryKey: 'moving', tagKey: 'localService', createdAt: daysAgo(2), description: 'Van + two movers, hourly rate. Weekends available.', images: [img('moving1')], views: 88, favorites: 5, serviceIcon: 'truck' }),
    mkContent({ id: 4, type: 'job', title: 'Cafe waiter (casual)', price: 28, reviewStatus: 'pendingReview', status: 'draft', publisherId: 'u2', city: 'Sydney', area: 'Haymarket', categoryKey: 'hospitality', tagKey: 'localJob', createdAt: daysAgo(1), description: 'Weekend shifts, $28/hr, must have working rights.', images: [img('cafe1')], views: 210, favorites: 9, merchantPost: false }),
    mkContent({ id: 5, type: 'rental', title: 'Carlton room sublet', price: 260, reviewStatus: 'approved', status: 'active', publisherId: 'u1', city: 'Melbourne', area: 'Carlton', categoryKey: 'room', tagKey: 'rental', createdAt: daysAgo(8), description: 'Furnished room, bills included, female preferred.', images: [img('room1')], views: 176, favorites: 22, isPinned: true, negotiable: true }),
    mkContent({ id: 6, type: 'product', title: 'Replica designer bag', price: 40, reviewStatus: 'rejected', status: 'inactive', publisherId: 'u2', city: 'Sydney', area: 'Eastwood', categoryKey: 'fashion', tagKey: 'lightlyUsed', createdAt: daysAgo(4), description: 'AAA replica, great quality.', images: [img('bag1')], reviewNote: 'Rejected: counterfeit/replica prohibited.', views: 64, favorites: 3, conditionKey: 'lightlyUsed' }),
    mkContent({ id: 7, type: 'service', title: 'End-of-lease cleaning', price: 90, reviewStatus: 'approved', status: 'active', publisherId: 'u5', city: 'Perth', area: 'Willetton', categoryKey: 'cleaning', tagKey: 'localService', createdAt: daysAgo(10), description: 'Bond-back guarantee, eco products.', images: [img('clean1')], views: 132, favorites: 7, serviceIcon: 'broom' }),
    mkContent({ id: 8, type: 'product', title: '3-seat sofa', price: 150, reviewStatus: 'removed', status: 'inactive', publisherId: 'u4', city: 'Brisbane', area: 'Sunnybank', categoryKey: 'home', tagKey: 'lightlyUsed', createdAt: daysAgo(12), description: 'Grey fabric sofa, some wear.', images: [img('sofa1')], reviewNote: 'Removed after report.', views: 95, favorites: 6, conditionKey: 'lightlyUsed', negotiable: true, pickupMethods: ['meetup', 'delivery'] }),
    mkContent({ id: 9, type: 'product', title: 'Sony A6400 camera', price: 420, reviewStatus: 'pendingReview', status: 'draft', publisherId: 'u3', city: 'Melbourne', area: 'Southbank', categoryKey: 'digital', tagKey: 'lightlyUsed', createdAt: daysAgo(1), description: 'With 16-50mm kit lens, 8k shutter count.', images: [img('cam1'), img('cam2')], views: 288, favorites: 19, conditionKey: 'lightlyUsed', negotiable: true, pickupMethods: ['meetup', 'delivery'] }),
    mkContent({ id: 10, type: 'job', title: 'Warehouse packer', price: 30, reviewStatus: 'approved', status: 'active', publisherId: 'u6', city: 'Melbourne', area: 'Melbourne CBD', categoryKey: 'hospitality', tagKey: 'localJob', createdAt: daysAgo(3), description: 'Day shifts, $30/hr, immediate start.', images: [img('warehouse1')], views: 141, favorites: 8, merchantPost: true }),
    mkContent({ id: 11, type: 'bundle', title: 'Graduation clearance bundle', price: 180, reviewStatus: 'pendingReview', status: 'draft', publisherId: 'u1', city: 'Melbourne', area: 'Clayton', categoryKey: 'home', tagKey: 'graduationClearance', createdAt: daysAgo(1), description: 'Everything must go before I fly home — desk, chair, lamp and kettle. Buy the lot or single items.', images: [img('bundle1'), img('bundle2')], views: 120, favorites: 15, negotiable: true, bundle: { allowSeparateSale: true, pickupWindow: 'Mon–Fri 10:00–17:00', pickupDeadline: daysAgo(-14), items: [
      { title: 'Study desk', sharePrice: 60, separatePrice: 80, status: 'available' },
      { title: 'Office chair', sharePrice: 50, separatePrice: 65, status: 'available' },
      { title: 'Desk lamp', sharePrice: 25, separatePrice: null, status: 'onHold' },
      { title: 'Electric kettle', sharePrice: 45, separatePrice: 55, status: 'sold' },
    ] } }),
  ];

  const verifications: VerificationDetail[] = [
    { id: 'v1', userId: 'u2', nickname: 'Ben', phone: '0400000002', status: 'pending', legalName: 'Ben Zhao', createdAt: daysAgo(2), idCountry: 'AU', idFrontUrl: img('idfront1'), idBackUrl: img('idback1'), businessName: null, businessRegUrl: null, abn: null, rejectionReason: null, reviewedAt: null },
    { id: 'v2', userId: 'u1', nickname: 'Amy', phone: '0400000001', status: 'approved', legalName: 'Amy Wang', createdAt: daysAgo(100), idCountry: 'AU', idFrontUrl: img('idfront2'), idBackUrl: img('idback2'), businessName: null, businessRegUrl: null, abn: null, rejectionReason: null, reviewedAt: daysAgo(98) },
    { id: 'v3', userId: 'u4', nickname: 'Dan', phone: '0400000004', status: 'rejected', legalName: 'Dan Li', createdAt: daysAgo(28), idCountry: 'AU', idFrontUrl: img('idfront3'), idBackUrl: null, businessName: null, businessRegUrl: null, abn: null, rejectionReason: 'ID photo unreadable', reviewedAt: daysAgo(27) },
    { id: 'v4', userId: 'u5', nickname: 'Ella', phone: '0400000005', status: 'pending', legalName: 'Ella Chen', createdAt: daysAgo(1), idCountry: 'AU', idFrontUrl: img('idfront4'), idBackUrl: img('idback4'), businessName: 'Ella Cleaning Co', businessRegUrl: img('bizreg1'), abn: '12345678901', rejectionReason: null, reviewedAt: null },
  ];

  const reports: ReportDetail[] = [
    { id: 'r1', targetType: 'listing', targetId: '6', reason: 'Counterfeit / replica', details: 'This is a fake designer bag.', evidenceUrls: [img('ev1'), img('ev2')], status: 'pending', handlerNote: null, reporter: { id: 'u3', nickname: 'Chloe', phone: '0400000003' }, reportedUser: { id: 'u2', nickname: 'Ben', phone: '0400000002' }, targetSummary: { title: 'Replica designer bag', price: 40 }, createdAt: daysAgo(2) },
    { id: 'r2', targetType: 'user', targetId: 'u4', reason: 'Harassment in chat', details: 'Sent abusive messages.', evidenceUrls: [img('ev3')], status: 'pending', handlerNote: null, reporter: { id: 'u5', nickname: 'Ella', phone: '0400000005' }, reportedUser: { id: 'u4', nickname: 'Dan', phone: '0400000004' }, targetSummary: null, createdAt: daysAgo(3) },
    { id: 'r3', targetType: 'chat', targetId: 'conv-1', reason: 'Suspected scam', details: 'Asked to pay off-platform.', evidenceUrls: [], status: 'pending', handlerNote: null, reporter: { id: 'u8', nickname: 'HeyMarket User', phone: '0400000000' }, reportedUser: { id: 'u2', nickname: 'Ben', phone: '0400000002' }, targetSummary: null, createdAt: daysAgo(1) },
    { id: 'r4', targetType: 'order', targetId: '3', reason: 'Item not as described', details: 'Service not delivered as agreed.', evidenceUrls: [img('ev4')], status: 'processed', handlerNote: 'Advised buyer to open dispute.', reporter: { id: 'u8', nickname: 'HeyMarket User', phone: '0400000000' }, reportedUser: { id: 'u5', nickname: 'Ella', phone: '0400000005' }, targetSummary: { amount: 120 }, createdAt: daysAgo(5) },
  ];

  // Build a nested Party (mirrors the mobile app's embedded buyer/seller) from the users table.
  const party = (id: string): Party => {
    const u = users.find((x) => x.id === id)!;
    return { id: u.id, nickname: u.nickname, avatarUrl: u.avatarUrl, phone: u.phone };
  };

  const orders: OrderDetail[] = [
    { id: 1, buyer: party('u8'), seller: party('u1'), title: 'iPhone 13 128GB', amount: 650, status: 'pendingReceive', paymentStatus: 'succeeded', pspTransactionId: 'pi_sim_1', createdAt: daysAgo(3), listingId: 1, escrowFee: 0.99, paymentMethod: 'card', psp: 'stripe', pspPaymentId: 'pi_sim_1', payoutPaused: false, isAbnormal: false, adminNotes: null, disputeStatus: null, disputeReason: null },
    { id: 2, buyer: party('u3'), seller: party('u1'), title: 'IKEA study desk', amount: 80, status: 'completed', paymentStatus: 'succeeded', pspTransactionId: 'pi_sim_2', createdAt: daysAgo(20), listingId: 2, escrowFee: 0.99, paymentMethod: 'paypal', psp: 'paypal', pspPaymentId: 'pp_sim_2', payoutPaused: false, isAbnormal: false, adminNotes: null, disputeStatus: null, disputeReason: null },
    { id: 3, buyer: party('u8'), seller: party('u5'), title: 'Two-person moving help', amount: 120, status: 'inDispute', paymentStatus: 'succeeded', pspTransactionId: 'pi_sim_3', createdAt: daysAgo(6), listingId: 3, escrowFee: 0.99, paymentMethod: 'card', psp: 'stripe', pspPaymentId: 'pi_sim_3', payoutPaused: true, isAbnormal: false, adminNotes: null, disputeStatus: 'open', disputeReason: 'Service not delivered as agreed.' },
    { id: 4, buyer: party('u2'), seller: party('u3'), title: 'Sony A6400 camera', amount: 420, status: 'pendingPay', paymentStatus: 'pending', pspTransactionId: null, createdAt: daysAgo(1), listingId: 9, escrowFee: 0.99, paymentMethod: null, psp: null, pspPaymentId: null, payoutPaused: false, isAbnormal: false, adminNotes: null, disputeStatus: null, disputeReason: null },
    { id: 5, buyer: party('u5'), seller: party('u1'), title: 'Carlton room sublet', amount: 260, status: 'refundInProgress', paymentStatus: 'succeeded', pspTransactionId: 'pi_sim_5', createdAt: daysAgo(9), listingId: 5, escrowFee: 0.99, paymentMethod: 'card', psp: 'stripe', pspPaymentId: 'pi_sim_5', payoutPaused: true, isAbnormal: true, adminNotes: 'Buyer requested refund.', disputeStatus: 'open', disputeReason: 'Room already taken on arrival.' },
    { id: 6, buyer: party('u8'), seller: party('u5'), title: 'End-of-lease cleaning', amount: 90, status: 'pendingShip', paymentStatus: 'succeeded', pspTransactionId: 'pi_sim_6', createdAt: daysAgo(2), listingId: 7, escrowFee: 0.99, paymentMethod: 'wechat', psp: 'stripe', pspPaymentId: 'pi_sim_6', payoutPaused: false, isAbnormal: false, adminNotes: null, disputeStatus: null, disputeReason: null },
  ];

  const categories: CategoryRow[] = [
    { id: 1, type: 'product', key: 'digital', labelEn: 'Digital', labelZh: '数码', sortOrder: 1, enabled: true, icon: 'smartphone', showOnHome: true },
    { id: 2, type: 'product', key: 'home', labelEn: 'Home', labelZh: '家居', sortOrder: 2, enabled: true, icon: 'sofa', showOnHome: true },
    { id: 3, type: 'product', key: 'fashion', labelEn: 'Fashion', labelZh: '服饰', sortOrder: 3, enabled: true, icon: 'shirt', showOnHome: true },
    { id: 4, type: 'service', key: 'moving', labelEn: 'Moving', labelZh: '搬家', sortOrder: 1, enabled: true, icon: 'truck', showOnHome: true },
    { id: 5, type: 'service', key: 'cleaning', labelEn: 'Cleaning', labelZh: '清洁', sortOrder: 2, enabled: true, icon: 'sparkles', showOnHome: false },
    { id: 6, type: 'job', key: 'hospitality', labelEn: 'Hospitality', labelZh: '餐饮', sortOrder: 1, enabled: true, icon: 'utensils', showOnHome: true },
    { id: 7, type: 'rental', key: 'room', labelEn: 'Room', labelZh: '房间', sortOrder: 1, enabled: true, icon: 'bed', showOnHome: true },
    { id: 8, type: 'product', key: 'beauty', labelEn: 'Beauty', labelZh: '美妆', sortOrder: 4, enabled: false, icon: 'palette', showOnHome: false },
  ];

  const reviews: ReviewDetail[] = [
    { id: 'rv1', orderId: 2, rating: 5, comment: 'Great desk, exactly as described. Smooth pickup.', isHidden: false, isRemoved: false, reviewer: party('u3'), listingId: 2, listingTitle: 'IKEA study desk', createdAt: daysAgo(18), adminNote: null, reviewee: party('u1'), listing: content.find((c) => c.id === 2) ?? null, qualityRating: 5, communicationRating: 5, expertiseRating: null, professionalismRating: null, hireAgainRating: null },
    { id: 'rv2', orderId: 3, rating: 1, comment: 'Never showed up and then went silent. Total waste of my Saturday!!!', isHidden: false, isRemoved: false, reviewer: party('u8'), listingId: 3, listingTitle: 'Two-person moving help', createdAt: daysAgo(4), adminNote: null, reviewee: party('u5'), listing: content.find((c) => c.id === 3) ?? null, qualityRating: 1, communicationRating: 1, expertiseRating: 2, professionalismRating: 1, hireAgainRating: 1 },
    { id: 'rv3', orderId: 6, rating: 2, comment: 'Buy elsewhere, contact me on wechat abc123 for cheaper deals', isHidden: true, isRemoved: false, reviewer: party('u8'), listingId: 7, listingTitle: 'End-of-lease cleaning', createdAt: daysAgo(1), adminNote: 'Hidden: solicitation / off-platform contact.', reviewee: party('u5'), listing: content.find((c) => c.id === 7) ?? null, qualityRating: 2, communicationRating: 2, expertiseRating: null, professionalismRating: null, hireAgainRating: null },
  ];

  const topics: TopicRow[] = [
    { id: 1, title: 'Graduation clearance zone', titleZh: '毕业二手清仓专区', subtitle: 'Everything students need before they fly home', coverImageUrl: img('topic-grad'), tagKey: 'graduation', linkUrl: '/topic/graduation', onlineAt: daysAgo(6), offlineAt: null, sortOrder: 0, enabled: true },
    { id: 2, title: 'New arrivals', titleZh: '新上架专区', subtitle: 'Fresh listings this week', coverImageUrl: img('topic-new'), tagKey: 'new', linkUrl: '/topic/new', onlineAt: daysAgo(2), offlineAt: null, sortOrder: 1, enabled: true },
    { id: 3, title: 'Winter warmers', titleZh: '冬季专场', subtitle: 'Heaters, coats & more', coverImageUrl: img('topic-winter'), tagKey: null, linkUrl: null, onlineAt: null, offlineAt: null, sortOrder: 2, enabled: false },
  ];

  const keywords: KeywordRow[] = [
    { id: 1, pattern: 'replica', locale: 'all', active: true },
    { id: 2, pattern: '代购', locale: 'zh', active: true },
    { id: 3, pattern: 'bank transfer', locale: 'en', active: true },
    { id: 4, pattern: 'wechat', locale: 'all', active: true },
    { id: 5, pattern: '刀', locale: 'zh', active: false },
  ];

  const reportReasons: ReportReasonRow[] = [
    { id: 1, key: 'prohibited', labelEn: 'Prohibited item', labelZh: '违禁物品', sortOrder: 0, active: true },
    { id: 2, key: 'counterfeit', labelEn: 'Counterfeit / fake', labelZh: '假冒伪劣', sortOrder: 1, active: true },
    { id: 3, key: 'fraud', labelEn: 'Fraud / scam', labelZh: '欺诈骗局', sortOrder: 2, active: true },
    { id: 4, key: 'offensive', labelEn: 'Offensive content', labelZh: '不当内容', sortOrder: 3, active: true },
    { id: 5, key: 'spam', labelEn: 'Spam / advertising', labelZh: '垃圾广告', sortOrder: 4, active: true },
    { id: 6, key: 'other', labelEn: 'Other', labelZh: '其他', sortOrder: 5, active: true },
  ];

  const productTags: ProductTagRow[] = [
    { id: 1, key: 'hot', labelEn: 'Hot', labelZh: '热门', sortOrder: 0, active: true },
    { id: 2, key: 'new', labelEn: 'New arrival', labelZh: '新上架', sortOrder: 1, active: true },
    { id: 3, key: 'clearance', labelEn: 'Clearance', labelZh: '清仓', sortOrder: 2, active: true },
    { id: 4, key: 'graduation', labelEn: 'Graduation sale', labelZh: '毕业清仓', sortOrder: 3, active: true },
    { id: 5, key: 'negotiable', labelEn: 'Negotiable', labelZh: '可议价', sortOrder: 4, active: true },
  ];

  const settings: PlatformSettings = {
    'home.module.banners': 'on',
    'home.module.categories': 'on',
    'home.module.recommended': 'on',
    'home.module.graduationZone': 'on',
    'legal.userAgreement': 'By using HeyMarket you agree to trade responsibly and follow all local laws.',
    'legal.privacyPolicy': 'We collect only what is needed to run the marketplace and never sell your data.',
  };

  const regions: RegionRow[] = [
    { id: 1, country: 'AU', state: 'VIC', city: 'Melbourne', area: null, labelEn: 'Melbourne', labelZh: '墨尔本', isDefaultCity: true, sortOrder: 1, enabled: true },
    { id: 2, country: 'AU', state: 'NSW', city: 'Sydney', area: null, labelEn: 'Sydney', labelZh: '悉尼', isDefaultCity: false, sortOrder: 2, enabled: true },
    { id: 3, country: 'AU', state: 'QLD', city: 'Brisbane', area: null, labelEn: 'Brisbane', labelZh: '布里斯班', isDefaultCity: false, sortOrder: 3, enabled: true },
    { id: 4, country: 'AU', state: 'WA', city: 'Perth', area: null, labelEn: 'Perth', labelZh: '珀斯', isDefaultCity: false, sortOrder: 4, enabled: true },
    { id: 5, country: 'AU', state: 'SA', city: 'Adelaide', area: null, labelEn: 'Adelaide', labelZh: '阿德莱德', isDefaultCity: false, sortOrder: 5, enabled: true },
    { id: 6, country: 'AU', state: 'ACT', city: 'Canberra', area: null, labelEn: 'Canberra', labelZh: '堪培拉', isDefaultCity: false, sortOrder: 6, enabled: false },
  ];

  const banners: BannerRow[] = [
    { id: 'b1', title: '同城担保交易更安心', imageUrl: img('banner1'), linkUrl: '/safety', position: 'home', onlineAt: daysAgo(10), offlineAt: null, enabled: true },
    { id: 'b2', title: '毕业季清仓专场', imageUrl: img('banner2'), linkUrl: '/category', position: 'category', onlineAt: daysAgo(5), offlineAt: null, enabled: true },
    { id: 'b3', title: 'Real reviews, verified sellers', imageUrl: img('banner3'), linkUrl: null, position: 'home', onlineAt: null, offlineAt: null, enabled: false },
  ];

  const transcripts: Record<string, TranscriptMsg[]> = {
    r3: [
      { senderId: 'u2', text: 'Hi, is this still available?', sentAt: daysAgo(1) },
      { senderId: 'u8', text: 'Yes it is.', sentAt: daysAgo(1) },
      { senderId: 'u2', text: 'Can you take payment via bank transfer outside the app? I can pay more.', sentAt: daysAgo(1) },
      { senderId: 'u8', text: "That's against the rules, please use escrow.", sentAt: daysAgo(1) },
    ],
  };

  // Full buyer↔seller conversations for disputed orders (senderId matches order buyerId/sellerId).
  const orderChats: Record<string, ChatMessage[]> = {
    // Order 3: buyer u8 (HeyMarket User) ↔ seller u5 (Ella) — moving service not delivered.
    '3': [
      { id: 'oc3-1', conversationId: 'conv-order-3', senderId: 'u8', text: 'Hi, are you free to help me move this Saturday morning?', sentAt: daysAgo(7), ackRead: true },
      { id: 'oc3-2', conversationId: 'conv-order-3', senderId: 'u5', text: 'Yes, 9am works. $120 for two movers plus the van.', sentAt: daysAgo(7), ackRead: true },
      { id: 'oc3-3', conversationId: 'conv-order-3', senderId: 'u8', text: 'Perfect, I’ve booked and paid through escrow.', sentAt: daysAgo(6), ackRead: true },
      { id: 'oc3-4', conversationId: 'conv-order-3', senderId: 'u8', text: 'It’s 9:40 and nobody has arrived. Are you coming?', sentAt: daysAgo(5), ackRead: true },
      { id: 'oc3-5', conversationId: 'conv-order-3', senderId: 'u5', text: 'So sorry, the van broke down this morning. Can we reschedule to Sunday?', sentAt: daysAgo(5), ackRead: false },
      { id: 'oc3-6', conversationId: 'conv-order-3', senderId: 'u8', text: 'I had to hire someone else last minute. I’d like a refund please.', sentAt: daysAgo(4), ackRead: false },
    ],
    // Order 5: buyer u5 (Ella) ↔ seller u1 (Amy) — room already taken on arrival.
    '5': [
      { id: 'oc5-1', conversationId: 'conv-order-5', senderId: 'u5', text: 'Is the Carlton room still available from next week?', sentAt: daysAgo(11), ackRead: true },
      { id: 'oc5-2', conversationId: 'conv-order-5', senderId: 'u1', text: 'Yes it is! $260/week, bills included.', sentAt: daysAgo(11), ackRead: true },
      { id: 'oc5-3', conversationId: 'conv-order-5', senderId: 'u5', text: 'Great, I’ve paid the first week through the app.', sentAt: daysAgo(10), ackRead: true },
      { id: 'oc5-4', conversationId: 'conv-order-5', senderId: 'u5', text: 'I just arrived to move in and the room is already occupied?', sentAt: daysAgo(9), ackRead: true },
      { id: 'oc5-5', conversationId: 'conv-order-5', senderId: 'u1', text: 'I’m really sorry, my flatmate rented it out without telling me.', sentAt: daysAgo(9), ackRead: false },
    ],
  };

  return { version: DB_VERSION, users, content, verifications, reports, orders, reviews, categories, regions, banners, topics, keywords, reportReasons, productTags, settings, transcripts, orderChats };
}

// Every top-level collection a healthy MockDb must have. A cached DB missing any of
// these (e.g. persisted mid-HMR while a new collection was being added) is treated as
// stale and reseeded, so mock methods never hit `undefined.map`.
const REQUIRED_KEYS: (keyof MockDb)[] = [
  'users', 'content', 'verifications', 'reports', 'orders', 'reviews',
  'categories', 'regions', 'banners', 'topics', 'keywords', 'reportReasons',
  'productTags', 'settings', 'transcripts', 'orderChats',
];

function isHealthy(db: MockDb | null): db is MockDb {
  return !!db && db.version === DB_VERSION && REQUIRED_KEYS.every((k) => db[k] != null);
}

export function readDb(): MockDb {
  const raw = localStorage.getItem(DB_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as MockDb;
      if (isHealthy(parsed)) return parsed;
    } catch {
      // fall through to reseed
    }
  }
  const fresh = seed();
  localStorage.setItem(DB_KEY, JSON.stringify(fresh));
  return fresh;
}

export function writeDb(db: MockDb): void {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

/** Clear the mock DB (e.g. from a dev reset action). Next read reseeds. */
export function resetDb(): void {
  localStorage.removeItem(DB_KEY);
}
