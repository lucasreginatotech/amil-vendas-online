# Rede credenciada dentro do site

A interface usa `assets/data/network.json`. Nenhum prestador é fictício ou copiado de listas antigas. A base inicial fica vazia porque o acesso ao guia oficial retornou 403 e não foi fornecido um arquivo atual da operadora. Não há integração ao vivo implementada: a pesquisa é local sobre uma exportação oficial verificada pelo responsável do site.

Para ativar, obtenha uma exportação autorizada e atualizada da Amil com a relação por produto. Converta para o formato abaixo, preservando os nomes exatos dos produtos e unidades. `updatedAt` é a data em que os dados foram conferidos na fonte, não apenas a data de upload. `source.url` deve apontar ao documento exato em domínio oficial da Amil. Uma URL oficial sozinha não prova a origem dos registros: o responsável deve confrontar o conteúdo com o material.

```json
{
  "status": "ready",
  "source": { "label": "Nome do documento oficial", "url": "https://galeria.amil.com.br/CAMINHO-REAL-DO-DOCUMENTO" },
  "updatedAt": "DATA-REAL-DA-CONFERENCIA-EM-ISO-8601",
  "providers": [
    {
      "name": "NOME EXATO DA UNIDADE NA FONTE",
      "type": "Hospital",
      "city": "MUNICIPIO DA UNIDADE",
      "state": "SP",
      "address": "ENDERECO CONFIRMADO (opcional)",
      "phone": "TELEFONE CONFIRMADO (opcional)",
      "plans": ["NOME EXATO DO PRODUTO"],
      "specialties": ["SERVICO CONFIRMADO"]
    }
  ]
}
```

Os textos acima são marcadores de documentação, não registros utilizáveis. Não os publique como dados. Tipos permitidos: Hospital, Clínica, Laboratório, Profissional. Uma unidade deve ser um registro; não atribua a rede de um plano a outro por semelhança de nome. Não inclua CPF, carteirinha ou dados de beneficiários.

O site bloqueia a exibição se faltar origem, houver formato inválido ou a conferência tiver mais de 30 dias. Exibe a data e a fonte quando a consulta está disponível. Os filtros, a busca sem distinção de acentos, os contatos e a paginação funcionam depois da inclusão da base. Em caso de indisponibilidade, oferece uma mensagem de WhatsApp com os critérios informados, sem afirmar que existe ou inexiste cobertura.

Não há iframe nem proxy para contornar bloqueios da operadora. Uma futura API oficial requer documentação e autorização antes de substituir a exportação. Credenciais devem ficar exclusivamente no servidor.

Sirva o projeto por HTTP para a busca funcionar; `file://` pode impedir a leitura do JSON. A comparação fica em `comparar.html`, com a versão original preservada em `antes/`. A cópia original é apenas visual: seus links de páginas internas não foram duplicados.
