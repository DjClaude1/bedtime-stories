import { AI_CONFIG, estimateTtsCostCents, getOpenAI } from './provider';

export async function synthesizeSpeech(text: string, voice?: string): Promise<{
  buffer: Buffer;
  model: string;
  chars: number;
  estimatedCostCents: number;
}> {
  const openai = getOpenAI();
  const chars = Math.min(text.length, 4000); // cap
  const clipped = text.slice(0, chars);
  const resp = await openai.audio.speech.create({
    model: AI_CONFIG.ttsModel,
    voice: (voice || AI_CONFIG.ttsVoice) as 'nova',
    input: clipped,
    // slight slowdown for bedtime calm
    speed: 0.92,
  });
  const ab = await resp.arrayBuffer();
  return {
    buffer: Buffer.from(ab),
    model: AI_CONFIG.ttsModel,
    chars,
    estimatedCostCents: estimateTtsCostCents(chars),
  };
}
