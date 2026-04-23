/**
 * AI provider abstraction — wraps OpenAI so we can switch providers or
 * tiers (e.g. gpt-4o-mini -> gpt-4.1-mini) in a single place later.
 */
import OpenAI from 'openai';

export const AI_CONFIG = {
  textModel: process.env.AI_TEXT_MODEL || 'gpt-4o-mini',
  ttsModel: process.env.AI_TTS_MODEL || 'tts-1',
  ttsVoice: process.env.AI_TTS_VOICE || 'nova', // calm-leaning voice
  imageModel: process.env.AI_IMAGE_MODEL || 'gpt-image-1',
  // Per-request caps (free-tier cost protection)
  maxPromptChars: 3000,
  maxCompletionTokens: 1100, // ~800 words
};

let cached: OpenAI | null = null;
export function getOpenAI(): OpenAI {
  if (!cached) {
    cached = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return cached;
}

// Rough cost estimates (per 1M tokens) — gpt-4o-mini
// Keep in sync with https://openai.com/api/pricing/
const PRICING_PER_MILLION = {
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
} as const;

export function estimateTextCostCents(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const p = (PRICING_PER_MILLION as Record<string, { input: number; output: number }>)[model]
    ?? PRICING_PER_MILLION['gpt-4o-mini'];
  const dollars = (promptTokens * p.input + completionTokens * p.output) / 1_000_000;
  return Math.round(dollars * 10000) / 100; // cents, 2 decimals
}

export function estimateTtsCostCents(chars: number): number {
  // tts-1: $15 per 1M chars
  const dollars = (chars * 15) / 1_000_000;
  return Math.round(dollars * 10000) / 100;
}

export function estimateImageCostCents(): number {
  // gpt-image-1 standard 1024x1024 ~ $0.040
  return 4;
}
