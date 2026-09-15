# Ver quantos imóveis estão em destaque nos portais

## Situação hoje

Na tela Portais, cada portal mostra apenas um número: o total de imóveis publicados. Não há como saber quantos desses estão como Destaque, Super Destaque, etc.

Números atuais no Zap + VivaReal:

- 216 publicados como Simples
- 32 publicados como Destaque
- 4 publicados como Super Destaque
- Total publicado: 252

Os outros portais (OLX, ImovelWeb, Chaves na Mão) ainda não têm imóveis marcados.

## O que será feito

1. **Contagem de destaques no cartão de cada portal**
   No quadro de cada portal, além do total publicado, aparece a quebra por tipo de anúncio — por exemplo "252 publicados · 36 em destaque", com o detalhe por tipo (Destaque, Super Destaque, Triple, Premiere) ao passar o mouse.

2. **Novo filtro "Tipo de anúncio" na lista**
   Um filtro ao lado dos já existentes permite listar só os imóveis em Destaque, só Super Destaque, só Simples, ou todos. Assim dá para ver exatamente quais imóveis estão em cada tipo.

3. **Contador do resultado filtrado**
   A lista mostra quantos imóveis o filtro atual encontrou, para conferir rapidamente.

## Detalhes técnicos

- Arquivo: `src/crm/pages/Portais.tsx`.
- `contagens` passa a produzir, por portal, `{ total, porTipo: Record<TipoAnuncio, number> }` a partir das linhas de `imovel_portais` com `publicar = true` (os dados de `tipo_anuncio` já são carregados).
- Novo estado `filtroTipoAnuncio: TipoAnuncio | 'todos'`, aplicado no `useMemo` de filtragem junto aos demais; incluído no "Limpar filtros" e no reset de paginação.
- Rótulos vêm de `TIPOS_ANUNCIO` em `src/crm/lib/portais.ts`; nenhuma mudança de banco ou de feed.
