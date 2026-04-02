// ─── API Endpoint: Fetch Offers for Extensions ───

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import db from "../db.server";
import { matchOffersToOrder } from "../lib/offers/engine.server";
import type { OrderContext } from "../lib/offers/types";

/**
 * GET /api/offers?shop=<domain>&orderId=<id>&orderTotal=<amount>&country=<code>&products=<ids>
 * Returns matched offers for the given order context.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get("shop");

  if (!shopDomain) {
    return Response.json({ success: false, error: "shop parameter required" }, { status: 400 });
  }

  const shop = await db.shop.findUnique({
    where: { shopDomain },
  });

  if (!shop) {
    return Response.json({ success: false, error: "Shop not found" }, { status: 404 });
  }

  const orderContext: OrderContext = {
    orderId: url.searchParams.get("orderId") || "",
    shopDomain,
    customerId: url.searchParams.get("customerId") || null,
    customerTags: url.searchParams.get("tags")?.split(",").filter(Boolean) || [],
    orderTotal: parseFloat(url.searchParams.get("orderTotal") || "0"),
    currency: url.searchParams.get("currency") || "USD",
    countryCode: url.searchParams.get("country") || "",
    lineItems: [],
  };

  // Parse product IDs from query params
  const productIds = url.searchParams.get("products")?.split(",").filter(Boolean) || [];
  orderContext.lineItems = productIds.map((id) => ({
    productId: id,
    variantId: "",
    title: "",
    quantity: 1,
    price: 0,
  }));

  const placement = url.searchParams.get("placement") || undefined;
  const offers = await matchOffersToOrder(shop.id, orderContext, placement);

  return Response.json({
    success: true,
    data: offers.map((offer) => ({
      id: offer.id,
      name: offer.name,
      type: offer.type,
      headline: offer.headline,
      description: offer.description,
      imageUrl: offer.imageUrl,
      discountType: offer.discountType,
      discountValue: offer.discountValue,
      productIds: JSON.parse(offer.productIds || "[]"),
    })),
  });
};
