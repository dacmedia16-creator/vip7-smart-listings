## Problema

A planilha do Imoview que você importou tem **uma linha por atendimento** (cliente repete + código do imóvel). Mas o importador atual:

1. **Não tem coluna mapeada para "código do imóvel"** — só código de atendimento.
2. **Nunca cria registros em `cliente_imoveis`** — só insere/atualiza o cliente.
3. Só cria um lead se houver `código atendimento` + telefone, e mesmo assim sem ligar ao imóvel.

Resultado atual no banco: 2.766 clientes, **0 vínculos**, **0 leads com imóvel de interesse**.

## O que vou fazer

### 1. Frontend (`ImportarClientes.tsx`)
- Adicionar novo campo no mapeamento: **"Código do imóvel"** (aliases: `codigo imovel`, `código imóvel`, `cod imovel`, `imovel`, `cod. imovel`).
- Mostrar no resultado: **"Vínculos criados: N"** e **"Imóveis não encontrados: N"** (códigos que estavam na planilha mas não existem em `imoveis_proprios`).

### 2. Edge function (`imoview-import-csv`)
- Ler `mapping.codigo_imovel` em cada linha.
- Inferir papel a partir de `Situação` / `Finalidade`:
  - contém "loca"/"alug"/"inquil" → `locatario`
  - contém "capta"/"propriet" → `proprietario`
  - contém "vend"/"compr" → `comprador`
  - fallback → `interessado`
- Pré-carregar todos os `imoveis_proprios` cujos `codigo_imoview` aparecem no lote (1 query por batch).
- Para cada linha com código de imóvel encontrado, fazer `upsert` em `cliente_imoveis` com `onConflict: cliente_id,imovel_id,papel` (mesmo padrão usado pela sync via API).
- Devolver contadores extras: `vinculos_criados`, `vinculos_ignorados_sem_imovel`, `codigos_imoveis_nao_encontrados` (lista única, top 50).
- Também preencher `imovel_interesse_codigo` no lead quando houver código de imóvel (mesmo sem código de atendimento).

### 3. Reprocessamento dos 2.766 clientes já importados
Depois que o código estiver atualizado, você precisa **reabrir o mesmo arquivo e clicar em "Importar" novamente** — o importador vai deduplicar por `codigo_imoview`/`cpf_cnpj` (clientes existentes serão apenas **atualizados**, não duplicados) e desta vez vai criar os vínculos.

### Pré-requisito importante

Os vínculos só serão criados para imóveis cujo `codigo_imoview` **já exista** na tabela `imoveis_proprios`. Se a sincronização de imóveis está parada porque o login do Imoview ainda está rejeitado, muitos códigos da planilha não vão bater. O resultado vai mostrar quantos códigos não foram encontrados para você decidir se precisa rodar a sync de imóveis antes.

## Banco

Sem migration. Só usa `cliente_imoveis` (já existe) e `imoveis_proprios.codigo_imoview` (já indexado).

## Arquivos alterados

```text
src/crm/pages/ImportarClientes.tsx          (novo campo + UI de resultado)
supabase/functions/imoview-import-csv/index.ts  (mapeamento, pré-carga, upsert vínculos, contadores)
```
