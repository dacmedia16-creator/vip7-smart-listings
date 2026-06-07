# Importar proprietários a partir de planilha de Imóveis

## Objetivo
Como o login Imoview está fora do ar, vamos popular os proprietários via planilha de **Imóveis** (1 linha = 1 imóvel) exportada do Imoview, contendo colunas do proprietário (nome, telefone, CPF, etc.). O match no CRM é por **código Imoview do imóvel**.

## Nova página `/crm/imoveis/importar-proprietarios`

Fluxo em 4 passos (mesma UX da `ImportarClientes`):

1. **Upload** do arquivo (CSV/XLSX/XLS).
2. **Mapeamento** de colunas — auto-detecta por alias e permite ajuste manual.
3. **Pré-visualização** das 10 primeiras linhas + contadores ("X imóveis encontrados no CRM, Y ausentes").
4. **Importar** com barra de progresso e relatório final.

### Campos mapeáveis
**Imóvel (chave):**
- `codigo_imovel` *(obrigatório — match por `imoveis_proprios.codigo_imoview`)* — aliases: `código`, `codigo`, `código imóvel`, `cod. imóvel`, `id imóvel`.

**Proprietário (dados que serão salvos em `clientes`):**
- `proprietario_nome` *(obrigatório)* — aliases: `proprietário`, `proprietario`, `nome do proprietário`, `nome proprietário`.
- `proprietario_tipo_pessoa` — aliases: `tipo pessoa proprietário`, `pj/pf`.
- `proprietario_cpf_cnpj` — aliases: `cpf proprietário`, `cnpj proprietário`, `cpf/cnpj proprietário`.
- `proprietario_rg`, `proprietario_email`, `proprietario_telefone`, `proprietario_telefone_secundario`, `proprietario_data_nascimento`.
- Endereço do proprietário: `proprietario_endereco`, `numero`, `complemento`, `bairro`, `cidade`, `estado`, `cep`.
- `proprietario_codigo_imoview` (se vier — usado pra dedup preferencial).
- `proprietario_percentual` (% de participação se houver — vai pra `cliente_imoveis.percentual`).
- `proprietario_observacoes`.

Se a planilha tiver **múltiplos proprietários por imóvel** em colunas tipo `Proprietário 2 Nome`/`Proprietário 2 Telefone`, mapeia também (até 3 proprietários por linha — configurável depois se precisar de mais).

## Lógica de processamento (client-side, em batches de 200)

Para cada linha:
1. **Match do imóvel** por `codigo_imoview` (carrego o set de códigos do CRM uma vez no início).
   - Se não encontrar → conta em `imoveis_ausentes` (lista com até 200 códigos no relatório, e CSV pra baixar).
2. **Upsert do cliente** (`clientes`):
   - Dedup: `codigo_imoview` (se mapeado) → fallback `cpf_cnpj` → fallback `telefone + nome`.
   - Marca `categorias` com `'proprietario'` (mantém categorias existentes).
   - `origem = 'imoview_csv'` se for novo.
3. **Vínculo** (`cliente_imoveis`):
   - `upsert` com `onConflict: cliente_id,imovel_id,papel`, `papel='proprietario'`, `percentual` se mapeado.

### Tela de resultado
Badges com:
- Clientes novos / Clientes atualizados.
- Vínculos criados / Vínculos já existentes (não recontados).
- Imóveis ausentes do CRM (com botão "Baixar lista de códigos ausentes").
- Erros por linha (com botão "Baixar erros").

## Detalhes técnicos
- **Arquivos a criar:**
  - `src/crm/pages/ImportarProprietarios.tsx` — nova página completa.
  - Rota nova em `src/App.tsx` (ou onde está o roteamento do CRM): `/crm/imoveis/importar-proprietarios` protegida por `admin|gestor`.
  - Link no menu de "Imóveis" do CRM (botão "Importar proprietários" ao lado de "Importar imóveis"/novo).
- **Sem migrações** — usa `imoveis_proprios`, `clientes`, `cliente_imoveis` já existentes.
- **Sem edge function** — toda a lógica é client-side (admin/gestor), igual à `ImportarClientes`. RLS atual já permite `INSERT/UPDATE/UPSERT` nessas tabelas para admin/gestor.
- **Sem dependências novas** — reutiliza `papaparse` + `xlsx` que já estão instalados.
- **Texto/normalização** reutiliza helpers de `ImportarClientes.tsx` (normHeader, autoMap) extraindo pra `src/crm/lib/csvMapping.ts` se valer a pena, ou copia o necessário se for menos invasivo.

## Não muda
- A página `ImportarClientes` continua igual.
- A edge function `imoview-sync-proprietarios` e o botão "Buscar no Imoview" do `ProprietariosCard` continuam — quando a senha voltar você usa eles.

## O que você precisa fazer
Exportar do Imoview a planilha de Imóveis garantindo que as colunas do proprietário (nome, telefone, CPF) venham no export. Se quiser me mandar 1 amostra do CSV antes, eu já configuro os aliases corretos pra auto-mapear sem você precisar ajustar coluna por coluna.
