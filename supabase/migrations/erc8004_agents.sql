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
