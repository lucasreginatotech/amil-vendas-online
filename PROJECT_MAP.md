# Mapa do projeto

Guia rápido dos arquivos para localizar cada parte do site e do CRM.

## Site público

- `index.html`, `planos.html`, `rede-credenciada.html` e `sobre.html`: páginas que o visitante acessa.
- `assets/js/config.js`: número do WhatsApp usado pelo site.
- `assets/js/whatsapp.js`: links do WhatsApp, registro de cliques diretos e envio da cotação ao CRM.
- `assets/js/navigation.js`: menu para celular.
- `assets/js/main.js`: pequenas funções comuns, como o ano do rodapé.
- `assets/js/conversion.js`: seleção do perfil, preenchimento da cotação e botão fixo no celular.
- `assets/js/network.js`: pesquisa local na base da rede, validação da fonte e estados de indisponibilidade.
- `assets/data/network.json`: base da rede; está vazia enquanto aguarda uma fonte oficial atualizada.
- `assets/favicon.svg`: ícone do site.
- `assets/css/main.css`: importa os estilos do site.
- `assets/css/base.css`: cores, fontes e regras globais.
- `assets/css/layout.css`: cabeçalho, navegação, rodapé e estrutura.
- `assets/css/components.css`: botões, cartões e componentes reutilizáveis.
- `assets/css/pages.css`: estilos específicos das seções e páginas.
- `assets/css/responsive.css`: adaptações para celular e tablet.
- `assets/css/premium.css`: refinamentos da identidade visual e estilos da consulta da rede.
- `assets/css/conversion.css`: perfis comerciais, comparação de propostas e jornada de cotação.
- `assets/css/mobile.css`: ajustes finais para telas pequenas, textos, campos e botões fixos.

Os estilos são importados nesta ordem: base, layout, componentes, páginas, responsivo, premium, conversão e mobile. A ordem define a prioridade das regras; preserve-a ao fazer ajustes.

## Comparação e documentação

- `comparar.html`: mostra a página inicial original e a atual lado a lado.
- `antes/`: cópia histórica dos arquivos públicos; não editar ao atualizar o site atual.
- `REDE_SETUP.md`: formato e critérios para cadastrar uma base oficial da rede.
- `.editorconfig`: espaçamento, codificação e finais de linha usados pelo editor.
- `.prettierrc.json`: padrão de formatação de HTML, CSS e JavaScript.
- `.prettierignore`: exclui a cópia histórica e arquivos temporários da formatação.
- `.gitignore`: impede o versionamento de dependências, arquivos temporários e segredos locais.

## Como manter o código organizado

Mantenha a lógica em `assets/js/`, os estilos em `assets/css/` e as funções privadas em `api/` e `lib/`. As páginas públicas continuam na raiz para preservar os endereços existentes.

Com Node.js e npm instalados, use o mesmo formatador desta organização:

```sh
npx prettier@3.9.9 --check .
npx prettier@3.9.9 --write .
```

O formatador não substitui a conferência dos links, da navegação e do envio de cotação. Mudanças nas regras de sessão e nas APIs exigem verificação adicional de autenticação e acesso aos dados.

## CRM e armazenamento

- `crm.html` e `assets/css/crm.css`: tela privada e visual do painel de leads.
- `assets/js/crm.js`: login, visão geral com gráficos, filtros, edição, exclusão e exportação dos leads.
- `api/leads.js`: valida e grava cotações enviadas pelo formulário.
- `api/admin-login.js`: entrada e saída do painel administrativo.
- `api/crm-leads.js`: consulta, atualização e exclusão autenticada de leads no painel.
- `lib/http.js`: funções comuns para as respostas das APIs.
- `lib/session.js`: proteção de sessão do painel.
- `supabase/leads-schema.sql`: estrutura da tabela de leads no Supabase.
- `CRM_SETUP.md`: configuração do Supabase e das variáveis privadas na Vercel.

As chaves do Supabase e a senha do painel ficam nas variáveis privadas da Vercel, nunca nos arquivos públicos do site.
