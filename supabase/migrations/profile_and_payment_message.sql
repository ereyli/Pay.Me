-- Creator profile fields + optional payer message

alter table public.profiles
  add column if not exists bio text,
  add column if not exists tip_jar_slug text,
  add column if not exists links jsonb not null default '[]'::jsonb;

create unique index if not exists profiles_wallet_address_unique on public.profiles(wallet_address);

alter table public.payments
  add column if not exists payer_message text;
