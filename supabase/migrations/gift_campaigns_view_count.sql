-- Page view counter for gift links (incremented when someone opens /gift/[slug]).
alter table public.gift_campaigns
  add column if not exists view_count integer not null default 0;

create index if not exists gift_campaigns_creator_wallet_idx on public.gift_campaigns (creator_wallet);
