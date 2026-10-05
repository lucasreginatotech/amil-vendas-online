# Consulta da rede credenciada

A página rede-credenciada.html pesquisa o material fornecido pelo responsável pelo site. A consulta começa por cidade e nome do prestador, sem exigir um plano.

## Fonte cadastrada

- Gravação: Gravando 2026-10-05 144942.mp4, recebida do responsável pelo site.
- Origem visível: Painel do Corretor, tabela de produtos Amil em São Paulo.
- Data do material: 05/10/2026. A data da gravação não comprova a atualização da rede pela operadora.
- SHA-256 do vídeo: 03db61538a344f79c2b35aa8788cb8eee319477b5fafd98fc9cecda7dd592029a.
- Índice: 446 registros em 13 agrupamentos da fonte, com 120 cidades identificadas.
- 128 registros não têm cidade da unidade identificada. Ao filtrar uma cidade, são exibidos somente quando o visitante marca a opção correspondente. Sem cidade selecionada, é possível pesquisá-los pelo nome.

O material é uma referência de terceiros, sem integração em tempo real com a Amil. A interface não o apresenta como base oficial verificada. Não foram acrescentados endereços, telefones, especialidades, coordenadas ou distâncias.

## Organização e fidelidade

assets/data/network.json contém o índice pesquisável. O nome mantém a identificação do prestador do material, com normalização de espaçamento e cidades escritas por extenso quando identificadas na própria tabela. A região original fica em region. cityBasis distingue cidade no nome de agrupamento regional da capital. SP sozinho no nome de um laboratório não permite atribuir cidade. Ophthal H Especializado Unid SBC na seção Zona Leste fica sem cidade: a seção e o nome não permitem confirmar a localização dessa unidade.

Cada registro tem evidence com o instante do quadro e as coordenadas da linha. Os arquivos em assets/data/network-source/ preservam o cabeçalho dos produtos e a linha original em imagens separadas para evitar downloads repetidos. O cabeçalho foi obtido no mesmo nível de zoom; somente seu título regional foi removido, pois a região correta é exibida no cartão. As células de produtos e atendimentos permanecem como na gravação. A legenda é apresentada em texto no diálogo. Nenhum traço foi convertido em uma promessa de exclusão de cobertura, e nenhuma presença na tabela foi convertida em cobertura para todos os produtos.

O vídeo completo, dados do navegador, contatos de terceiros, avisos de acesso e ferramentas temporárias não são publicados. Os recortes mostram somente a tabela.

## Busca e manutenção

assets/js/network-data.js valida o contrato e aplica filtros sem acentos. assets/js/network.js monta os cartões, a expansão de todos os resultados, os atalhos de cidade e o diálogo da fonte. assets/css/network.css adapta a consulta e o diálogo para celular. As imagens dos detalhes são carregadas somente ao abrir o prestador.

O filtro Zona / região usa os agrupamentos originais da gravação. ABC Paulista corresponde à seção ABCD - SP; as zonas da capital continuam separadas das regiões da Grande SP. O botão Ver todos os resultados revela todos os prestadores que correspondem aos filtros ativos em um único clique. Uma nova busca volta a mostrar os primeiros 12 cartões.

As sugestões de outras cidades usam o mesmo agrupamento da fonte. Elas não representam distância ou proximidade geográfica; principalmente Interior reúne municípios muito distantes.

Para atualizar o material, conferir os nomes e municípios contra a nova fonte, substituir os recortes e atualizar recording, recordedAt e sha256. Não trocar apenas a data da referência. Se houver arquivo estruturado confiável no futuro, registrar sua origem e conservar as diferenças por produto, unidade e serviço.

## Verificação

Com Node.js instalado: node scripts/check-network.mjs. O teste verifica o contrato, a existência dos 446 recortes, a busca sem acentos, os filtros e a exclusão de prestadores sem cidade quando essa opção não está selecionada. Os testes automatizados não substituem a conferência das linhas contra a fonte nem a confirmação atual da operadora.
