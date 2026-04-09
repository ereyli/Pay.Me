-- Gift campaigns: on-chain funded pools indexed by slug for shareable claim links.
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
  created_at timestamptz default now()
);

create index if not exists gift_campaigns_slug_idx on public.gift_campaigns(slug);
create index if not exists gift_campaigns_campaign_id_idx on public.gift_campaigns(campaign_id);

alter table public.gift_campaigns enable row level security;

drop policy if exists "Gift campaigns are publicly readable." on public.gift_campaigns;

create policy "Gift campaigns are publicly readable."
  on gift_campaigns for select using (true);
