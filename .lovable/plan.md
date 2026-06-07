# Importar planilha de imóveis desativados

A planilha `imoveis-2026-06-07-172459.xls` é, na verdade, um HTML exportado pelo Imoview com ~1.389 imóveis e ~100 colunas (Codigo, Tipo, Finalidade, Valor, Cep, Endereco, Bairro, Cidade, Estado, NumeroQuarto, NumeroSuite, NumeroBanheiro, NumeroVaga, AreaLote, AreaInterna, MotivoDesativacao, etc.). Todos serão importados em `imoveis_proprios` já marcados como inativos.

## 1. Página de importação

Nova rota `/crm/imoveis/importar-desativados` (link em **Configurações** ao lado de "Importar Leads/Clientes/Proprietários"), com:

- Upload do arquivo (.xls/.xlsx/.html — parser via SheetJS `xlsx` já no projeto, com fallback `pd.read_html`-like usando `XLSX.read(..., {type:'binary'})` que lida com Excel-HTML).
- Pré-visualização das primeiras 5 linhas e contagem total.
- Botão **Importar** chama edge function em lotes de 200.

## 2. Edge Function `imoveis-import-desativados`

Recebe `{ rows: [...] }` e para cada linha:

- `codigo_imoview` = `Codigo` (int).
- **Política de conflito (default):** se já existir um `imoveis_proprios` com mesmo `codigo_imoview` → **pular** (não sobrescreve ativos). Contar como `ignorados_duplicados`.
- Senão `INSERT` com:
  - `status = 'inativo'`, `ativo = false`
  - `origem = 'imoview_desativado'`
  - `titulo` = `${Tipo} em ${Bairro}, ${Cidade}` (ou `Empreendimento` quando houver)
  - `tipo`, `finalidade` (normalizar venda/locacao), `destinacao`
  - Endereço: `cep`, `endereco`, `numero`, `complemento`, `bairro`, `segundo_bairro`, `cidade`, `estado`, `regiao`, `ponto_referencia`
  - Financeiro: `preco` (Valor), `valor_anterior`, `condominio`, `iptu` (mensal), `iptu_anual`, `rentabilidade_pct`, `comissao_venda_pct`
  - Áreas: `area` (AreaInterna), `area_total` (AreaLote), `area_externa`
  - Quartos/suítes/banheiros/vagas/salas/varandas
  - Prédio: `edificio` (Empreendimento), `condominio_nome` (Condominio), `andar`, `num_andares`, `num_torres`, `total_unidades`, `unidades_por_andar`, `elevadores`, `construtora`, `ano_construcao` (de Idade), `tipo_vaga`, `piso_acabamento`, `posicao_imovel`
  - Características booleanas (ArCondicionado, BoxBanheiro, Closet, etc.) → array `caracteristicas` (mesmas chaves usadas no resto do CRM, ver `src/crm/lib/imoveis.ts`)
  - `observacoes_internas` = `Motivo desativação: ${MotivoDesativacao}` quando houver
  - `local_chaves`, `identificador_chaves`, `num_chaves`, `num_controles`, `horario_visita`, `na_planta`, `exclusivo`, `placa_faixa`

Retorna `{ inseridos, ignorados_duplicados, erros: [{ linha, motivo }] }`.

## 3. UI: aviso e resultado

- Banner explicando que os imóveis ficam invisíveis no site público (RLS já bloqueia `status != disponivel/sob_proposta`) e aparecem apenas no CRM (Imóveis com filtro Status=Inativo).
- Após importar, mostrar contadores e link "Ver inativos" → `/crm/imoveis?status=inativo`.

## Detalhes técnicos

- Arquivos novos: `src/crm/pages/ImportarImoveisDesativados.tsx`, `supabase/functions/imoveis-import-desativados/index.ts`.
- Edits: `src/App.tsx` (rota), `src/crm/components/CrmSidebar.tsx` ou página Configurações (link), `supabase/config.toml` (verify_jwt da nova função).
- Sem migration — `imoveis_proprios` já tem todas as colunas necessárias.
- Parser .xls-HTML no browser: `XLSX.read(arrayBuffer, { type: 'array' })` do `xlsx` (já presente em `ImportarLeads`/`ImportarClientes`) — funciona tanto pra .xlsx real quanto pro HTML disfarçado de .xls que o Imoview gera.
