create extension if not exists pgcrypto;

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reviewer_name text not null,
  rating integer not null check (rating between 1 and 5),
  title text null,
  review text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists wishlist_user_product_idx
on public.wishlist (user_id, product_id);

alter table public.product_reviews enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'product_reviews' and policyname = 'Public review read'
  ) then
    create policy "Public review read"
      on public.product_reviews
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'product_reviews' and policyname = 'Users can insert own reviews'
  ) then
    create policy "Users can insert own reviews"
      on public.product_reviews
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;
end $$;
