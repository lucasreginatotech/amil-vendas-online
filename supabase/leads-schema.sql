create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text not null,
  plan text not null,
  lives integer not null check (lives between 1 and 999),
  city text not null,
  state char(2) not null,
  consent boolean not null default false,
  status text not null default 'Novo' check (status in ('Novo', 'Em contato', 'Cotação enviada', 'Fechado', 'Perdido')),
  notes text not null default ''
);

create index if not exists leads_created_at_desc_idx on public.leads (created_at desc);
alter table public.leads enable row level security;
revoke all on public.leads from anon, authenticated;
grant all privileges on table public.leads to service_role;
