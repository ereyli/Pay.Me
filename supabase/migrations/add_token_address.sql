-- Add stablecoin token address (USDC / EURC on Arc testnet). Safe to run on existing DBs.

alter table public.payment_requests
  add column if not exists token_address text not null default '0x3600000000000000000000000000000000000000';

alter table public.payments
  add column if not exists token_address text not null default '0x3600000000000000000000000000000000000000';
