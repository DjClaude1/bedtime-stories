import { AI_CONFIG, estimateTextCostCents, getGemini, getOpenAI } from './provider';
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
  const system = buildSystemPrompt();
  const user = buildUserPrompt(args);

  if (user.length > AI_CONFIG.maxPromptChars) {
    throw new Error('Prompt too large.');
  }

  if (AI_CONFIG.textProvider === 'gemini') {
    const gemini = getGemini();
    const model = gemini.getGenerativeModel({
      model: AI_CONFIG.textModel,
      systemInstruction: system,
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: AI_CONFIG.maxCompletionTokens,
      },
    });
    const resp = await model.generateContent(user);
    const raw = resp.response.text().trim();
    const { text, title, summary } = parseStoryOutput(raw, args.child.name);
    const usage = resp.response.usageMetadata;
    const promptTokens = usage?.promptTokenCount ?? 0;
    const completionTokens = usage?.candidatesTokenCount ?? 0;
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

  const openai = getOpenAI();
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
