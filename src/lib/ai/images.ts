import { AI_CONFIG, estimateImageCostCents, getOpenAI } from './provider';

export async function generateSceneImage(args: {
  storyTitle: string;
  sceneDescription: string;
}): Promise<{ buffer: Buffer; model: string; estimatedCostCents: number }> {
  const openai = getOpenAI();
  const prompt = [
    'Soft, dreamy, storybook illustration for a children\'s bedtime story.',
    'Style: warm pastel watercolor, painterly, gentle moonlight, calming stars, cozy atmosphere.',
    'No text, no letters, no watermark.',
    `Scene: ${args.sceneDescription}`,
    `From the story titled "${args.storyTitle}".`,
  ].join(' ');
  const resp = await openai.images.generate({
    model: AI_CONFIG.imageModel,
    prompt,
    size: '1024x1024',
    n: 1,
  });
  const b64 = resp.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image returned');
  return {
    buffer: Buffer.from(b64, 'base64'),
    model: AI_CONFIG.imageModel,
    estimatedCostCents: estimateImageCostCents(),
  };
}

/** Pick up to N simple scene descriptions from a story. */
export async function pickScenes(story: string, count: number): Promise<string[]> {
  const openai = getOpenAI();
  const resp = await openai.chat.completions.create({
    model: AI_CONFIG.textModel,
    temperature: 0.3,
    max_tokens: 300,
    messages: [
      {
        role: 'system',
        content:
          'Given a children\'s bedtime story, pick a few calm visual scenes. Output JSON array of short scene descriptions (max 20 words each). No text/faces focus; describe setting + mood.',
      },
      { role: 'user', content: `Pick ${count} scenes.\n\nSTORY:\n${story.slice(0, 4000)}` },
    ],
    response_format: { type: 'json_object' },
  });
  try {
    const parsed = JSON.parse(resp.choices[0]?.message?.content ?? '{}');
    const scenes: string[] = parsed.scenes ?? parsed.items ?? [];
    return scenes.slice(0, count);
  } catch {
    return [];
  }
}
