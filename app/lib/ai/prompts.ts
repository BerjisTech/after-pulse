// ─── AI Prompt Templates ───

import type { AiGenerationInput } from "./provider.server";

/**
 * Build the prompt for AI offer generation.
 */
export function buildPrompt(input: AiGenerationInput): string {
  const productList = input.products
    .map(
      (p, i) =>
        `${i + 1}. "${p.title}" - $${p.price} (Collections: ${p.collections.join(", ") || "None"})`,
    )
    .join("\n");

  const orderHistory = input.recentOrders
    ? input.recentOrders
        .slice(0, 10)
        .map(
          (o, i) =>
            `  Order ${i + 1}: $${o.total.toFixed(2)} — Products: ${o.products.join(", ")}`,
        )
        .join("\n")
    : "No order history available.";

  return `
## Product Catalog
${productList}

## Recent Order History
${orderHistory}

${input.merchantHints ? `## Merchant Notes\n${input.merchantHints}\n` : ""}

## Instructions
Based on the product catalog and order history above, generate 3 high-converting post-purchase upsell offers.

For each suggestion, provide:
- **headline**: A compelling, short headline (max 80 chars) that creates urgency or highlights value
- **description**: A brief, persuasive description (max 200 chars)
- **type**: One of "single" (one product), "bundle" (2-4 products), or "discount" (discount-focused)
- **discountType**: "percentage", "fixed", or null
- **discountValue**: The discount amount (number), or null
- **productIds**: Array of product IDs from the catalog to include
- **reasoning**: Why this offer would convert well (for the merchant, not shown to customers)

## Response Format
Respond with a JSON object:
{
  "suggestions": [
    {
      "headline": "...",
      "description": "...",
      "type": "single|bundle|discount",
      "discountType": "percentage|fixed|null",
      "discountValue": 10,
      "productIds": [],
      "reasoning": "..."
    }
  ]
}

Focus on:
1. Complementary products that naturally pair with commonly purchased items
2. Bundles that provide clear value savings
3. Appropriate discount levels (not too aggressive, 10-25% is optimal)
4. Urgency-driven copy without being pushy
`;
}

/**
 * Build a prompt for generating personalized offer copy.
 */
export function buildCopyPrompt(
  productTitle: string,
  offerType: string,
  discountValue?: number,
): string {
  return `
Generate 3 headline options and 1 description for a post-purchase ${offerType} upsell:

Product: "${productTitle}"
${discountValue ? `Discount: ${discountValue}% off` : "No discount"}

Requirements:
- Headlines: Max 80 chars, compelling, creates urgency or highlights value
- Description: Max 200 chars, persuasive, customer-focused
- Tone: Friendly, professional, not pushy

Respond with JSON:
{
  "headlines": ["...", "...", "..."],
  "description": "..."
}
`;
}
