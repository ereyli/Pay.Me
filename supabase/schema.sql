-- pay.me Supabase Schema
-- Run this in your Supabase SQL editor to set up the database

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table
create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  wallet_address text,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  tip_jar_slug text,
  links jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);
create unique index if not exists profiles_wallet_address_unique on public.profiles(wallet_address);

alter table public.profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update own profile." on public.profiles;

create policy "Public profiles are viewable by everyone."
  on profiles for select using (true);

create policy "Users can insert their own profile."
  on profiles for insert with check (auth.uid() = user_id);

create policy "Users can update own profile."
  on profiles for update using (auth.uid() = user_id);

-- Payment requests table
create table if not exists public.payment_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  recipient_wallet text not null,
  slug text not null unique,
  title text not null,
  description text,
  amount_usdc text not null,
  token_address text not null default '0x3600000000000000000000000000000000000000',
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'cancelled')),
  expires_at timestamptz,
  allow_partial_payment boolean not null default false,
  success_redirect_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast slug lookups (used on /pay/[slug])
create index if not exists payment_requests_slug_idx on payment_requests(slug);
-- Index for dashboard queries by recipient wallet
create index if not exists payment_requests_recipient_idx on payment_requests(recipient_wallet);

alter table public.payment_requests enable row level security;

-- Anyone can read payment requests (needed for public pay page)
drop policy if exists "Payment requests are publicly readable." on public.payment_requests;

create policy "Payment requests are publicly readable."
  on payment_requests for select using (true);

-- Inserts/updates go only through Next.js API routes using the service role key
-- (service role bypasses RLS). Do not grant public INSERT/UPDATE — see rls-hardening.sql
-- if you need to tighten an older database.

-- Payments table
create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  payment_request_id uuid not null references payment_requests(id) on delete cascade,
  payer_wallet text not null,
  payer_message text,
  recipient_wallet text not null,
  amount_usdc text not null,
  token_address text not null default '0x3600000000000000000000000000000000000000',
  tx_hash text not null unique,
  chain_id integer not null,
  block_number text,
  status text not null default 'submitted' check (status in ('submitted', 'confirmed', 'failed')),
  paid_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists payments_request_id_idx on payments(payment_request_id);
create index if not exists payments_tx_hash_idx on payments(tx_hash);
create index if not exists payments_recipient_idx on payments(recipient_wallet);

alter table public.payments enable row level security;

-- Payments are publicly readable (for verification purposes)
drop policy if exists "Payments are publicly readable." on public.payments;

create policy "Payments are publicly readable."
  on payments for select using (true);

-- Inserts/updates from API only (service role). No public INSERT/UPDATE policies.

-- Audit logs
create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata_json jsonb,
  created_at timestamptz default now()
);

alter table public.audit_logs enable row level security;

drop policy if exists "Service role can read audit logs." on public.audit_logs;

create policy "Service role can read audit logs."
  on audit_logs for select using (false);

-- Optional: insert audit rows only from server (service role). No public insert policy.

-- Trigger to auto-update updated_at on payment_requests
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_payment_requests_updated_at on public.payment_requests;

create trigger update_payment_requests_updated_at
  before update on payment_requests
  for each row execute function update_updated_at_column();

-- Gift campaigns (shareable claim links; funding verified on-chain)
create table if not exists public.gift_campaigns (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  campaign_id text not null,
  creator_wallet text not null,
  token_address text not null,
  amount_per_claim text not null,
  max_claims integer not null check (max_claims > 0),
  chain_id integer not null,
  fund_tx_hash text not null unique,
  title text,
  view_count integer not null default 0,
  created_at timestamptz default now()
);

create index if not exists gift_campaigns_slug_idx on public.gift_campaigns(slug);
create index if not exists gift_campaigns_campaign_id_idx on public.gift_campaigns(campaign_id);
create index if not exists gift_campaigns_creator_wallet_idx on public.gift_campaigns (creator_wallet);

alter table public.gift_campaigns enable row level security;

drop policy if exists "Gift campaigns are publicly readable." on public.gift_campaigns;

create policy "Gift campaigns are publicly readable."
  on gift_campaigns for select using (true);

-- ERC-8004 agents (platform or future merchant-owned agent identities)
create table if not exists public.erc8004_agents (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  name text not null,
  kind text not null default 'platform',
  status text not null default 'draft' check (status in ('draft', 'registered', 'disabled')),
  description text,
  owner_wallet text not null,
  validator_wallet text not null,
  identity_registry text not null,
  reputation_registry text not null,
  validation_registry text not null,
  metadata_uri text,
  metadata_json jsonb,
  agent_token_id text,
  register_tx_hash text,
  chain_id integer not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists erc8004_agents_slug_idx on public.erc8004_agents(slug);

alter table public.erc8004_agents enable row level security;

drop policy if exists "ERC8004 agents are publicly readable." on public.erc8004_agents;

create policy "ERC8004 agents are publicly readable."
  on public.erc8004_agents for select using (true);

-- ERC-8004 reputation events written by the platform validator
create table if not exists public.erc8004_reputation_events (
  id uuid primary key default uuid_generate_v4(),
  agent_slug text not null references public.erc8004_agents(slug) on delete cascade,
  agent_token_id text not null,
  payment_request_id uuid references public.payment_requests(id) on delete set null,
  payment_tx_hash text unique,
  reputation_tx_hash text,
  score integer not null,
  tag text not null,
  feedback_type integer not null default 0,
  comment text,
  feedback_hash text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'failed')),
  created_at timestamptz default now()
);

create index if not exists erc8004_reputation_events_agent_slug_idx
  on public.erc8004_reputation_events(agent_slug);

alter table public.erc8004_reputation_events enable row level security;

drop policy if exists "ERC8004 reputation events are publicly readable." on public.erc8004_reputation_events;

create policy "ERC8004 reputation events are publicly readable."
  on public.erc8004_reputation_events for select using (true);

-- ERC-8004 validation events
create table if not exists public.erc8004_validation_events (
  id uuid primary key default uuid_generate_v4(),
  agent_slug text not null references public.erc8004_agents(slug) on delete cascade,
  agent_token_id text not null,
  payment_request_id uuid references public.payment_requests(id) on delete set null,
  payment_tx_hash text unique,
  request_hash text not null,
  request_tx_hash text,
  response_tx_hash text,
  tag text not null,
  response integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'failed')),
  created_at timestamptz default now()
);

create index if not exists erc8004_validation_events_agent_slug_idx
  on public.erc8004_validation_events(agent_slug);

alter table public.erc8004_validation_events enable row level security;

drop policy if exists "ERC8004 validation events are publicly readable." on public.erc8004_validation_events;

create policy "ERC8004 validation events are publicly readable."
  on public.erc8004_validation_events for select using (true);
