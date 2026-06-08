## Iniciar importação de desativados + proprietários

Você escolheu a opção 2: usar o fluxo que já existe, sem construir nova página de acompanhamento.

### Passo a passo

1. Abra **CRM → Imóveis → Importar desativados** (`/crm/imoveis/importar-desativados`).
2. Faça upload da planilha exportada do painel Imoview (.xls / .xlsx / .html com a lista de imóveis desativados).
3. Mantenha a checkbox **"Buscar proprietários no Imoview após importar"** marcada (padrão).
4. Clique em **Importar**.

### O que vai acontecer

- Os imóveis da planilha entram em `imoveis_proprios` com `status='inativo'`, `ativo=false`, `origem='imoview_desativado'`.
- Em seguida, a função `imoview-sync-proprietarios` é disparada automaticamente passando os UUIDs recém-inseridos.
- A própria tela faz polling em `imoview_sync_log` a cada 3s e mostra dois cards de resultado:
  - **Imóveis**: inseridos / ignorados / erros
  - **Proprietários**: vinculados / sem proprietário / erros (com link para `/crm/clientes`)
- Em paralelo, se quiser acompanhar no histórico geral, abra **Sincronização Imoview** — o run aparece com modo `proprietarios_full`.

### Não vou fazer agora

- Página dedicada de acompanhamento com barra grande + ETA + erros expandidos (fica para depois, se você validar que precisa).
- Nenhuma mudança de código.

### Precisa de mim?

Se algo falhar no meio do caminho (erro de login, imóveis sem proprietário, contagem estranha), me cola o print ou o trecho do card de resultado que eu investigo.
