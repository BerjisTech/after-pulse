// ─── AI Provider Factory ───

import type { AiProvider, AiSuggestion } from "../offers/types";
import { generateWithOpenAI } from "./openai.server";
import { generateWithClaude } from "./claude.server";
import { generateWithGemini } from "./gemini.server";

export interface AiGenerationInput {
  provider: AiProvider;
  apiKey: string;
  products: Array<{ title: string; price: string; collections: string[] }>;
  recentOrders?: Array<{ total: number; products: string[] }>;
  merchantHints?: string;
}

/**
 * Generate upsell suggestions using the configured AI provider.
 */
export async function generateOfferSuggestions(
  input: AiGenerationInput,
): Promise<AiSuggestion[]> {
  switch (input.provider) {
    case "openai":
      return generateWithOpenAI(input);
    case "claude":
      return generateWithClaude(input);
    case "gemini":
      return generateWithGemini(input);
    default:
      throw new Error(`Unsupported AI provider: ${input.provider}`);
  }
}

