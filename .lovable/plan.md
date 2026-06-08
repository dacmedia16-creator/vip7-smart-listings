## Objetivo

Trazer para o CRM os 1389 imóveis "Desativado" da planilha que você enviou (e qualquer outra lista futura), com fotos, marcando `ativo=false` e `status='inativo'`, sem que a sync normal os reative.

## Como vai funcionar

1. Na página **Sincronizar Imoview** entra uma nova seção **"Importar desativados por planilha"**:
   - botão para subir o arquivo `.xls` exportado da Imoview (mesmo formato deste);
   - prévia mostrando quantos códigos foram detectados e quantos já existem no banco;
   - botão **"Importar inativos"** dispara a sync em background.

2. A edge function `imoview-sync` ganha um novo modo `inativos_por_codigos`:
   - recebe a lista de códigos;
   - para cada código chama `RetornarDetalhesImovel?codigoimovel=XXXX` (que funciona pra qualquer status);
   - usa o mesmo `mapToRow` que já existe, mas força `ativo=false` e `status='inativo'`;
   - baixa fotos pro bucket `imoveis-fotos` igual o fluxo atual;
   - processa em lotes (~25 por chamada) e auto-continua, igual o modo `full` já faz, pra não estourar timeout;
   - grava progresso em `imoview_sync_log` (você acompanha em tempo real).

3. **Proteção contra reativação automática**: a sync normal (`full` / incremental) hoje faz upsert com `ativo: true` cego. Vou ajustar para **não sobrescrever `ativo`/`status` de um registro que já está marcado como inativo** — só reativa se você fizer isso manualmente. Assim, na próxima sincronização normal os 1389 continuam como inativos.

4. **Filtro do CRM**: já está pronto (`Visibilidade = Apenas inativos / desativados` + `Situação = Inativo`). Depois da importação, os imóveis aparecem nesse filtro com badge "Desativado" no card.

## Detalhes técnicos

**Arquivos a alterar / criar**
- `supabase/functions/imoview-sync/index.ts` — novo modo `inativos_por_codigos`, helper `importInativos(codigos[])`, e ajuste no upsert dos outros modos para preservar `ativo=false`.
- `src/crm/pages/SincronizarImoview.tsx` (ou equivalente) — bloco de upload `.xls/.csv`, parser client-side (regex sobre `<td>` igual fiz aqui), chamada à edge function passando os códigos em lotes (~500 por requisição pra evitar payload grande), barra de progresso lendo `imoview_sync_log`.
- Sem mudança de schema; reuso `imoveis_proprios`.

**Estratégia da chamada**
- Cliente faz upload → parse local → envia `{ codigos: [...] }` ao endpoint.
- Edge function cria 1 registro em `imoview_sync_log` (mode `inativos_por_codigos`), grava o cursor `{ idx: 0 }` em `cursor`, processa ~25 códigos, atualiza cursor, e reagenda a si mesma via fetch interna até `idx >= total`.
- Cada item: `RetornarDetalhesImovel` → mapToRow → upsert por `codigo_imoview` com `ativo=false, status='inativo', imoview_sync_at=now()` → mirror das fotos.

**Tratamento de erros**
- Código que retornar 404 ou vazio é registrado em `error_details` e segue adiante (não trava o lote).
- Resumo final no log: `total`, `inserted`, `updated`, `photos_uploaded`, `errors_count`.

## Tempo estimado de execução

1389 imóveis × (~1 chamada detalhe + N fotos). Em lotes de 25 com paralelismo de 5, fica em torno de 15–25 min rodando em background. Você pode fechar a aba.

## O que NÃO entra nesse plano

- Não vou criar UI separada de "gerenciar inativos" — eles aparecem nos filtros normais.
- Não vou mexer no site público (RLS já bloqueia inativos lá).
- Não vou adicionar botão de "Desativar manualmente" (pode ser próxima iteração se quiser).

Confirma que posso seguir?