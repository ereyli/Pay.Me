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
