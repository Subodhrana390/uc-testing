create table if not exists public.email_queue (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  payload jsonb not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  error text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.email_queue enable row level security;

-- Only service role can access queue
create policy "Service role has full access to email queue"
on public.email_queue
for all
to service_role
using (true)
with check (true);

-- Function to claim jobs
create or replace function public.claim_email_jobs(batch_size int default 10)
returns setof public.email_queue
language sql
volatile
as $$
  update public.email_queue
  set status = 'PROCESSING',
      updated_at = now()
  where id in (
    select id
    from public.email_queue
    where status = 'PENDING'
    order by created_at asc
    for update skip locked
    limit batch_size
  )
  returning *;
$$;
