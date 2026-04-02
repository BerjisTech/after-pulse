// ─── Validation Utilities ───

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ─── Offer Validation ───

export interface OfferInput {
  name: string;
  type: string;
  productIds: string;
  discountType?: string | null;
  discountValue?: number | null;
  headline?: string;
  description?: string;
  placement?: string;
  targetProducts?: string | null;
  targetTags?: string | null;
  targetMinOrder?: number | null;
  targetMaxOrder?: number | null;
  targetCountries?: string | null;
  priority?: number;
}

const VALID_OFFER_TYPES = ["single", "bundle", "discount"];
const VALID_PLACEMENTS = ["post_purchase", "thank_you", "order_status"];
const VALID_DISCOUNT_TYPES = ["percentage", "fixed", "free_shipping"];

export function validateOffer(input: OfferInput): ValidationResult {
  const errors: ValidationError[] = [];

  // Name
  if (!input.name || input.name.trim().length === 0) {
    errors.push({ field: "name", message: "Offer name is required" });
  } else if (input.name.length > 100) {
    errors.push({ field: "name", message: "Offer name must be 100 characters or less" });
  }

  // Type
  if (!VALID_OFFER_TYPES.includes(input.type)) {
    errors.push({ field: "type", message: `Invalid offer type. Must be one of: ${VALID_OFFER_TYPES.join(", ")}` });
  }

  // Products
  if (!input.productIds) {
    errors.push({ field: "productIds", message: "At least one product is required" });
  } else {
    try {
      const parsed = JSON.parse(input.productIds);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        errors.push({ field: "productIds", message: "At least one product is required" });
      }
    } catch {
      errors.push({ field: "productIds", message: "Invalid product data format" });
    }
  }

  // Discount
  if (input.discountType) {
    if (!VALID_DISCOUNT_TYPES.includes(input.discountType)) {
      errors.push({ field: "discountType", message: `Invalid discount type` });
    }
    if (input.discountType === "percentage") {
      if (input.discountValue == null || input.discountValue <= 0 || input.discountValue > 100) {
        errors.push({ field: "discountValue", message: "Percentage must be between 1 and 100" });
      }
    } else if (input.discountType === "fixed") {
      if (input.discountValue == null || input.discountValue <= 0) {
        errors.push({ field: "discountValue", message: "Discount amount must be greater than 0" });
      }
    }
  }

  // Placement
  if (input.placement && !VALID_PLACEMENTS.includes(input.placement)) {
    errors.push({ field: "placement", message: `Invalid placement` });
  }

  // Headline
  if (input.headline && input.headline.length > 200) {
    errors.push({ field: "headline", message: "Headline must be 200 characters or less" });
  }

  // Order value range
  if (input.targetMinOrder != null && input.targetMaxOrder != null) {
    if (input.targetMinOrder > input.targetMaxOrder) {
      errors.push({ field: "targetMinOrder", message: "Minimum order value cannot exceed maximum" });
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Settings Validation ───

export interface SettingsInput {
  aiProvider?: string;
  aiApiKey?: string;
  brandColor?: string;
  accentColor?: string;
}

const VALID_AI_PROVIDERS = ["openai", "claude"];
const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{6})$/;

export function validateSettings(input: SettingsInput): ValidationResult {
  const errors: ValidationError[] = [];

  if (input.aiProvider && !VALID_AI_PROVIDERS.includes(input.aiProvider)) {
    errors.push({ field: "aiProvider", message: "Invalid AI provider" });
  }

  if (input.aiApiKey !== undefined && input.aiApiKey.length > 0) {
    if (input.aiApiKey.length < 10) {
      errors.push({ field: "aiApiKey", message: "API key appears too short" });
    }
  }

  if (input.brandColor && !HEX_COLOR_REGEX.test(input.brandColor)) {
    errors.push({ field: "brandColor", message: "Invalid hex color format (e.g., #0D9488)" });
  }

  if (input.accentColor && !HEX_COLOR_REGEX.test(input.accentColor)) {
    errors.push({ field: "accentColor", message: "Invalid hex color format (e.g., #4F46E5)" });
  }

  return { valid: errors.length === 0, errors };
}

// ─── API Key Validation ───

export function validateApiKey(provider: string, key: string): boolean {
  if (!key || key.trim().length === 0) return false;

  switch (provider) {
    case "openai":
      return key.startsWith("sk-") && key.length > 20;
    case "claude":
      return key.startsWith("sk-ant-") && key.length > 20;
    default:
      return false;
  }
}
