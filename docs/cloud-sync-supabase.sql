-- Media Management cloud sync preview schema.
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_salt text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_snapshots (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  revision integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.app_users enable row level security;
alter table public.user_snapshots enable row level security;

-- The preview API uses SUPABASE_SERVICE_ROLE_KEY on Vercel.
-- No browser/client policy is created intentionally; users access data only through the Vercel API.

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists app_users_set_updated_at on public.app_users;
create trigger app_users_set_updated_at
before update on public.app_users
for each row execute function public.set_updated_at();
