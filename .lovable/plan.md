## Plano: Desacoplar do Imoview antes do cancelamento

Objetivo: garantir que site principal, CRM e avaliação IA continuem 100% funcionais usando apenas o banco local (`imoveis_proprios`, `condominios_cache`, `clientes`), sem nenhuma chamada em tempo real à API do Imoview.

---

### Fase 1 — Filtros do site principal (CRÍTICO)

Hoje os filtros de Cidade, Bairro, Tipo e Condomínio são buscados em tempo real via edge function que chama o Imoview.

**Mudança:** passar a derivar as listas direto do banco `imoveis_proprios` (apenas registros `ativo=true` e `status` público).

- Criar uma RPC `public.filtros_site()` que retorna em uma chamada:
  - cidades distintas (com contagem)
  - bairros distintos por cidade
  - tipos distintos (com contagem)
  - condomínios distintos (nome + código)
  - faixa de preço min/max por finalidade
- Trocar as chamadas das edge functions de filtros pelo `supabase.rpc('filtros_site')` no frontend público.
- Manter cache em memória (React Query) com `staleTime` longo.

### Fase 2 — Avaliação por IA

Hoje a avaliação busca comparáveis na API do Imoview.

**Mudança:** buscar comparáveis no próprio banco `imoveis_proprios` filtrando por cidade/bairro/tipo/área similar, e enviar para o Gemini.

- Ajustar a edge function de avaliação para consultar `imoveis_proprios` (sem chamar Imoview).
- Manter o prompt e a lógica do Gemini intactos.

### Fase 3 — OG Metadata (preview social)

Hoje o detalhe do imóvel para preview social busca na API.

**Mudança:** ler de `imoveis_proprios` por `codigo_imoview` ou `id`.

- Ajustar a edge function/rota de OG para ler do banco local.

### Fase 4 — Desligar syncs e marcar como legado

- Desativar (não excluir) as edge functions de sync: imóveis, clientes, proprietários, condomínios.
- Remover os cron jobs que disparam esses syncs.
- Manter os secrets `IMOVIEW_*` por enquanto (podem ser removidos depois).
- Adicionar um banner no CRM (somente admin/gestor) indicando: "Sync Imoview desativado em DD/MM/AAAA. Imóveis com `origem='imoview'` estão congelados."

### Fase 5 — CRM: tratar imóveis legados do Imoview

- Imóveis com `origem='imoview'` continuam editáveis no CRM (você assume a manutenção manual).
- Opcional: adicionar badge "Legado Imoview" no card do imóvel para diferenciar dos `origem='proprio'`.

---

### Detalhes técnicos

- Nenhuma alteração de schema obrigatória; apenas uma nova RPC `filtros_site` (SECURITY DEFINER, STABLE, leitura pública).
- Edge functions a editar: `valuation`, `og-metadata` (ou similares), e as de filtros do site.
- Edge functions a desativar: `imoview-sync-imoveis`, `imoview-sync-clientes`, `imoview-sync-proprietarios`, `imoview-sync-condominios` (nomes a confirmar ao implementar).
- Frontend público: trocar hooks de filtros para usar a RPC.
- React Query com cache agressivo nos filtros para evitar latência.

### Ordem sugerida de execução

1. Fase 1 (filtros) — mais visível ao usuário final.
2. Fase 2 (avaliação IA).
3. Fase 3 (OG metadata).
4. Fase 4 (desligar syncs + banner).
5. Fase 5 (UX legado no CRM).

Pode ser feito tudo de uma vez ou em PRs separados. Recomendo fazer Fases 1–3 **antes** de cancelar o Imoview, e Fases 4–5 no dia do cancelamento.

---

Quer que eu execute tudo nessa ordem, ou prefere começar só pela Fase 1 (filtros) para validar antes?