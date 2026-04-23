import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChildMemory } from '../types';

/**
 * Child memory system. After each story we lightly update the child's memory
 * so future stories stay consistent (recurring characters, settings, last summary).
 */
export async function updateChildMemoryAfterStory(
  admin: SupabaseClient,
  childId: string,
  update: {
    lastStoryTitle: string;
    lastStorySummary: string;
    newCharacters?: { name: string; description: string }[];
    newSettings?: string[];
  },
): Promise<void> {
  const { data } = await admin
    .from('children')
    .select('memory')
    .eq('id', childId)
    .maybeSingle();
  const memory: ChildMemory = data?.memory ?? {};
  const recurring = memory.recurringCharacters ?? [];
  const settings = memory.settings ?? [];

  if (update.newCharacters) {
    for (const c of update.newCharacters) {
      if (!recurring.find((r) => r.name.toLowerCase() === c.name.toLowerCase())) {
        recurring.push(c);
      }
    }
  }
  if (update.newSettings) {
    for (const s of update.newSettings) {
      if (!settings.find((x) => x.toLowerCase() === s.toLowerCase())) settings.push(s);
    }
  }

  const next: ChildMemory = {
    recurringCharacters: recurring.slice(-6),
    settings: settings.slice(-6),
    lastStoryTitle: update.lastStoryTitle,
    lastStorySummary: update.lastStorySummary,
  };

  await admin.from('children').update({ memory: next }).eq('id', childId);
}
