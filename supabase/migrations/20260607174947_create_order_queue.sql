create table if not exists public.order_processing_queue (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  error text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.order_processing_queue enable row level security;

-- Only service role can access queue
create policy "Service role has full access to order queue"
on public.order_processing_queue
for all
to service_role
using (true)
with check (true);

-- Function to claim jobs
create or replace function public.claim_order_jobs(batch_size int default 10)
returns setof public.order_processing_queue
language sql
volatile
as $$
  update public.order_processing_queue
  set status = 'PROCESSING',
      updated_at = now()
  where id in (
    select id
    from public.order_processing_queue
    where status = 'PENDING'
    order by created_at asc
    for update skip locked
    limit batch_size
  )
  returning *;
$$;
