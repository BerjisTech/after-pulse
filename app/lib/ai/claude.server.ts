// ─── Anthropic Claude Integration ───

import type { AiSuggestion } from "../offers/types";
import type { AiGenerationInput } from "./provider.server";
import { buildPrompt } from "./prompts";

/**
 * Generate upsell offer suggestions using Anthropic Claude.
 */
export async function generateWithClaude(
  input: AiGenerationInput,
): Promise<AiSuggestion[]> {
  const prompt = buildPrompt(input);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": input.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content:
              "You are an expert e-commerce strategist specializing in post-purchase upsells. " +
              "Analyze the following product catalog and suggest highly converting upsell offers. " +
              "Respond ONLY with a valid JSON object containing a 'suggestions' array.\n\n" +
              prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Claude API error:", response.status, errorBody);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      throw new Error("No content in Claude response");
    }

    // Extract JSON from response (Claude may include text around it)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from Claude response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const suggestions: AiSuggestion[] = (parsed.suggestions || parsed || []).map(
      (s: Record<string, unknown>) => ({
        headline: String(s.headline || "Special Offer"),
        description: String(s.description || ""),
        productIds: Array.isArray(s.productIds) ? s.productIds : [],
        type: validateOfferType(String(s.type || "single")),
        discountType: s.discountType ? String(s.discountType) : null,
        discountValue: s.discountValue ? Number(s.discountValue) : null,
        reasoning: String(s.reasoning || "AI-generated suggestion"),
      }),
    );

    return suggestions.slice(0, 5);
  } catch (error) {
    console.error("Claude generation error:", error);
    throw error;
  }
}

function validateOfferType(type: string): "single" | "bundle" | "discount" {
  if (["single", "bundle", "discount"].includes(type)) {
    return type as "single" | "bundle" | "discount";
  }
  return "single";
}
