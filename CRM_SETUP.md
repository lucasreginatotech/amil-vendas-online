# CRM simples do site

O painel privado fica em `/crm.html`. O formulário público salva cada cotação na tabela `public.leads`. Cliques diretos nos botões do WhatsApp também entram como leads identificados como **Clique direto no WhatsApp**, sem inventar nome, telefone ou e-mail. O painel permite atualizar o status, registrar anotações, excluir leads com confirmação e baixar um CSV que abre no Excel.

## Origem, consentimento e reenvios

O domínio público é `https://www.vendasamilpmeonline.com.br/`. Nas quatro páginas, `assets/js/attribution.js` captura `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `gclid`, `gbraid` e `wbraid`. Uma URL com qualquer parâmetro válido substitui todo o conjunto anterior. Páginas sem parâmetros preservam o conjunto por uma visita com até 30 minutos de inatividade; após esse intervalo, uma entrada sem parâmetros é registrada como `(direto)`. O conjunto também expira após 30 dias desde sua captura. Sem parâmetros e sem histórico, a origem é direta. Sem autorização, a origem fica sem identificação e não se deve inferir que o contato é direto.

O checkbox obrigatório do formulário autoriza atendimento, não rastreamento. O aviso opcional de medição permite autorizar ou recusar e reabrir a preferência no rodapé; a escolha dura 180 dias. Antes de autorização, a tag Google não é carregada, não se persistem UTMs/IDs e não se enviam conversões. Após autorização, a mesma tag `AW-17545602600` é carregada uma vez, com Consent Mode (`ad_storage`, `ad_user_data` e `analytics_storage` autorizados; personalização sempre negada). Recusar/revogar limpa a origem do navegador e impede novos eventos. O histórico que já chegou ao CRM exige uma solicitação de exclusão separada. Sem storage, atendimento continua, mas a atribuição fica limitada à página atual.

Os payloads do formulário e do clique incluem atribuição e os timestamps de consentimento/captura. O servidor limita tamanhos, valida IDs e descarta a origem quando não existe consentimento explícito datado. Os campos novos são opcionais no banco; contatos antigos não são reescritos. Cartões, busca e CSV exibem origem/campanha; o CSV também inclui os oito parâmetros e os timestamps. Valores iniciados por caracteres de fórmula são neutralizados na exportação.

`assets/js/submission.js` guarda no sessionStorage somente UUID, hash dos campos e recibo de conversão, por até 24 horas; nunca guarda nome/telefone/e-mail em texto. O mesmo conteúdo reenviado usa o mesmo UUID; conteúdo alterado usa outro. A trava no handler bloqueia submissões simultâneas. A API usa a restrição UNIQUE de `submission_id` com `ON CONFLICT DO NOTHING`, devolve o ID persistido e rejeita a reutilização do UUID com conteúdo diferente (409). Clientes legados sem UUID continuam aceitos, mas não têm deduplicação de retries. O ID devolvido é o `transaction_id` da cotação; os recibos evitam disparos repetidos no navegador e o mesmo ID permite deduplicação no Google Ads.

## Atualização de banco existente

Antes de publicar esse código em um banco antigo, aplique `supabase/attribution-upgrade.sql`. A atualização adiciona colunas opcionais, índice de envio único e metadados de fechamento, sem backfill. Para projetos novos, `supabase/leads-schema.sql` já inclui tudo. O projeto conectado `amil crm leads` recebeu a atualização nesta revisão. RLS segue habilitada e `anon`/`authenticated` não têm acesso à tabela; somente o servidor usa a chave secreta. O aviso informativo do advisor sobre ausência de políticas RLS é esperado neste modelo de acesso exclusivamente pelo servidor.

## Testes

Execute `node scripts/test-integration.mjs` e `node scripts/test-crm.mjs`. O comando anterior `node scripts/test-whatsapp-tracking.mjs` continua disponível e chama a suíte completa. Esses testes executam scripts/handlers e API reais com DOM, respostas externas e storage simulados. `scripts/test-database.sql` testa a unicidade, atribuição, fechamento, consentimento e permissões no PostgreSQL real dentro de uma transação terminada em ROLLBACK; nenhum registro técnico fica no CRM.

Para validar Google Ads no navegador publicado, autorize a medição, conecte Tag Assistant e teste formulário e clique separadamente. Os testes locais verificam o evento enfileirado, não a recepção final pelo Google. Sem autorização, não deve haver conversões.

## Banco Supabase

1. Crie um projeto no Supabase.
2. No projeto, abra **SQL Editor** e execute o conteúdo de `supabase/leads-schema.sql`.
   - Se o projeto Supabase já existe, execute novamente o arquivo atualizado. Ele mantém os leads existentes e habilita a origem do lead e os cliques diretos do WhatsApp.
3. Em **Project Settings → API Keys**, copie o **Project URL** e a **Secret key** (`sb_secret_...`). A chave secreta fica apenas no servidor Vercel; nunca a coloque em arquivos do site.

## Variáveis da Vercel

Em **Project Settings → Environment Variables**, crie as seguintes variáveis para **Production**:

- `SUPABASE_URL`: Project URL copiado do Supabase.
- `SUPABASE_SECRET_KEY`: Secret key (`sb_secret_...`) copiada do Supabase.
- `CRM_ADMIN_PASSWORD`: uma senha forte e exclusiva para abrir `/crm.html`.

Salve as variáveis e publique um novo deployment. Elas só se aplicam a deployments novos.

## Acesso ao painel

Abra `https://SEU-DOMINIO/crm.html` e entre com `CRM_ADMIN_PASSWORD`. Não coloque a senha ou a chave secreta em arquivos do projeto nem as envie no chat.

