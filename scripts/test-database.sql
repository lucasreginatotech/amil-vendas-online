-- Teste transacional: todos os registros técnicos são descartados no ROLLBACK.
begin;
do $$
declare
  submission uuid := gen_random_uuid();
  lead_id uuid;
  click_id uuid;
  saved_closed_at timestamptz;
begin
  insert into public.leads (name, plan, source, consent, submission_id, submission_fingerprint,
    tracking_consent, tracking_consent_at, attribution_captured_at, utm_source, utm_campaign, gclid)
  values ('Teste técnico rollback', 'Teste', 'formulario', true, submission, 'test',
    true, now(), now(), 'google', 'teste_transacional', 'TEST_CLICK') returning id into lead_id;
  insert into public.leads (name, plan, source, submission_id, submission_fingerprint)
    values ('Tentativa repetida', 'Teste', 'formulario', submission, 'test')
    on conflict (submission_id) do nothing;
  if (select count(*) from public.leads where submission_id = submission) <> 1 then
    raise exception 'Falha na unicidade do envio';
  end if;
  if (select utm_campaign from public.leads where id = lead_id) <> 'teste_transacional' then
    raise exception 'Origem não foi preservada';
  end if;
  update public.leads set status='Fechado', sale_value=300 where id=lead_id;
  select closed_at into saved_closed_at from public.leads where id=lead_id;
  if saved_closed_at is null then raise exception 'Fechamento sem data'; end if;
  update public.leads set notes='Teste de edição' where id=lead_id;
  if (select closed_at from public.leads where id=lead_id) <> saved_closed_at then
    raise exception 'Data de fechamento alterada na edição';
  end if;
  insert into public.leads (name,plan,source) values ('Clique técnico rollback','Teste','whatsapp') returning id into click_id;
  update public.leads set status='Fechado' where id=click_id;
  if (select closed_at from public.leads where id=click_id) is not null then
    raise exception 'Clique tratado como venda';
  end if;
  begin
    insert into public.leads (name,plan,tracking_consent,gclid) values ('Inválido','Teste',false,'FORBIDDEN');
    raise exception 'Identificador aceito sem consentimento';
  exception when check_violation then null;
  end;
  if has_table_privilege('anon','public.leads','SELECT') or has_table_privilege('authenticated','public.leads','SELECT') then
    raise exception 'Tabela de contatos exposta';
  end if;
  if not (select relrowsecurity from pg_class where oid='public.leads'::regclass) then
    raise exception 'RLS desativada';
  end if;
end $$;
select 'PASS: origem salva, envio único, fechamento estável, cliques sem data de venda, consentimento e acesso privado' as result;
rollback;
