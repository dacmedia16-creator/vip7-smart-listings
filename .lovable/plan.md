## Plano: Importação manual de clientes (CSV/Excel do Imoview)

Como o login automático na API do Imoview continua sendo rejeitado (401 em `App_ValidarAcesso`), vamos viabilizar a carga de clientes via **upload manual de um arquivo CSV/XLSX** exportado do painel Imoview.

### 1. Tela de upload no CRM
- Nova seção em **/crm/sincronizacao-imoview** (ou nova rota `/crm/clientes/importar`):
  - Botão "Selecionar arquivo" (.csv, .xlsx)
  - Pré-visualização das primeiras 10 linhas com mapeamento automático de colunas
  - Mapeamento manual editável (combo "coluna do arquivo → campo do CRM")
  - Botões "Validar" e "Importar"

### 2. Mapeamento de campos
Campos da tabela `clientes` que serão preenchidos (auto-detecção por nome de cabeçalho, case-insensitive):

| Campo CRM | Cabeçalhos aceitos |
|---|---|
| `nome` | Nome, Nome Completo, Razão Social |
| `tipo_pessoa` | Tipo, Pessoa (Física/Jurídica) |
| `cpf_cnpj` | CPF, CNPJ, CPF/CNPJ, Documento |
| `email` | Email, E-mail |
| `telefone` | Telefone, Celular, Telefone 1 |
| `telefone_secundario` | Telefone 2, Telefone Secundário |
| `data_nascimento` | Nascimento, Data de Nascimento |
| `endereco`, `numero`, `complemento`, `bairro`, `cidade`, `estado`, `cep` | Endereço, Nº, Complemento, Bairro, Cidade, UF, CEP |
| `categorias` | Categoria, Tipo de Cliente (split por vírgula/`;`) |
| `codigo_imoview` | Código, Código Imoview, ID |
| `observacoes` | Observações, Obs |

### 3. Edge function `imoview-import-csv`
- Recebe `{ rows: [...], mapping: {...} }`
- Para cada linha:
  - Normaliza CPF/CNPJ (só dígitos), telefone, email (lower), CEP
  - Define `tipo_pessoa` automaticamente pelo tamanho do documento (11=fisica, 14=juridica)
  - `origem = 'imoview_csv'`
  - **Upsert** por `codigo_imoview` (se presente) ou por `cpf_cnpj`, ou por `(nome+telefone)` como fallback
  - Guarda payload original em `imoview_raw`
- Retorna `{ inseridos, atualizados, ignorados, erros: [{linha, motivo}] }`
- Registra resumo em `imoview_sync_log` com `tipo = 'csv_manual'`

### 4. Validações/UX
- Limite de 10.000 linhas por upload (chunks de 500 server-side)
- Barra de progresso em tempo real
- Download de relatório de erros (CSV) ao final
- Avisos: linhas duplicadas, documentos inválidos, e-mails malformados

### 5. Detalhes técnicos
- Parse CSV: `papaparse` (delimitador auto, encoding UTF-8/Latin-1)
- Parse XLSX: `xlsx` (SheetJS)
- Ambos no client; só os JSON normalizados sobem para a edge function
- Sem dependência da API Imoview — funciona offline da integração

### 6. O que NÃO faz nesta etapa
- Não importa vínculo cliente-imóvel (`cliente_imoveis`) — pode ser fase 2 quando você exportar a planilha de proprietários/inquilinos.
- Não toca em `imoview-sync-clientes` (mantemos para quando o login da API for resolvido).

### Próximo passo prático
Antes de eu implementar, me envie **um arquivo de exemplo** (CSV ou XLSX) exportado do painel Imoview — basta arrastar aqui na conversa. Assim eu ajusto o mapeamento automático aos cabeçalhos reais do seu export e evito retrabalho.
