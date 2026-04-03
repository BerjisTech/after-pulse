// ─── AfterPulse Constants ───

export const APP_NAME = "AfterPulse";
export const APP_TAGLINE = "AI-Powered Post-Purchase Upsells";

// ─── Brand Colors ───
export const BRAND_COLORS = {
  teal: "#0D9488",
  indigo: "#4F46E5",
  white: "#FFFFFF",
  dark: "#0F172A",
  gray: {
    50: "#F8FAFC",
    100: "#F1F5F9",
    200: "#E2E8F0",
    300: "#CBD5E1",
    400: "#94A3B8",
    500: "#64748B",
    600: "#475569",
    700: "#334155",
    800: "#1E293B",
    900: "#0F172A",
  },
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
} as const;

// ─── Offer Types ───
export const OFFER_TYPES = {
  SINGLE: "single",
  BUNDLE: "bundle",
  DISCOUNT: "discount",
} as const;

export const OFFER_TYPE_LABELS: Record<string, string> = {
  single: "Single Product",
  bundle: "Product Bundle",
  discount: "Discount Offer",
};

// ─── Offer Statuses ───
export const OFFER_STATUSES = {
  DRAFT: "draft",
  ACTIVE: "active",
  PAUSED: "paused",
  ARCHIVED: "archived",
} as const;

export const OFFER_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  archived: "Archived",
};

export const OFFER_STATUS_TONES: Record<string, string> = {
  draft: "info",
  active: "success",
  paused: "caution",
  archived: "subdued",
};

// ─── Placement Options ───
export const PLACEMENTS = {
  POST_PURCHASE: "post_purchase",
  THANK_YOU: "thank_you",
  ORDER_STATUS: "order_status",
} as const;

export const PLACEMENT_LABELS: Record<string, string> = {
  post_purchase: "Post-Purchase (Shopify Plus)",
  thank_you: "Thank You Page",
  order_status: "Order Status Page",
};

// ─── Discount Types ───
export const DISCOUNT_TYPES = {
  PERCENTAGE: "percentage",
  FIXED: "fixed",
  FREE_SHIPPING: "free_shipping",
} as const;

export const DISCOUNT_TYPE_LABELS: Record<string, string> = {
  percentage: "Percentage Off",
  fixed: "Fixed Amount Off",
  free_shipping: "Free Shipping",
};

// ─── AI Providers ───
export const AI_PROVIDERS = {
  OPENAI: "openai",
  CLAUDE: "claude",
  GEMINI: "gemini",
} as const;

export const AI_PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI (GPT-4)",
  claude: "Anthropic (Claude)",
  gemini: "Google (Gemini)",
};

// ─── Analytics Event Types ───
export const EVENT_TYPES = {
  IMPRESSION: "impression",
  CLICK: "click",
  CONVERSION: "conversion",
  DISMISS: "dismiss",
} as const;

// ─── Default Offer Headlines ───
export const DEFAULT_HEADLINES: Record<string, string> = {
  single: "Complete your look with this perfect addition",
  bundle: "Save more with this exclusive bundle",
  discount: "Special offer just for you!",
};

// ─── Pagination ───
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ─── Chart Date Ranges ───
export const DATE_RANGES = {
  TODAY: "today",
  LAST_7: "last_7",
  LAST_30: "last_30",
  LAST_90: "last_90",
  CUSTOM: "custom",
} as const;

export const DATE_RANGE_LABELS: Record<string, string> = {
  today: "Today",
  last_7: "Last 7 days",
  last_30: "Last 30 days",
  last_90: "Last 90 days",
  custom: "Custom range",
};
