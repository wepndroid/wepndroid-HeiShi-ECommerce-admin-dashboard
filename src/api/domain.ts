// Canonical domain shapes for the Admin Web — mirror the mobile app's domain models
// (source of truth: Frontend/src/api/types.ts). Literal-union status enums, nested party
// objects, and nested bundle meta keep the admin's data model aligned with the mobile side.

export type ListingType = 'product' | 'service' | 'bundle' | 'job' | 'rental';
export type ListingStatus = 'active' | 'draft' | 'sold' | 'inactive';
export type ReviewStatus = 'pendingReview' | 'approved' | 'rejected' | 'removed' | 'draft';
export type OrderStatus =
  | 'pendingPay'
  | 'pendingShip'
  | 'pendingService'
  | 'pendingReceive'
  | 'pendingReview'
  | 'completed'
  | 'cancelled'
  | 'inDispute'
  | 'refundInProgress';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';
export type ReportStatus = 'pending' | 'processed' | 'ignored';
export type AccountStatus = 'normal' | 'banned';
export type BundleItemStatus = 'available' | 'onHold' | 'sold';

// PSP-driven payment lifecycle — union of the exact values used in the mock store seed and
// admin transitions (store.ts: 'succeeded' | 'pending'; resolveDispute: 'refundInProgress';
// OrdersPage totals also recognise 'paid').
export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'succeeded'
  | 'approved'
  | 'created'
  | 'refundInProgress'
  | 'refunded'
  | 'cancelled';

/** A user reference embedded in another record (mirrors mobile's nested seller/buyer). */
export interface Party {
  id: string;
  nickname: string;
  avatarUrl?: string | null;
  phone?: string | null;
}

export interface BundleItem {
  id?: string;
  title: string;
  sharePrice: number;
  separatePrice: number | null;
  status: BundleItemStatus;
}
