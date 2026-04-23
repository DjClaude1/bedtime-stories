export type Plan = 'free' | 'basic' | 'pro' | 'premium';
export type StoryMode = 'sleep' | 'adventure' | 'educational' | 'moral';

export interface AppUser {
  id: string;
  email: string;
  plan: Plan;
  paypal_subscription_id: string | null;
  created_at: string;
}

export interface Child {
  id: string;
  user_id: string;
  name: string;
  age: number | null;
  preferences: ChildPreferences;
  memory: ChildMemory;
  created_at: string;
}

export interface ChildPreferences {
  interests?: string[];
  favoriteCharacters?: string[];
  notes?: string;
}

export interface ChildMemory {
  recurringCharacters?: { name: string; description: string }[];
  settings?: string[];
  lastStoryTitle?: string;
  lastStorySummary?: string;
}

export interface Series {
  id: string;
  title: string;
  child_id: string;
  user_id: string;
  created_at: string;
}

export interface Story {
  id: string;
  user_id: string;
  child_id: string;
  series_id: string | null;
  title: string;
  text: string;
  mode: StoryMode;
  audio_url: string | null;
  image_urls: string[];
  share_slug: string | null;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  estimated_cost_cents: number | null;
  created_at: string;
}

export interface DailyUsage {
  user_id: string;
  date: string;
  stories_generated: number;
  audio_generated: number;
  images_generated: number;
  estimated_cost_cents: number;
}

export interface GenerateStoryInput {
  child_id: string;
  mode: StoryMode;
  theme?: string;
  series_id?: string | null;
  continue?: boolean;
}
