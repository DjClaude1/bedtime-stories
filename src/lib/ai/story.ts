import { AI_CONFIG, estimateTextCostCents, getOpenAI } from './provider';
import { buildSystemPrompt, buildUserPrompt, parseStoryOutput } from './prompts';
import type { Child, StoryMode } from '../types';

export interface GeneratedStory {
  text: string;
  title: string;
  summary: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  estimatedCostCents: number;
}

export async function generateStory(args: {
  child: Child;
  mode: StoryMode;
  theme?: string;
  targetWords: number;
  continuation?: { previousTitle: string; previousSummary: string };
}): Promise<GeneratedStory> {
  const openai = getOpenAI();
  const system = buildSystemPrompt();
  const user = buildUserPrompt(args);

  if (user.length > AI_CONFIG.maxPromptChars) {
    throw new Error('Prompt too large.');
  }

  const resp = await openai.chat.completions.create({
    model: AI_CONFIG.textModel,
    temperature: 0.85,
    presence_penalty: 0.4,
    frequency_penalty: 0.3,
    max_tokens: AI_CONFIG.maxCompletionTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  const raw = resp.choices[0]?.message?.content?.trim() ?? '';
  const { text, title, summary } = parseStoryOutput(raw, args.child.name);
  const promptTokens = resp.usage?.prompt_tokens ?? 0;
  const completionTokens = resp.usage?.completion_tokens ?? 0;
  return {
    text,
    title,
    summary,
    model: AI_CONFIG.textModel,
    promptTokens,
    completionTokens,
    estimatedCostCents: estimateTextCostCents(AI_CONFIG.textModel, promptTokens, completionTokens),
  };
}
