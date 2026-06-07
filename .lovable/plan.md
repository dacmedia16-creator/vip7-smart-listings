## Objetivo

Popular e manter a tabela `cliente_imoveis` com papel `'interessado'` ligando cada cliente aos imóveis que ele visitou/atendeu — vindo de 3 fontes: histórico do Imoview, ação manual no CRM e leads novos automaticamente.

---

## 1. Importação histórica do Imoview (one-shot)

Script de backfill que roda 1 vez sobre os atendimentos do Imoview:

- Para cada atendimento, ler `codigo_cliente` (Imoview) e `codigo_imovel` (Imoview).
- Resolver `cliente_id` via `clientes.codigo_imoview` e `imovel_id` via `imoveis_proprios.codigo_imoview`.
- Inserir em `cliente_imoveis` com `papel = 'interessado'`, usando `upsert` em `(cliente_id, imovel_id, papel)` para não duplicar.
- Ignorar (e contar) linhas sem match de cliente ou imóvel.
- Entregar relatório: vínculos criados, ignorados por cliente faltante, ignorados por imóvel faltante.

Execução: edge function nova `imoview-vincular-interessados` chamada pela tela de Sincronização do Imoview, ou rodada pontual via script — definir na implementação.

---

## 2. UI manual no CRM (daqui pra frente)

### Tela do Cliente (`/crm/clientes/:id`)
- Nova seção **"Imóveis de interesse"** ao lado de "Imóveis vinculados".
- Botão **"Adicionar imóvel de interesse"** abre combobox que busca em `imoveis_proprios` por código Imoview, título ou bairro.
- Lista mostra: foto, código, título, cidade/bairro, preço, status — com botão remover.
- Usa `addVinculo(clienteId, imovelId, 'interessado')` que já existe em `src/crm/lib/clientes.ts`.

### Tela do Imóvel (`/crm/imoveis/:id`)
- Nova seção **"Interessados"** abaixo de "Proprietários".
- Lista clientes com `papel = 'interessado'` vinculados ao imóvel.
- Mostra: nome, telefone (com botão WhatsApp), e-mail, data do vínculo, link para o cliente.
- Botão **"Adicionar interessado"** com busca em `clientes`.

---

## 3. Trigger automático para leads novos

Trigger no banco em `leads` (AFTER INSERT OR UPDATE):

- Disparar quando `imovel_interesse_codigo` estiver preenchido E o lead já tiver um cliente correspondente (match por `telefone` ou `email` em `clientes`).
- Resolver `imovel_id` em `imoveis_proprios` via `codigo_imoview = imovel_interesse_codigo::int`.
- Fazer `INSERT ... ON CONFLICT DO NOTHING` em `cliente_imoveis` com `papel = 'interessado'`.
- Função `SECURITY DEFINER` com `search_path = public` (padrão do projeto).

Cobertura: todo lead novo (do site, importado, ou criado no CRM) gera o vínculo sem ação manual.

---

## Resumo da estrutura

```text
Fonte                     →  Vínculo cliente_imoveis (papel='interessado')
─────────────────────────────────────────────────────────────────────────
1. Backfill Imoview       →  edge function (one-shot)
2. UI CRM cliente/imóvel  →  botões "Adicionar"
3. Lead criado/editado    →  trigger no banco
```

---

## Detalhes técnicos

- Tabela já existe: `cliente_imoveis` com unique `(cliente_id, imovel_id, papel)` — todos os caminhos usam upsert/`ON CONFLICT DO NOTHING`, então rodar múltiplas vezes é seguro.
- Papel sempre `'interessado'` (não inferir comprador a partir de fase, conforme decidido).
- RLS atual de `cliente_imoveis` (`can_manage_clientes`) já cobre admin/gestor/corretor para inserir manualmente. Trigger roda como `SECURITY DEFINER`, contornando RLS.
- Funções helper já disponíveis: `addVinculo`, `removeVinculo`, `listVinculosByCliente`, `listVinculosByImovel` em `src/crm/lib/clientes.ts`.

---

## Itens fora do escopo (perguntar depois se quiser)

- Histórico de "quando" o interesse foi registrado (hoje só temos `created_at` do vínculo).
- Score de interesse / múltiplas visitas ao mesmo imóvel.
- Promoção automática `interessado → comprador` quando lead vai para fase de fechamento.
