// ─── AfterPulse Type Definitions ───

// ─── Offer Types ───

export type OfferType = "single" | "bundle" | "discount";
export type OfferStatus = "draft" | "active" | "paused" | "archived";
export type DiscountType = "percentage" | "fixed" | "free_shipping";
export type Placement = "post_purchase" | "thank_you" | "order_status";
export type AiProvider = "openai" | "claude" | "gemini";
export type EventType = "impression" | "click" | "conversion" | "dismiss";

// ─── Serialized Offer (from Prisma, with JSON fields parsed) ───

export interface ParsedOffer {
  id: string;
  shopId: string;
  name: string;
  type: OfferType;
  status: OfferStatus;
  priority: number;
  productIds: string[];
  discountType: DiscountType | null;
  discountValue: number | null;
  targetProducts: string[] | null;
  targetTags: string[] | null;
  targetMinOrder: number | null;
  targetMaxOrder: number | null;
  targetCountries: string[] | null;
  headline: string;
  description: string | null;
  imageUrl: string | null;
  placement: Placement;
  aiGenerated: boolean;
  aiPrompt: string | null;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Offer for Extension Rendering ───

export interface OfferForDisplay {
  id: string;
  name: string;
  type: OfferType;
  headline: string;
  description: string | null;
  imageUrl: string | null;
  discountType: DiscountType | null;
  discountValue: number | null;
  products: ProductInfo[];
}

export interface ProductInfo {
  id: string;
  title: string;
  handle: string;
  imageUrl: string | null;
  price: string;
  compareAtPrice: string | null;
  variantId: string;
}

// ─── Order Context (for offer matching) ───

export interface OrderContext {
  orderId: string;
  shopDomain: string;
  customerId: string | null;
  customerTags: string[];
  orderTotal: number;
  currency: string;
  countryCode: string;
  lineItems: OrderLineItem[];
}

export interface OrderLineItem {
  productId: string;
  variantId: string;
  title: string;
  quantity: number;
  price: number;
}

// ─── Dashboard Metrics ───

export interface DashboardMetrics {
  totalRevenue: number;
  totalImpressions: number;
  totalConversions: number;
  conversionRate: number;
  aovLift: number;
  activeOffers: number;
  revenueByDay: DailyRevenue[];
  topOffers: TopOffer[];
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  conversions: number;
}

export interface TopOffer {
  id: string;
  name: string;
  type: OfferType;
  status: OfferStatus;
  impressions: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
}

// ─── AI Suggestion ───

export interface AiSuggestion {
  headline: string;
  description: string;
  productIds: string[];
  type: OfferType;
  discountType: DiscountType | null;
  discountValue: number | null;
  reasoning: string;
}

// ─── Analytics ───

export interface AnalyticsOverview {
  totalRevenue: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  clickThroughRate: number;
  averageRevenuePerConversion: number;
  revenueByDay: DailyRevenue[];
  revenueByPlacement: Record<Placement, number>;
  topOffers: TopOffer[];
}

// ─── Shop Settings ───

export interface ShopSettings {
  id: string;
  shopDomain: string;
  aiProvider: AiProvider;
  aiApiKey: string | null;
  enableAi: boolean;
  enablePostPurchase: boolean;
  enableThankYou: boolean;
  brandColor: string;
  accentColor: string;
  currency: string;
}

// ─── API Responses ───

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
