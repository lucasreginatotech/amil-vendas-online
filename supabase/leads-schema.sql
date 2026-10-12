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

-- Atualização aditiva. Não reescreve nem apaga contatos existentes.
alter table public.leads
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_term text,
  add column if not exists utm_content text,
  add column if not exists gclid text,
  add column if not exists gbraid text,
  add column if not exists wbraid text,
  add column if not exists tracking_consent boolean,
  add column if not exists tracking_consent_at timestamptz,
  add column if not exists attribution_captured_at timestamptz,
  add column if not exists submission_id uuid,
  add column if not exists submission_fingerprint text,
  add column if not exists closed_at timestamptz,
  add column if not exists sale_value numeric(12,2);

-- Índice completo: NULL é permitido para os contatos antigos e clientes legados.
create unique index if not exists leads_submission_id_key on public.leads (submission_id);
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.leads'::regclass and conname='leads_tracking_consent_check') then
    alter table public.leads add constraint leads_tracking_consent_check check (
      (tracking_consent is true and tracking_consent_at is not null and attribution_captured_at is not null)
      or (utm_source is null and utm_medium is null and utm_campaign is null and utm_term is null
        and utm_content is null and gclid is null and gbraid is null and wbraid is null)
    );
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.leads'::regclass and conname='leads_sale_value_check') then
    alter table public.leads add constraint leads_sale_value_check check (sale_value is null or sale_value between 0 and 9999999999.99);
  end if;
end $$;

-- Apenas novos fechamentos de formulários recebem uma data. Sem backfill e sem uploads.
create or replace function public.mark_lead_closed_at() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.source = 'formulario' and new.status = 'Fechado'
    and old.status is distinct from 'Fechado' and old.closed_at is null then
    new.closed_at := now();
  else
    new.closed_at := old.closed_at;
  end if;
  return new;
end $$;
revoke all on function public.mark_lead_closed_at() from public, anon, authenticated;
grant execute on function public.mark_lead_closed_at() to service_role;
drop trigger if exists leads_mark_closed_at on public.leads;
create trigger leads_mark_closed_at before update on public.leads
for each row execute function public.mark_lead_closed_at();

alter table public.leads enable row level security;
revoke all on public.leads from anon, authenticated;
grant all privileges on public.leads to service_role;
notify pgrst, 'reload schema';
