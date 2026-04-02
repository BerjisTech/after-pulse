// ─── API Endpoint: Track Analytics Events ───

import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import { trackEvent } from "../lib/analytics/tracker.server";
import type { EventType } from "../lib/offers/types";

/**
 * POST /api/track
 * Body: { shop, offerId, eventType, orderId?, revenue?, metadata? }
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return Response.json({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { shop: shopDomain, offerId, eventType, orderId, revenue, metadata } = body;

    if (!shopDomain || !eventType) {
      return Response.json(
        { success: false, error: "shop and eventType are required" },
        { status: 400 },
      );
    }

    const validEventTypes: EventType[] = ["impression", "click", "conversion", "dismiss"];
    if (!validEventTypes.includes(eventType)) {
      return Response.json(
        { success: false, error: "Invalid eventType" },
        { status: 400 },
      );
    }

    const shop = await db.shop.findUnique({
      where: { shopDomain },
    });

    if (!shop) {
      return Response.json({ success: false, error: "Shop not found" }, { status: 404 });
    }

    await trackEvent({
      shopId: shop.id,
      offerId: offerId || undefined,
      eventType,
      orderId: orderId || undefined,
      revenue: revenue ? parseFloat(revenue) : undefined,
      metadata: metadata || undefined,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Track event error:", error);
    return Response.json({ success: false, error: "Internal error" }, { status: 500 });
  }
};
