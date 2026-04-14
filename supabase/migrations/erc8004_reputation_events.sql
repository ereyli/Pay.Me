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
