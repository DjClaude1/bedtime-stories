-- Bedtime Stories schema
-- Supabase Postgres with Row Level Security

-- USERS
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  plan text not null default 'free' check (plan in ('free','basic','pro','premium')),
  paypal_subscription_id text,
  created_at timestamptz not null default now()
);

-- CHILDREN
create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  age int check (age between 1 and 14),
  preferences jsonb not null default '{}'::jsonb, -- { interests: [], favoriteCharacters: [], notes: "" }
  memory jsonb not null default '{}'::jsonb,      -- auto-enhanced memory (recurring chars, last setting...)
  created_at timestamptz not null default now()
);
create index if not exists children_user_idx on public.children(user_id);

-- SERIES
create table if not exists public.series (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  child_id uuid not null references public.children(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists series_child_idx on public.series(child_id);

-- STORIES
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  series_id uuid references public.series(id) on delete set null,
  title text not null,
  text text not null,
  mode text not null default 'sleep' check (mode in ('sleep','adventure','educational','moral')),
  audio_url text,
  image_urls text[] not null default array[]::text[],
  share_slug text unique,
  model text,
  prompt_tokens int,
  completion_tokens int,
  estimated_cost_cents numeric(10,4),
  created_at timestamptz not null default now()
);
create index if not exists stories_user_idx on public.stories(user_id);
create index if not exists stories_child_idx on public.stories(child_id);
create index if not exists stories_series_idx on public.stories(series_id);
create index if not exists stories_share_idx on public.stories(share_slug);

-- USAGE
create table if not exists public.usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null default (now() at time zone 'utc')::date,
  stories_generated int not null default 0,
  audio_generated int not null default 0,
  images_generated int not null default 0,
  estimated_cost_cents numeric(10,4) not null default 0,
  unique (user_id, date)
);
create index if not exists usage_user_date_idx on public.usage(user_id, date);

-- Rate limit (simple per-user cooldown)
create table if not exists public.rate_limits (
  user_id uuid primary key references public.users(id) on delete cascade,
  last_request_at timestamptz not null default now()
);

-- STORAGE BUCKETS (run once via SQL or dashboard)
insert into storage.buckets (id, name, public)
values ('audio','audio', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
values ('images','images', true) on conflict (id) do nothing;

-- ---------- RLS ----------
alter table public.users enable row level security;
alter table public.children enable row level security;
alter table public.series enable row level security;
alter table public.stories enable row level security;
alter table public.usage enable row level security;
alter table public.rate_limits enable row level security;

-- users: user can read/update their own row
drop policy if exists "users self read" on public.users;
create policy "users self read" on public.users
  for select using (auth.uid() = id);
drop policy if exists "users self update" on public.users;
create policy "users self update" on public.users
  for update using (auth.uid() = id);

-- children
drop policy if exists "children owner all" on public.children;
create policy "children owner all" on public.children
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- series
drop policy if exists "series owner all" on public.series;
create policy "series owner all" on public.series
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- stories
drop policy if exists "stories owner read" on public.stories;
create policy "stories owner read" on public.stories
  for select using (auth.uid() = user_id);
drop policy if exists "stories owner write" on public.stories;
create policy "stories owner write" on public.stories
  for insert with check (auth.uid() = user_id);
drop policy if exists "stories owner update" on public.stories;
create policy "stories owner update" on public.stories
  for update using (auth.uid() = user_id);
drop policy if exists "stories owner delete" on public.stories;
create policy "stories owner delete" on public.stories
  for delete using (auth.uid() = user_id);
-- public read via share slug: allow anon select when share_slug matches
drop policy if exists "stories public share read" on public.stories;
create policy "stories public share read" on public.stories
  for select using (share_slug is not null);

-- usage: user can read own, writes are service-role only
drop policy if exists "usage owner read" on public.usage;
create policy "usage owner read" on public.usage
  for select using (auth.uid() = user_id);

-- rate_limits: no client access (service role only)

-- ---------- Auto-provision users row on signup ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, coalesce(new.email,''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
