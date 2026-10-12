create table if not exists public.logistics_records (
  id text primary key,
  data jsonb not null default '{}'::jsonb
);
alter table public.logistics_records enable row level security;
create index if not exists logistics_kind on public.logistics_records ((data->>'kind'));
create index if not exists logistics_order on public.logistics_records ((data->>'orderId'));
-- Backend service role only; no anonymous or authenticated browser policies.
