# Importar proprietários dos 110 imóveis de locação faltantes

## Diagnóstico da planilha
- `imoveis-2026-06-07-170311.xls` é HTML com 110 linhas — todas `Finalidade = Aluguel`.
- A coluna **`Proprietarios`** vem em formato pipe-delimitado:
  `Cód. <codigo_imoview_cliente> | Nome | (DDD) telefone | email (opcional)`
- 100% das linhas têm proprietário preenchido. Não há CPF/CNPJ.

## Estratégia
Reaproveitar o pipeline existente `import-proprietarios-batch` (edge function que já faz dedupe + upsert de cliente + vínculo `cliente_imoveis` com `papel='proprietario'`).

## Passos

1. **Script local de conversão** (Python, `/tmp/`): lê o .xls (HTML), parseia a coluna `Proprietarios` e gera o CSV no mesmo schema que a função espera:
   `codigo_imovel, o_codigo, o_doc, o_nome, o_email, o_tel, o_tel2, o_obs`
   - `codigo_imovel` ← `Codigo` da planilha
   - `o_codigo` ← número após `Cód.`
   - `o_nome` ← 2º campo
   - `o_tel` ← 3º campo (limpo, só dígitos)
   - `o_email` ← 4º campo se contiver `@`
   - `o_doc`, `o_tel2`, `o_obs` ← vazios

2. **Upload do CSV** para `lead-documentos/_tmp_import/staging_owners.csv` via `supabase.storage.upload` (sobrescreve).

3. **Invocar a função** `import-proprietarios-batch` — ela vai:
   - Casar `codigo_imovel` → `imoveis_proprios.codigo_imoview` (os 110 já existem no banco).
   - Casar/criar `clientes` por `codigo_imoview` (campo `o_codigo`).
   - Adicionar `proprietario` em `categorias`.
   - Criar vínculo `cliente_imoveis (papel='proprietario')`.

4. **Relatório**: mostrar o JSON de retorno (clientes novos/atualizados, vínculos criados, imóveis ausentes, erros).

## Fora de escopo
- Mudanças de UI ou no edge function (já está pronto).
- Importar outros campos da planilha (foco só em proprietários).
- Tratar duplicidades além do que a função já faz por `codigo_imoview` do cliente.

## Resultado esperado
Os 110 imóveis de locação passam a aparecer com proprietário vinculado em `/crm/imoveis/:id` e na contagem do diagnóstico anterior (110 → 0 sem proprietário).
