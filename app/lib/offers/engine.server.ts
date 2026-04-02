// ─── Offer Matching Engine ───

import db from "../../db.server";
import type { OrderContext } from "./types";
import { evaluateTargeting } from "./targeting.server";

/**
 * Match active offers to an order context, filtered by targeting rules.
 * Returns offers sorted by priority (highest first).
 */
export async function matchOffersToOrder(
  shopId: string,
  orderContext: OrderContext,
  placement?: string,
  limit = 3,
) {
  const where: Record<string, unknown> = {
    shopId,
    status: "active",
  };

  if (placement) {
    where.placement = placement;
  }

  const activeOffers = await db.offer.findMany({
    where,
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  // Filter by targeting rules
  const matchedOffers = activeOffers.filter((offer) => {
    return evaluateTargeting(offer, orderContext);
  });

  // Exclude products already in the order
  const orderProductIds = new Set(
    orderContext.lineItems.map((item) => item.productId),
  );

  const filteredOffers = matchedOffers.filter((offer) => {
    try {
      const offerProductIds: string[] = JSON.parse(offer.productIds || "[]");
      // Don't offer products already in the cart
      return !offerProductIds.every((id) => orderProductIds.has(id));
    } catch {
      return true;
    }
  });

  return filteredOffers.slice(0, limit);
}
