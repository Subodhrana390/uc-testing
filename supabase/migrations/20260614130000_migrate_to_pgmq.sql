create extension if not exists pgmq cascade;

-- Initialize queues
select pgmq.create('order_processing_queue');
select pgmq.create('email_queue');

-- Drop old tables and RPCs
drop function if exists public.claim_email_jobs(int);
drop function if exists public.claim_order_jobs(int);
drop table if exists public.email_queue;
drop table if exists public.order_processing_queue;

-- Create RPC wrapper: enqueue_job
create or replace function public.enqueue_job(queue_name text, job_message jsonb)
returns setof bigint
language sql
security definer
as $$
  select pgmq.send(queue_name, job_message);
$$;

-- Create RPC wrapper: claim_jobs
create or replace function public.claim_jobs(queue_name text, visibility_timeout integer default 30, batch_size integer default 10)
returns table(msg_id bigint, read_ct integer, enqueued_at timestamp with time zone, vt timestamp with time zone, message jsonb)
language sql
security definer
as $$
  select msg_id, read_ct, enqueued_at, vt, message
  from pgmq.read(queue_name, visibility_timeout, batch_size);
$$;

-- Create RPC wrapper: archive_job
create or replace function public.archive_job(queue_name text, job_msg_id bigint)
returns boolean
language sql
security definer
as $$
  select pgmq.archive(queue_name, job_msg_id);
$$;
