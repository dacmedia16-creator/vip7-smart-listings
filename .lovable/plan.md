## O que vai mudar

No importador de leads (`/crm/leads/importar`):

### 1. Subir todos os leads (resolver limite de 200)

O export "Atendimentos" do Imoview pagina em 200 linhas por arquivo. O importador hoje aceita só um arquivo. Vou:

- Trocar o input para aceitar **vários arquivos de uma vez** (`multiple`).
- Ler cada arquivo (CSV / XLSX / XLS-HTML), juntar todas as linhas em uma única lista, deduplicar dentro do próprio lote (mesmo telefone aparecendo em duas páginas exportadas conta uma vez só), e mostrar quantas linhas vieram de cada arquivo.
- Manter o mesmo passo de preview/mapeamento, só que aplicado ao conjunto unificado.

Resultado: você baixa todas as páginas do Imoview, seleciona todas juntas e sobe de uma vez.

### 2. Criar/atualizar cliente como "comprador"

Para cada lead que entrar (não duplicado), também gravar na tabela `clientes`:

- **Buscar cliente existente** pelo telefone (dígitos) ou e-mail.
- **Se não existir**: criar com `nome`, `telefone`, `email`, `tipo_pessoa='fisica'`, `origem='lead_import'`, `categorias=['comprador']`, e cidade/observações vindas do lead.
- **Se já existir**: dar `update` adicionando `'comprador'` ao array `categorias` (sem duplicar — usar união) e preenchendo campos vazios (não sobrescreve dados já cadastrados).

Isso roda no mesmo loop da importação, logo após o `insert` do lead dar certo. Se a criação do cliente falhar, o lead continua válido — o erro entra no relatório como aviso, não bloqueia.

### 3. Relatório final ampliado

Trocar o painel "Importação concluída" para mostrar:

- Arquivos processados (nome + linhas)
- Leads novos / duplicados / ignorados
- Clientes novos / clientes atualizados (categoria adicionada)
- Lista de erros (até 50, como hoje)

### Detalhes técnicos

Arquivo único alterado: `src/crm/pages/ImportarLeads.tsx`.

- `handleFile(file)` vira `handleFiles(files: FileList)` que itera, reaproveita o parser atual, e concatena `rows[]`. Dedup no lote por chave `digits(telefone) || lower(email)`.
- Novo helper `upsertClienteComprador(lead)`:
  - `select id, categorias, email, cidade from clientes where telefone = $1 or (email is not null and lower(email)=lower($2)) limit 1`
  - se vazio → `insert` com `categorias: ['comprador']` e `origem: 'lead_import'`
  - se existe → `update` com `categorias = array(distinct existentes + 'comprador')`, preenchendo apenas campos `null` no registro atual.
- Sem mudanças de schema. `clientes.categorias` já é `text[]` e RLS permite insert/update para corretor/gestor/admin (`can_manage_clientes`), que é o mesmo papel exigido na página.
- Sem alteração na rota nem no botão de "Importar planilha" da página de Leads.

### O que NÃO muda

- Lógica de mapeamento de colunas, status e origem do lead.
- Regras de dedupe de leads (RPC `find_duplicate_lead` por 30 dias).
- Permissões (continua restrito a admin/gestor).
- Visual da página (já está no tema claro do CRM).
