# CRM simples do site

O painel privado fica em `/crm.html`. O formulário público salva cada cotação na tabela `public.leads`. Cliques diretos nos botões do WhatsApp também entram como leads identificados como **Clique direto no WhatsApp**, sem inventar nome, telefone ou e-mail. O painel permite atualizar o status, registrar anotações, excluir leads com confirmação e baixar um CSV que abre no Excel.

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

## Formulário simplificado

A cotação pede nome, WhatsApp e e-mail, com autorização de contato. Tipo de plano pode vir do perfil escolhido; quantidade de pessoas, cidade e estado ficam vazios até o atendimento. O esquema atual já aceita esses campos vazios. A API continua aceitando cadastros antigos completos.

Após a confirmação da API, o site publica o evento `generate_lead` no `dataLayer`, sem nome, telefone ou e-mail. A tag Google Ads `AW-17545602600` está instalada nas quatro páginas públicas. Para ativar a conversão direta via gtag, preencha `googleAdsConversionSendTo` em `assets/js/config.js` com o valor completo `AW-17545602600/ROTULO` fornecido pelo snippet de evento do Google Ads. O rótulo ainda está pendente; sem ele, nenhuma conversão do Ads é enviada. O evento dispara apenas após a gravação confirmada da cotação. Não configure outro disparo do mesmo evento via Google Tag Manager para evitar duplicação. Valide a tag publicada antes de iniciar a campanha. Cliques diretos no WhatsApp permanecem separados dos cadastros confirmados.
