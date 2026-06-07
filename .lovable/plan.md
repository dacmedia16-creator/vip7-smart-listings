## Diagnóstico

- Hoje só existem **3 imóveis** em `imoveis_proprios` (todos ativos/públicos) — por isso o site mostra quase nada.
- O log de sync mostra que rodadas anteriores marcaram `status=ok` com `total=1213` mas `inserted=0` (rodaram antes dos fixes recentes em `pickCodigo` / `unwrapDetail` / `persistStats`).
- Há um log `259aa774-…` ainda em `status=running` desde 00:24 (chunk derrubado por timeout, nunca retomou). Ele bloqueia visualmente novas execuções e polui a tela "Sincronização Imoview".

## Causa

O catálogo nunca foi populado porque os primeiros runs da edge function `imoview-sync` rodaram com bugs já corrigidos:
1. `pickCodigo` não conseguia extrair `codigo` dos itens da listagem → `fetchDetails` nunca era chamado.
2. `fetchDetails` não desempacotava o envelope (`imovel`/`dados`/`resultado`) → mapeamento devolvia row sem `codigo_imoview`.
3. Updates do `imoview_sync_log` só aconteciam no fim do chunk → timeouts deixavam contadores zerados e cursor parado.

Esses três bugs já estão corrigidos no `supabase/functions/imoview-sync/index.ts` da edição anterior, mas **nunca chegou a rodar um full sync limpo depois disso**.

## Plano

1. **Encerrar o sync travado** `259aa774-…`: marcar como `failed` para liberar a UI de "Sincronização Imoview".
2. **Disparar full sync novo** via edge function (`POST /functions/v1/imoview-sync` com `{ mode: 'full' }`) usando o código já corrigido. Ele:
   - usa `pickCodigo` tolerante;
   - desempacota detalhes com `unwrapDetail`;
   - persiste a linha do imóvel ANTES de espelhar fotos;
   - atualiza contadores do log a cada imóvel (sobrevive a timeout);
   - auto-reinvoca em chunks de 4 páginas até concluir as 60 páginas (~1213 itens).
3. **Acompanhar progresso** consultando `imoview_sync_log` a cada ~30s até `status='ok'` ou `'partial'`. Esperado: `inserted ≈ 1213`.
4. **Validar no site**: abrir `/`, `/imoveis`, e um `/imovel/:codigo` no preview — confirmar listagem populada, filtros respondendo, e imagens carregando do bucket `imoveis-fotos`.

## Validação

- `SELECT count(*) FROM imoveis_proprios` deve subir de 3 para ~1200+.
- Last `imoview_sync_log` com `status='ok'` e `inserted > 0`, `photos_uploaded > 0`.
- Home renderiza seções "Destaques Venda" e "Destaques Locação" com cards reais.

## Fora de escopo

- Mudanças de UI/filtros/tema.
- Reescrita do scheduler de sync incremental.
- Limpeza dos logs antigos com `inserted=0` (ficam só como histórico).
