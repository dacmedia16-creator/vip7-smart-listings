
# Importar imóveis ativos do Imoview via XLS

## Contexto
- API Imoview (`RetornarImoveisDisponiveis`) retorna **1.232** imóveis (1.122 venda + 110 locação).
- Painel Imoview com filtro Situação="Vago/Disponível" + Venda mostra **2.545**.
- Diferença ~1.423 ficam invisíveis para a API — provavelmente são imóveis sem flag "exibir no site" / sem foto principal / sem CEP. Não há como pegar via listagem.
- **Único caminho confiável:** exportar a lista XLS do Imoview e importar por código, igual ao fluxo de inativos que já existe.

## Mudanças

### 1. Edge function `imoview-sync`
Adicionar um novo modo **`ativos_por_codigos`** (espelho do `inativos_por_codigos` já existente):
- Recebe `{ mode: "ativos_por_codigos", codigos: number[] }`
- Para cada código, busca detalhes via `App_RetornarDetalhesImovel` (com fallback para `RetornarDetalhesImovel`)
- Faz upsert em `imoveis_proprios` com:
  - `ativo = true`
  - `status = 'disponivel'`
  - resto dos campos vindos do detalhe
- Baixa fotos para o bucket `imoveis-fotos`
- Roda em chunks com auto re-invoke (mesma lógica de paginação por background do modo existente)
- Loga em `imoview_sync_log` com `mode='ativos_por_codigos'`

### 2. Tela `SincronizacaoImoview.tsx`
Adicionar **nova seção** "Importar imóveis ativos por planilha" (separada da seção de inativos):
- Input de upload `.xls` (reusa `parseImoviewXls` que já existe)
- Mostra "X códigos detectados · Y já no banco · Z novos"
- Botão "Importar X ativos" → chama `mode: 'ativos_por_codigos'`
- Confirmação antes de disparar
- Texto explicativo: "Use isto quando o Imoview tiver mais imóveis ativos do que o sync trouxe — exporte a lista filtrada por Situação=Vago/Disponível do Imoview e suba aqui. Eles entrarão como ativos no site."

### 3. Sem mudanças de schema
- Reusa `imoveis_proprios` (mesma estrutura)
- Reusa `imoview_sync_log` (já aceita qualquer string em `mode`)
- Reusa bucket `imoveis-fotos`

## Fluxo do usuário
1. No Imoview: Imóveis → filtrar Situação=Vago/Disponível → Exportar XLS (faz isso 1 vez para Venda e 1 vez para Aluguel, ou exporta tudo junto).
2. Na tela `/crm/configuracoes/imoview`, seção nova "Importar ativos por planilha", sobe o(s) XLS.
3. Sistema processa em background (~20–40 min para 2.5k imóveis com fotos), pode fechar a aba.
4. Acompanha pelo "Histórico" no fim da página.

## Observações
- Imóveis já existentes no banco serão **atualizados** (não duplicam — `codigo_imoview` é único).
- Os ~1.232 já sincronizados via API continuam funcionando normalmente; o XLS só adiciona os "invisíveis".
- Esse import **não desativa nada** — é puramente aditivo.
- Próximo full sync via API continuará trazendo só os 1.232 — então, sempre que precisar refrescar os "invisíveis", precisa subir o XLS de novo. (Se quiser eu posso depois criar um cron mensal por e-mail lembrando.)

## Arquivos tocados
- `supabase/functions/imoview-sync/index.ts` — adicionar branch `ativos_por_codigos`
- `src/crm/pages/SincronizacaoImoview.tsx` — adicionar seção de upload de ativos
