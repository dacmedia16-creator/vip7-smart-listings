## Cancelar sincronização CSV manual presa

**Objetivo:** Cancelar a sincronização com ID `60cc1327-db72-4534-8e48-5279136d4926` na tabela `imoview_sync_log` para liberar os botões de sincronização da interface.

**Ação:**
- Executar `UPDATE` na tabela `imoview_sync_log` para o registro com `id = '60cc1327-db72-4534-8e48-5279136d4926'`, definindo `status = 'cancelled'` e `finished_at = now()`.

**Motivo:** O registro está com `status = 'running'` e `finished_at` nulo há ~19h, indicando que a sincronização CSV manual travou. Isso bloqueia os botões de sincronização no frontend pois a lógica de `disabled` considera qualquer sync em execução.