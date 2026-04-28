/**
 * AI provider abstraction. Story text can run on either Gemini (default, free tier)
 * or OpenAI. Audio + images stay on OpenAI for now.
 */
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export type TextProvider = 'gemini' | 'openai';

function resolveTextProvider(): TextProvider {
  const explicit = (process.env.AI_TEXT_PROVIDER || '').toLowerCase();
  if (explicit === 'gemini' || explicit === 'openai') return explicit;
  if (process.env.GEMINI_API_KEY) return 'gemini';
  return 'openai';
}

function defaultTextModel(provider: TextProvider): string {
  if (process.env.AI_TEXT_MODEL) return process.env.AI_TEXT_MODEL;
  return provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini';
}

const TEXT_PROVIDER: TextProvider = resolveTextProvider();

export const AI_CONFIG = {
  textProvider: TEXT_PROVIDER,
  textModel: defaultTextModel(TEXT_PROVIDER),
  ttsModel: process.env.AI_TTS_MODEL || 'tts-1',
  ttsVoice: process.env.AI_TTS_VOICE || 'nova', // calm-leaning voice
  imageModel: process.env.AI_IMAGE_MODEL || 'gpt-image-1',
  // Per-request caps (free-tier cost protection)
  maxPromptChars: 3000,
  maxCompletionTokens: 1100, // ~800 words
};

let cachedOpenAI: OpenAI | null = null;
export function getOpenAI(): OpenAI {
  if (!cachedOpenAI) {
    cachedOpenAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return cachedOpenAI;
}

let cachedGemini: GoogleGenerativeAI | null = null;
export function getGemini(): GoogleGenerativeAI {
  if (!cachedGemini) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY not set');
    cachedGemini = new GoogleGenerativeAI(key);
  }
  return cachedGemini;
}

// Rough cost estimates (per 1M tokens). Gemini 1.5/2.0 flash is currently free
// at low volumes; we report 0 cents so the usage dashboard reflects reality.
const PRICING_PER_MILLION: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
  'gemini-2.5-flash': { input: 0, output: 0 },
  'gemini-2.5-flash-lite': { input: 0, output: 0 },
  'gemini-2.0-flash': { input: 0, output: 0 },
  'gemini-2.0-flash-lite': { input: 0, output: 0 },
  'gemini-flash-latest': { input: 0, output: 0 },
};

export function estimateTextCostCents(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const p = PRICING_PER_MILLION[model] ?? PRICING_PER_MILLION['gpt-4o-mini'];
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
