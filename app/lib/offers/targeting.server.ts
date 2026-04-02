// ─── Targeting Rules Evaluator ───

import type { Offer } from "@prisma/client";
import type { OrderContext } from "./types";

/**
 * Evaluate whether an offer's targeting rules match the given order context.
 * Returns true if the offer should be shown for this order.
 * 
 * Rules use AND logic — all specified rules must pass.
 */
export function evaluateTargeting(
  offer: Offer,
  context: OrderContext,
): boolean {
  // Check minimum order value
  if (offer.targetMinOrder != null && context.orderTotal < offer.targetMinOrder) {
    return false;
  }

  // Check maximum order value
  if (offer.targetMaxOrder != null && context.orderTotal > offer.targetMaxOrder) {
    return false;
  }

  // Check country targeting
  if (offer.targetCountries) {
    try {
      const countries = parseJsonArray(offer.targetCountries);
      if (countries.length > 0 && context.countryCode) {
        if (!countries.includes(context.countryCode.toUpperCase())) {
          return false;
        }
      }
    } catch {
      // Invalid JSON — skip this rule
    }
  }

  // Check customer tag targeting
  if (offer.targetTags) {
    try {
      const requiredTags = parseJsonArray(offer.targetTags);
      if (requiredTags.length > 0) {
        const customerTags = context.customerTags.map((t) => t.toLowerCase());
        const hasMatchingTag = requiredTags.some((tag) =>
          customerTags.includes(tag.toLowerCase()),
        );
        if (!hasMatchingTag) {
          return false;
        }
      }
    } catch {
      // Invalid JSON — skip this rule
    }
  }

  // Check product targeting (trigger products)
  if (offer.targetProducts) {
    try {
      const triggerProducts = parseJsonArray(offer.targetProducts);
      if (triggerProducts.length > 0) {
        const orderProductIds = context.lineItems.map((item) => item.productId);
        const hasTriggerProduct = triggerProducts.some((productId) =>
          orderProductIds.includes(productId),
        );
        if (!hasTriggerProduct) {
          return false;
        }
      }
    } catch {
      // Invalid JSON — skip this rule
    }
  }

  return true;
}

/**
 * Parse a JSON string that may be a JSON array or a comma-separated string.
 */
function parseJsonArray(value: string): string[] {
  const trimmed = value.trim();

  // Try to parse as JSON first
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((v: unknown) => String(v).trim()).filter(Boolean);
      }
    } catch {
      // Fall through to comma parsing
    }
  }

  // Fall back to comma-separated
  return trimmed
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}
