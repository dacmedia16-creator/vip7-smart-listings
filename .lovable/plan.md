## Diagnóstico

Sua planilha tem 2 problemas que impedem a importação:

**1. O arquivo `.xls` da Imoview é, na verdade, HTML**
Começa com `<div><table>...`. A página atual usa `XLSX.read()`, que não entende esse formato → cabeçalhos não são lidos corretamente.

**2. A coluna `Proprietarios` é texto livre**
Não existem colunas separadas de Nome/CPF/Tel/Email — está tudo concatenado em uma célula, por exemplo:

```
Cód. 2652 | Eder Souza | (15) 98176-7268 | eder@remax.com.br
Cód. 3727 | Francisco Nobre | CPF: 229.216.178-89 | (15) 99752-3267 | fabiano@motoresnobre.com.br
1) Cód. 4607 | Daniel | (11) 98208-2350 2) Cód. 4612 | Fernando | (19) 99195-3433
Cód. 6430 | GUILHERME NIELSEN | (15) 99836-7938, (15) 99662-4798
Cód. 1339 | Paulette | (11) 99686-1190 | https://www.vip7imoveis.com.br/...
```

Por isso o seletor de "Nome do proprietário" não tem o que escolher.

## Correção

Tudo na página `src/crm/pages/ImportarProprietarios.tsx`. Sem migração, sem mudança de UI fora desta tela.

### 1. Suportar `.xls` em formato HTML
No `handleFile`, antes de cair em XLSX:
- Ler os primeiros bytes; se começar com `<` (ou `<!DOCTYPE`/`<html`/`<div`/`<table`), parsear via `DOMParser` (`text/html`), pegar a primeira `<table>`, extrair a primeira linha como cabeçalho e as demais como linhas (objeto `{header: cellText}`).
- Caso contrário, manter o fluxo atual (XLSX para `.xlsx`/`.xls` binário, Papa para CSV).

### 2. Detectar a coluna `Proprietarios` e novo modo "campo concatenado"
- Adicionar no `IMOVEL_FIELD` o alias `codigo` já existe — ok.
- Adicionar um campo especial **`proprietarios_raw`** com label "Proprietários (campo único do Imoview)" e aliases `['proprietarios','proprietários','proprietario','proprietário']`.
- Auto-map: se a planilha tem `Proprietarios`, ele é mapeado nesse campo, e os campos `p1_*`/`p2_*`/`p3_*` ficam opcionais.
- Validação do botão "Importar": ou `p1_nome` está mapeado **ou** `proprietarios_raw` está mapeado.

### 3. Parser do campo `Proprietarios`
Função `parseProprietariosCell(text: string): Owner[]` (até 3):

1. **Split por slots** com regex `/(?:^|\s)(\d+)\)\s+/` para separar `1) ... 2) ... 3) ...`. Se não houver `N)`, tratar como 1 slot único.
2. Para cada slot, **split por `|`** em tokens, trim cada um.
3. Para cada token, classificar:
   - `Cód. 1234` ou `Cod. 1234` → `codigo_imoview` (número).
   - `CPF: 999.999.999-99` ou `CNPJ:` → `cpf_cnpj` (manter só dígitos via util já existente).
   - Match de `\(\d{2}\)\s?\d{4,5}-?\d{4}` em qualquer parte → telefone(s); se múltiplos separados por vírgula no mesmo token → `telefone` = 1º, `telefone_secundario` = 2º.
   - Match de `\S+@\S+\.\S+` → `email`.
   - URL (`https?://`) → ignorar.
   - Sobrando texto sem rótulo → `nome` (primeiro token não-rotulado). Limpar parênteses tipo `(VIP7 1868) Interesse ...` colocando no campo `observacoes`.
4. Descartar slot sem `nome`.

### 4. Integração no `startImport`
No loop de linhas, **antes** dos slots `p1/p2/p3`:
- Se `proprietarios_raw` está mapeado, chamar `parseProprietariosCell(row[col])` e tratar cada owner retornado como um slot (mesma lógica de upsert já existente: dedup por `codigo_imoview` → `cpf_cnpj` → `telefone+nome`).
- Se também houver colunas `p1_*` mapeadas, processar ambos (sem duplicar via mesma chave de dedup).
- Vínculo em `cliente_imoveis` com `papel='proprietario'` continua igual.

### 5. Pré-visualização
A tabela de preview já mostra todas as colunas — nenhuma mudança. Apenas o auto-map e a validação mudam.

### Arquivo único editado
- `src/crm/pages/ImportarProprietarios.tsx`

### Validação após implementar
- Abrir `/crm/imoveis/importar-proprietarios`, subir o `.xls` enviado.
- Confirmar: 1.140 linhas, 158 colunas detectadas, campo `Proprietarios` auto-mapeado em "Proprietários (campo único do Imoview)".
- Rodar importação e conferir contagens (esperado ~606 proprietários únicos, alguns imóveis com 2-3 owners).
