import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Ensure the shop exists in our database
  const shopRecord = await db.shop.findUnique({
    where: { shopDomain: shop },
  });

  if (!shopRecord) {
    console.log(`Shop ${shop} not found in database, skipping order processing`);
    return new Response();
  }

  const orderId = (payload as { admin_graphql_api_id?: string })
    .admin_graphql_api_id;

  if (!orderId) {
    return new Response();
  }

  // Check if any recent analytics events (conversions) should be attributed
  // This is a lightweight attribution — we check if the customer saw an offer
  // and subsequently placed an order
  try {
    const recentImpressions = await db.analyticsEvent.findMany({
      where: {
        shopId: shopRecord.id,
        eventType: "click",
        createdAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000), // last 30 minutes
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // If there are recent clicks on offers, this order might be a conversion
    // More sophisticated attribution would check line items against offer products
    if (recentImpressions.length > 0) {
      console.log(
        `Order ${orderId} may be attributed to ${recentImpressions.length} recent offer clicks`,
      );
    }
  } catch (error) {
    console.error("Error processing order webhook:", error);
  }

  return new Response();
};
