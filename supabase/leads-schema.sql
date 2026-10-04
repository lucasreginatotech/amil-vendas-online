create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text,
  phone text,
  plan text not null,
  lives integer check (lives between 1 and 999),
  city text,
  state char(2),
  consent boolean not null default false,
  status text not null default 'Novo' check (status in ('Novo', 'Em contato', 'Cotação enviada', 'Fechado', 'Perdido')),
  notes text not null default '',
  source text not null default 'formulario' check (source in ('formulario', 'whatsapp')),
  source_detail text not null default ''
);

-- Permite reaplicar o esquema em projetos existentes e guardar cliques diretos sem PII fictícia.
alter table public.leads alter column email drop not null;
alter table public.leads alter column phone drop not null;
alter table public.leads alter column lives drop not null;
alter table public.leads alter column city drop not null;
alter table public.leads alter column state drop not null;
alter table public.leads add column if not exists source text not null default 'formulario';
alter table public.leads add column if not exists source_detail text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.leads'::regclass and conname = 'leads_source_check'
  ) then
    alter table public.leads add constraint leads_source_check check (source in ('formulario', 'whatsapp'));
  end if;
end $$;

create index if not exists leads_created_at_desc_idx on public.leads (created_at desc);
alter table public.leads enable row level security;
revoke all on public.leads from anon, authenticated;
grant all privileges on table public.leads to service_role;
