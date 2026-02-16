-- Enable required extension for gen_random_uuid
create extension if not exists "pgcrypto";

-- experiences table
create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz,
  location_name text,
  created_at timestamptz not null default now()
);

-- assets table
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  experience_id uuid not null references public.experiences(id) on delete cascade,
  kind text not null check (kind in ('photo','video','audio')),
  storage_path text not null,
  original_filename text,
  captured_at timestamptz,
  created_at timestamptz not null default now()
);

-- journal_entries table
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  experience_id uuid not null references public.experiences(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- collage_pages table
create table if not exists public.collage_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  experience_id uuid not null references public.experiences(id) on delete cascade,
  name text not null default 'Main',
  width integer not null default 1080,
  height integer not null default 1920,
  background text not null default '#ffffff',
  elements jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_collage_pages_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_collage_pages_updated_at on public.collage_pages;

create trigger set_collage_pages_updated_at
before update on public.collage_pages
for each row
execute function public.set_collage_pages_updated_at();

-- RLS
alter table public.experiences enable row level security;
alter table public.assets enable row level security;
alter table public.journal_entries enable row level security;
alter table public.collage_pages enable row level security;

-- experiences policies
create policy "Users can select own experiences"
  on public.experiences for select
  using (user_id = auth.uid());

create policy "Users can insert own experiences"
  on public.experiences for insert
  with check (user_id = auth.uid());

create policy "Users can update own experiences"
  on public.experiences for update
  using (user_id = auth.uid());

create policy "Users can delete own experiences"
  on public.experiences for delete
  using (user_id = auth.uid());

-- assets policies
create policy "Users can select own assets"
  on public.assets for select
  using (user_id = auth.uid());

create policy "Users can insert own assets"
  on public.assets for insert
  with check (user_id = auth.uid());

create policy "Users can update own assets"
  on public.assets for update
  using (user_id = auth.uid());

create policy "Users can delete own assets"
  on public.assets for delete
  using (user_id = auth.uid());

-- journal_entries policies
create policy "Users can select own journal entries"
  on public.journal_entries for select
  using (user_id = auth.uid());

create policy "Users can insert own journal entries"
  on public.journal_entries for insert
  with check (user_id = auth.uid());

create policy "Users can update own journal entries"
  on public.journal_entries for update
  using (user_id = auth.uid());

create policy "Users can delete own journal entries"
  on public.journal_entries for delete
  using (user_id = auth.uid());

-- collage_pages policies
create policy "Users can select own collage pages"
  on public.collage_pages for select
  using (user_id = auth.uid());

create policy "Users can insert own collage pages"
  on public.collage_pages for insert
  with check (user_id = auth.uid());

create policy "Users can update own collage pages"
  on public.collage_pages for update
  using (user_id = auth.uid());

create policy "Users can delete own collage pages"
  on public.collage_pages for delete
  using (user_id = auth.uid());

-- Storage (bucket + RLS) cannot be done here: your DB role is not owner of storage.objects.
-- Create the bucket and policies in the Supabase Dashboard. See: supabase/STORAGE_SETUP.md

