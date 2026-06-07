# Importação de clientes — correções e novos campos

## 1. Corrigir o erro no upload

Causas prováveis (a planilha do Imoview costuma ser grande e com separador `;`):

- **Payload grande demais** — hoje mandamos todas as linhas + `imoview_raw` (linha inteira) em **uma única chamada** ao edge function. Acima de ~3–5k linhas isso estoura o limite de 6 MB e a função retorna 413/500 silenciosamente.
- **Toast genérico** — `toast.error((e as Error).message)` mostra "Failed to send a request to the Edge Function", sem detalhe.
- **CSV com `;`** — Papaparse acerta na maioria, mas em alguns exports do Imoview o cabeçalho vem em UTF‑8 BOM e quebra o auto‑map.
- **Headers do XLSX** vêm só do `Object.keys(json[0])` — se a primeira linha tiver células vazias, perde colunas.

### O que vou fazer
- Enviar em **lotes de 300 linhas** a partir do frontend, com barra de progresso (`X / Total`), agregando o resultado.
- No payload, mandar **apenas as colunas mapeadas** (não a linha inteira) — reduz drasticamente o tamanho.
- Logar o erro real do edge function (status + body) no toast e no console.
- Aceitar BOM e detectar `;` explicitamente no Papaparse.
- Para XLSX: ler com `header: 1` e montar a união dos cabeçalhos das primeiras 50 linhas.
- No edge function: aumentar o limite por chamada para 500 e tirar a checagem rígida de 10k (passa a ser somatório dos lotes).

## 2. Novos campos da planilha

Mapeamento (aliases automáticos):

| Coluna planilha | Campo CRM |
|---|---|
| Finalidade | `finalidade` (venda/locacao) |
| Código atendimento | `codigo_atendimento` |
| Situação | `situacao` |
| Fase atendimento | `fase_atendimento` |
| Corretor | `corretor_nome` |

### Comportamento híbrido (escolhido pelo usuário)

Para cada linha:

1. **Sempre** faz upsert do **cliente** (como hoje, por `codigo_imoview` ou `cpf_cnpj`).
2. **Se houver `Código atendimento`** → cria/atualiza um **lead** vinculado:
   - `nome`, `email`, `telefone` ← do cliente.
   - `finalidade` ← normalizado (`venda` / `locacao`).
   - `corretor_id` ← busca em `profiles` por **nome** (case/acento‑insensitive). Se não achar, fica `NULL` e registra aviso no relatório.
   - `status_funil` ← derivado de `Situação` + `Fase atendimento` via tabela de‑para:
     - "Em andamento / Qualificação" → `qualificacao`
     - "Em andamento / Visita" → `visita`
     - "Em andamento / Proposta / Negociação" → `proposta`
     - "Concluído / Fechado / Ganho" → `fechamento`
     - "Perdido / Cancelado" → `perdido`
     - default → `novo`
   - `origem` → `manual` (enum existente).
   - `observacoes` ← prefixadas com `[Imoview #<codigo_atendimento>] <Situação> · <Fase>`.
   - **Dedup do lead**: por `imovel_interesse_codigo = codigo_atendimento` (usamos esse campo para guardar o código do atendimento) + telefone do cliente. Se já existir, faz `UPDATE`; senão `INSERT`.

### Tabela `leads` — sem migração necessária
Todos os campos já existem (`finalidade`, `corretor_id`, `status_funil`, `imovel_interesse_codigo`, `observacoes`, `origem`).

## 3. Arquivos afetados

- `src/crm/pages/ImportarClientes.tsx` — novos campos no `CRM_FIELDS`, envio em lotes com progresso, mensagens de erro melhores, leitura mais robusta de CSV/XLSX.
- `supabase/functions/imoview-import-csv/index.ts` — aceitar `batch`/`batchIndex`, construir e upsertar lead quando houver `codigo_atendimento`, resolver corretor por nome, retornar contagens de leads (`leads_inseridos`, `leads_atualizados`, `corretores_nao_encontrados`).

## 4. Resultado final na tela
Cards de resumo passam a mostrar:
- Clientes: inseridos / atualizados / ignorados
- Leads: inseridos / atualizados / sem corretor encontrado
- Botão de baixar CSV de erros (mantido)