## Conversão de clique direto no WhatsApp

A conversão de clique usa exatamente `AW-17545602600/I3jvCLO34JodEKjMsq5B`, configurado em `googleAdsWhatsAppConversionSendTo` no arquivo `assets/js/config.js`. O evento é enviado uma vez por clique nos links `a.js-whatsapp` fora do formulário, incluindo o botão flutuante das quatro páginas públicas. O evento contém apenas `send_to`, sem dados pessoais. Ele não dispara no carregamento, no botão de envio, na abertura automática do WhatsApp pelo formulário nem no link de recuperação. A classificação como secundária é feita na conta do Google Ads.

O clique continua sendo registrado no CRM com `source: 'whatsapp'` e abre o WhatsApp normalmente, mesmo se a tag estiver indisponível ou lançar erro. A conversão principal continua dependendo da confirmação da API do CRM. Execute `node scripts/test-whatsapp-tracking.mjs` para validar os handlers reais com DOM, API e Google Ads simulados, sem gerar leads reais.

## Envio da cotação

A cotação pede nome, WhatsApp e e-mail, com autorização de contato. Tipo de plano pode vir do perfil escolhido; quantidade de pessoas, cidade e estado ficam vazios até o atendimento. O esquema atual já aceita esses campos vazios. A API continua aceitando cadastros antigos completos.

Após a confirmação da API e com consentimento de medição, o site publica o evento `generate_lead` no `dataLayer`, sem nome, telefone ou e-mail. A mesma tag Google Ads `AW-17545602600` é usada nas quatro páginas públicas. A conversão “cotação enviada” está configurada via gtag com o destino `AW-17545602600/GndqCJ6o5ZodEKjMsq5B`, valor `1.0`, moeda `BRL` e `transaction_id` igual ao ID salvo no CRM. O destino fica em `googleAdsConversionSendTo`, no arquivo `assets/js/config.js`. O evento dispara apenas após a gravação confirmada da cotação, nunca ao abrir uma página. Não configure outro disparo do mesmo evento via Google Tag Manager para evitar duplicação. Valide a tag publicada antes de iniciar a campanha. Cliques diretos no WhatsApp permanecem separados dos cadastros confirmados. A conta Google Ads foi consultada em 12/10/2026: cotação é principal (`PrimaryForGoal=true`) e clique é secundária (`PrimaryForGoal=false`), ambas habilitadas e com contagem de uma por clique. Nenhuma configuração da conta foi alterada.

## Preparação de vendas offline — desabilitada

O trigger do banco só preenche `closed_at` na primeira transição de um formulário para “Fechado”, sem alterar vendas antigas nem datar cliques como vendas. O CRM permite guardar `sale_value` em BRL e não inclui cliques no contador de vendas. `lib/google-ads-sales.js` apenas prepara dados: não é chamado pelas rotas, não tem credenciais e não envia nada ao Google. Por padrão retorna `integration_disabled`. Mesmo em uma ativação futura, recusa cliques, contatos/fechamentos anteriores à data de ativação, falta de autorização, ausência de identificador de anúncio ou valor de venda ausente. A chave estável da venda é `sale:ID_DO_CONTATO`; ela é diferente do transaction_id da cotação.

Antes de habilitar, falta:

1. Criar uma ação própria de conversão de venda offline no Google Ads, distinta de cotação e clique, e definir contagem, janela de conversão, valor e moeda. Confirmar rotulagem automática e que redirecionamentos preservam os IDs.
2. Configurar uma conexão de importação no Google Ads/Data Manager e autenticação OAuth/Google Cloud exclusivamente no servidor, com acesso à conta `5885737995`. Registrar a ação de destino da venda. Para novas integrações, usar a Data Manager API; a API legada `UploadClickConversions` tem restrições para integrações sem histórico desde junho de 2026.
3. Definir o que `sale_value` representa comercialmente, preencher o valor real e registrar data/hora do fechamento. O R$ 1 da cotação não é valor de venda.
4. Definir uma data de ativação e uma fila de entrega futura com unicidade por `sale:ID`, retentativas, registro de sucesso/erro e tratamento de cancelamentos. Criar o adaptador para o formato da API de importação escolhida. Não selecionar contatos nem fechamentos anteriores à ativação.
5. Revisar consentimento/revogação antes do envio e validar os identificadores suportados pela conexão escolhida, especialmente GBRAID/WBRAID. Fazer teste de diagnóstico antes de habilitar qualquer upload. Não enviar PII nos eventos comuns; uma futura integração de conversões otimizadas com PII teria escopo e autorização próprios.

Referências oficiais: [Consent Mode](https://developers.google.com/tag-platform/security/guides/consent), [deduplicação por transaction_id](https://support.google.com/google-ads/answer/6386790), [importação de vendas e restrições atuais](https://developers.google.com/google-ads/api/docs/conversions/upload-offline).
