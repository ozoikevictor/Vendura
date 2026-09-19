-- Vendura's API owns authorization. RLS is enabled with no client policies;
-- only the server-side service role can access these records directly.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'users', 'addresses', 'categories', 'stores', 'products', 'orders',
    'conversations', 'messages', 'offers', 'notifications', 'plans',
    'subscriptions', 'bank_accounts', 'delivery_settings', 'transactions', 'payouts'
  ]
  loop
    execute format(
      'create table if not exists public.%I (
        id text primary key,
        data jsonb not null default ''{}''::jsonb,
        created_at timestamptz not null default timezone(''utc'', now()),
        updated_at timestamptz not null default timezone(''utc'', now())
      )', table_name
    );
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop trigger if exists set_updated_at on public.%I', table_name);
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', table_name
    );
  end loop;
end;
$$;

create index if not exists users_email_idx on public.users ((data->>'email'));
create index if not exists stores_slug_idx on public.stores ((data->>'slug'));
create index if not exists stores_owner_idx on public.stores ((data->>'ownerId'));
create index if not exists products_slug_idx on public.products ((data->>'slug'));
create index if not exists products_store_idx on public.products ((data->>'storeId'));
create index if not exists orders_customer_idx on public.orders ((data->>'customerId'));
create index if not exists orders_store_idx on public.orders ((data->>'storeId'));
create index if not exists conversations_customer_idx on public.conversations ((data->>'customerId'));
create index if not exists conversations_store_idx on public.conversations ((data->>'storeId'));
create index if not exists messages_conversation_idx on public.messages ((data->>'conversationId'));
create index if not exists notifications_user_idx on public.notifications ((data->>'userId'));
