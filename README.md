# Moonlit — Calming AI bedtime stories

Personalized, magical bedtime stories that help children drift gently to sleep.
Mobile-first Next.js 14 + Supabase + OpenAI, designed to run on free tiers and
upgrade smoothly when revenue justifies it.

## Features

- 🌙 Personalized stories starring your child (name, interests, favorite characters)
- 🎭 Four modes: Sleep (extra calming), Adventure, Educational, Moral lesson
- 🔊 Soft audio narration (OpenAI TTS, lazy, Pro)
- 🎨 Warm watercolor AI illustrations (lazy, Premium)
- 👨‍👩‍👧 Multi-child profiles with per-child memory (recurring characters + settings)
- 📚 Continue Story series engine
- 📥 PDF + audio export, public share links
- 💸 Free → Basic ($5) → Pro ($12) → Premium ($20) tier gating via PayPal subscriptions
- 📊 Per-user usage + estimated-cost dashboard

## Stack

- **Next.js 14** (App Router, TypeScript, Tailwind)
- **Supabase** (auth + Postgres + storage + RLS)
- **OpenAI** via a provider-abstraction layer (swap models/providers in one file)
- **PayPal Subscriptions** (sandbox by default)
- **Vercel** for deploy

## Getting started

```bash
cp .env.example .env.local
# fill in Supabase + OpenAI + PayPal
npm install
npm run dev
```

Then in Supabase SQL editor, run [`supabase/schema.sql`](./supabase/schema.sql)
to create tables, storage buckets, RLS policies, and the auth trigger.

## Cost protection

All cost-risky features are gated behind explicit user action and subscription tier:
- Hard daily story caps per tier (enforced server-side)
- Token caps on OpenAI prompts + completions
- Per-user cooldown between generations
- Audio + images generated **only when explicitly requested** (never auto)
- Usage table tracks token/TTS/image cost in cents per day per user

See [`src/lib/features.ts`](./src/lib/features.ts) for tier flags,
[`src/lib/ai/provider.ts`](./src/lib/ai/provider.ts) for model config and
cost estimates, and [`src/lib/db/usage.ts`](./src/lib/db/usage.ts) for usage +
rate-limit logic.

## Deploy

1. Push to GitHub.
2. Import into Vercel; add environment variables from `.env.example`.
3. In Supabase → Authentication → URL configuration, add
   `https://<your-vercel-domain>/api/auth/callback` to "Redirect URLs".
4. (Optional) Create PayPal billing plans and set the `PAYPAL_PLAN_*_ID` envs.
