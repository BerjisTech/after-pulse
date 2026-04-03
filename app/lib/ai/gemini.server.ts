// ─── Google Gemini AI Integration ───
// Uses the Gemini API for generating upsell suggestions

import type { AiSuggestion } from "../offers/types";
import type { AiGenerationInput } from "./provider.server";
import { buildPrompt } from "./prompts";

export async function generateWithGemini(
  input: AiGenerationInput,
): Promise<AiSuggestion[]> {
  const prompt = buildPrompt(input);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${input.apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are an expert e-commerce strategist specializing in post-purchase upsells. Respond only with valid JSON.\n\n${prompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const textContent =
    data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

  try {
    const parsed = JSON.parse(textContent);
    const suggestions = parsed.suggestions || parsed;
    return Array.isArray(suggestions) ? suggestions : [suggestions];
  } catch {
    console.error("Failed to parse Gemini response:", textContent);
    return [];
  }
}
