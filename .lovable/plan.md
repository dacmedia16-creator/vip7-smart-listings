## Rodar agora a importação dos inativos

Vou disparar diretamente a edge function `imoview-sync` no modo `inativos_por_codigos`, passando a lista de 1389 códigos extraídos da planilha que você enviou.

### Passos

1. **Extrair os códigos** da planilha `.xls` enviada (já feito anteriormente — 1389 códigos, de 2 a 3802).
2. **Chamar a edge function** `imoview-sync` com `mode: "inativos_por_codigos"` e a lista completa.
   - A função processa em lotes de ~20 códigos por execução, com auto-invocação encadeada até terminar.
   - Cada imóvel é buscado via `RetornarDetalhesImovel`, salvo com `ativo=false, status='inativo'` e tem fotos baixadas para o bucket `imoveis-fotos`.
3. **Registrar progresso** em `imoview_sync_log` (linha única do run, com `inserted/updated/photos_uploaded/errors_count`).
4. **Acompanhar via logs** da edge function e consultar `imoview_sync_log` ao final pra reportar o resultado (quantos novos, quantos atualizados, quantos com erro).

### Nada de UI ou schema

- Nenhuma mudança de código/UI/banco — só execução.
- Se algum código falhar (ex.: removido do Imoview), fica em `error_details` do log.

Depois que aprovar, eu disparo e te dou o status final.