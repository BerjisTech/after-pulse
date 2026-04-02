// ─── OpenAI Integration ───

import type { AiSuggestion } from "../offers/types";
import type { AiGenerationInput } from "./provider.server";
import { buildPrompt } from "./prompts";

/**
 * Generate upsell offer suggestions using OpenAI GPT-4.
 */
export async function generateWithOpenAI(
  input: AiGenerationInput,
): Promise<AiSuggestion[]> {
  const prompt = buildPrompt(input);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are an expert e-commerce strategist specializing in post-purchase upsells. " +
              "You analyze product catalogs and suggest highly converting upsell offers. " +
              "Always respond with valid JSON arrays.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("OpenAI API error:", response.status, errorBody);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in OpenAI response");
    }

    const parsed = JSON.parse(content);
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
    console.error("OpenAI generation error:", error);
    throw error;
  }
}

function validateOfferType(type: string): "single" | "bundle" | "discount" {
  if (["single", "bundle", "discount"].includes(type)) {
    return type as "single" | "bundle" | "discount";
  }
  return "single";
}
