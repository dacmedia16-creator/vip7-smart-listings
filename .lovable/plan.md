## Objetivo
Importar imóveis desativados (com fotos + dados completos + proprietários) direto da API Imoview, sem depender de planilha.

## Diagnóstico
Endpoints já testados e descartados:
- `RetornarImoveis` → 404
- `RetornarImoveisInativos` → 404
- `RetornarImoveisDisponiveis` → só ativos (já em uso)

O único endpoint App_ que confirmadamente traz inativos é `App_RetornarDetalhesImovel`, mas precisa do código pra chamar — não lista.

## Etapa 1 — Probe (descartável, 1 edge function temporária)

Criar `supabase/functions/imoview-probe-inativos` que tenta autenticado (com `codigoacesso`) os candidatos abaixo e devolve qual respondeu 200 com lista:

```
GET  /Imovel/App_RetornarImoveis?pagina=1&quantidade=10&situacao=inativo
GET  /Imovel/App_RetornarImoveisInativos?pagina=1&quantidade=10
GET  /Imovel/App_RetornarTodosImoveis?pagina=1&quantidade=10
GET  /Imovel/App_RetornarImoveisAlterados?dias=3650&pagina=1&quantidade=10
POST /Imovel/App_PesquisarImoveis  body: { situacao: "inativo", pagina:1, quantidade:10 }
```

Retorna JSON tipo:
```json
{
  "results": [
    { "path": "...", "status": 200, "count": 47, "sample_codigo": 12345, "sample_situacao": "Inativo" },
    { "path": "...", "status": 404 }
  ]
}
```

Rodar via curl_edge_functions. **Sem alterar nada na UI ainda.**

## Etapa 2 — Decisão (depende do resultado da Etapa 1)

**Caso A — algum endpoint funciona:**
- Adicionar `mode: 'desativados_api'` em `imoview-sync` reaproveitando o paginador
- Trocar o card "Imóveis desativados" pra ter um botão único **"Sincronizar desativados via API (com fotos e proprietários)"** que:
  1. Pagina o endpoint descoberto → coleta códigos
  2. Pra cada código chama `App_RetornarDetalhesImovel` (já existente) → grava em `imoveis_proprios` com `status='inativo'`, `ativo=false`, baixa fotos
  3. No final, dispara `imoview-sync-proprietarios` com os UUIDs novos
- Manter o fluxo da planilha como fallback escondido (ou remover, se você preferir)

**Caso B — nenhum endpoint funciona:**
- Te aviso aqui e a única opção continua sendo a planilha
- Não mexo na UI

## Etapa 3 — Limpeza
Deletar `imoview-probe-inativos` (só serve pra descoberta).

## O que NÃO vou fazer
- Varredura sequencial de códigos (1..N) — descartado: lento, frágil, queima quota
- Mexer no fluxo de sincronização de ativos que já funciona
- Construir UI nova antes de saber se a API responde
