# Mapa do projeto

Guia rápido dos arquivos para localizar cada parte do site e do CRM.

## Site público

- `index.html`, `planos.html`, `rede-credenciada.html` e `sobre.html`: páginas que o visitante acessa.
- `assets/js/config.js`: número do WhatsApp usado pelo site.
- `assets/js/whatsapp.js`: links do WhatsApp e envio da cotação ao CRM.
- `assets/js/navigation.js`: menu para celular.
- `assets/js/main.js`: pequenas funções comuns, como o ano do rodapé.
- `assets/css/main.css`: importa os estilos do site.
- `assets/css/base.css`: cores, fontes e regras globais.
- `assets/css/layout.css`: cabeçalho, navegação, rodapé e estrutura.
- `assets/css/components.css`: botões, cartões e componentes reutilizáveis.
- `assets/css/pages.css`: estilos específicos das seções e páginas.
- `assets/css/responsive.css`: adaptações para celular e tablet.

## CRM e armazenamento

- `crm.html` e `assets/css/crm.css`: tela privada e visual do painel de leads.
- `assets/js/crm.js`: login, consulta, edição e exportação dos leads.
- `api/leads.js`: valida e grava cotações enviadas pelo formulário.
- `api/admin-login.js`: entrada e saída do painel administrativo.
- `api/crm-leads.js`: consulta e atualização dos leads no painel.
- `lib/http.js`: funções comuns para as respostas das APIs.
- `lib/session.js`: proteção de sessão do painel.
- `supabase/leads-schema.sql`: estrutura da tabela de leads no Supabase.
- `CRM_SETUP.md`: configuração do Supabase e das variáveis privadas na Vercel.

As chaves do Supabase e a senha do painel ficam nas variáveis privadas da Vercel, nunca nos arquivos públicos do site.
