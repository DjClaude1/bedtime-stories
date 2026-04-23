import type { Plan } from './types';

/**
 * Tier feature flags. Centralized so adding/removing capabilities
 * per plan is a one-file change.
 */
export interface PlanFeatures {
  dailyStoryLimit: number;          // -1 = unlimited
  maxChildren: number;              // -1 = unlimited
  storyHistory: boolean;
  continueStory: boolean;
  audioNarration: boolean;
  aiIllustrations: boolean;
  pdfExport: boolean;
  shareLinks: boolean;
  priorityGeneration: boolean;
  premiumVoices: boolean;
  maxStoryWords: number;
  rateLimitCooldownSec: number;
}

export const FEATURES: Record<Plan, PlanFeatures> = {
  free: {
    dailyStoryLimit: 1,
    maxChildren: 1,
    storyHistory: false,
    continueStory: false,
    audioNarration: false,
    aiIllustrations: false,
    pdfExport: false,
    shareLinks: true,
    priorityGeneration: false,
    premiumVoices: false,
    maxStoryWords: 500,
    rateLimitCooldownSec: 30,
  },
  basic: {
    dailyStoryLimit: 5,
    maxChildren: 2,
    storyHistory: true,
    continueStory: true,
    audioNarration: false,
    aiIllustrations: false,
    pdfExport: false,
    shareLinks: true,
    priorityGeneration: true,
    premiumVoices: false,
    maxStoryWords: 700,
    rateLimitCooldownSec: 10,
  },
  pro: {
    dailyStoryLimit: -1,
    maxChildren: 5,
    storyHistory: true,
    continueStory: true,
    audioNarration: true,
    aiIllustrations: false,
    pdfExport: true,
    shareLinks: true,
    priorityGeneration: true,
    premiumVoices: false,
    maxStoryWords: 800,
    rateLimitCooldownSec: 5,
  },
  premium: {
    dailyStoryLimit: -1,
    maxChildren: -1,
    storyHistory: true,
    continueStory: true,
    audioNarration: true,
    aiIllustrations: true,
    pdfExport: true,
    shareLinks: true,
    priorityGeneration: true,
    premiumVoices: true,
    maxStoryWords: 800,
    rateLimitCooldownSec: 2,
  },
};

export function featuresFor(plan: Plan): PlanFeatures {
  return FEATURES[plan] ?? FEATURES.free;
}

export const PLAN_PRICING: Record<Plan, { label: string; monthlyUsd: number; tagline: string; highlights: string[] }> = {
  free: {
    label: 'Free',
    monthlyUsd: 0,
    tagline: 'One calming story every night.',
    highlights: ['1 story / day', '1 child profile', 'Share links'],
  },
  basic: {
    label: 'Basic',
    monthlyUsd: 5,
    tagline: 'A little more magic.',
    highlights: ['5 stories / day', '2 child profiles', 'Story history', 'Continue story'],
  },
  pro: {
    label: 'Pro',
    monthlyUsd: 12,
    tagline: 'Unlimited stories, with audio.',
    highlights: ['Unlimited stories', '5 child profiles', 'Audio narration', 'PDF export', 'Priority generation'],
  },
  premium: {
    label: 'Premium',
    monthlyUsd: 20,
    tagline: 'The full bedtime experience.',
    highlights: ['Everything in Pro', 'Unlimited children', 'AI illustrations', 'Premium voices', 'Advanced memory'],
  },
};
