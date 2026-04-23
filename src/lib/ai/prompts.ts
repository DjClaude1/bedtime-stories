import type { Child, ChildMemory, StoryMode } from '../types';

const MODE_GUIDE: Record<StoryMode, string> = {
  sleep: `SLEEP MODE. Extra calming. Soft pacing. End with the child drifting to sleep.
Use only calming imagery (stars, moon, drifting clouds, soft animals, warm blankets, quiet meadows).
No fear, danger, villains, or intense conflict. No loud sounds.`,
  adventure: `ADVENTURE MODE. Gentle wonder-filled exploration — a secret garden, a floating lantern, a friendly dragon.
Still cozy and warm. No real danger; any challenge is solved with kindness.`,
  educational: `EDUCATIONAL MODE. Weave in one small, age-appropriate fact (nature, space, kindness).
Keep the narrative primary; the lesson should feel like a whispered discovery, not a lecture.`,
  moral: `MORAL LESSON MODE. A soft, kind moral (sharing, patience, courage, gratitude).
Let the lesson emerge through the character's choices, never a sermon.`,
};

export function buildSystemPrompt(): string {
  return [
    "You are a world-class children's bedtime storyteller.",
    'Your stories are calming, magical, and emotionally comforting.',
    'Structure: soft beginning → gentle adventure → peaceful ending that slowly fades into sleep.',
    'Never include fear, danger, loud sounds, violence, or intense conflict.',
    'Use calming imagery: stars, night sky, soft animals, dreams, floating, quiet journeys, warm blankets.',
    'Match vocabulary to the child\'s age. Prefer short, lullaby-like sentences as the story ends.',
    'Output ONLY the story text, no preface, no title line, no markdown, no headings.',
  ].join(' ');
}

export function buildUserPrompt(args: {
  child: Child;
  mode: StoryMode;
  theme?: string;
  targetWords: number;
  continuation?: { previousTitle: string; previousSummary: string };
}): string {
  const { child, mode, theme, targetWords, continuation } = args;
  const prefs = child.preferences || {};
  const interests = (prefs.interests || []).filter(Boolean).slice(0, 6);
  const favChars = (prefs.favoriteCharacters || []).filter(Boolean).slice(0, 4);
  const memory: ChildMemory = child.memory || {};
  const recurring = (memory.recurringCharacters || []).slice(0, 3);

  const lines: string[] = [];
  lines.push(`Child's name: ${child.name}`);
  if (child.age) lines.push(`Child's age: ${child.age}`);
  if (interests.length) lines.push(`Interests: ${interests.join(', ')}`);
  if (favChars.length) lines.push(`Favorite characters: ${favChars.join(', ')}`);
  if (recurring.length) {
    lines.push(
      `Recurring characters to reuse naturally: ${recurring
        .map((c) => `${c.name} (${c.description})`)
        .join('; ')}`,
    );
  }
  if (memory.settings?.length) {
    lines.push(`Familiar settings: ${memory.settings.slice(0, 3).join(', ')}`);
  }
  if (prefs.notes) lines.push(`Parent notes: ${prefs.notes}`);
  if (theme) lines.push(`Tonight's gentle theme: ${theme}`);

  lines.push('');
  lines.push(MODE_GUIDE[mode]);
  lines.push('');
  if (continuation) {
    lines.push(
      `This is a CONTINUATION of the series "${continuation.previousTitle}". Previously: ${continuation.previousSummary}`,
    );
    lines.push('Keep the same characters, tone, and setting. Begin softly, as if picking up where we left off.');
  }
  lines.push(`Use ${child.name}'s name naturally several times, as the main character.`);
  lines.push(`Target length: about ${targetWords} words. Never exceed ${targetWords + 50}.`);
  lines.push('');
  lines.push(
    'After the story, on a new line, output exactly this token then a short 4–7 word title: ###TITLE### <title>',
  );
  lines.push(
    'Then on another new line, output a one-sentence summary (max 25 words) prefixed with: ###SUMMARY### <summary>',
  );

  return lines.join('\n');
}

/** Parse the final model output into { text, title, summary }. */
export function parseStoryOutput(raw: string, childName: string): {
  text: string;
  title: string;
  summary: string;
} {
  const titleMatch = raw.match(/###TITLE###\s*(.+?)\s*(?:\n|$)/);
  const summaryMatch = raw.match(/###SUMMARY###\s*([\s\S]+?)\s*$/);
  const title = (titleMatch?.[1] ?? `${childName}'s Bedtime Story`).trim().slice(0, 80);
  const summary = (summaryMatch?.[1] ?? '').trim().slice(0, 300);
  let text = raw;
  if (titleMatch) text = text.slice(0, titleMatch.index).trim();
  return { text, title, summary };
}
