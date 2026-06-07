# Corrigir filtro Condomínio / Edifício

## Problema

O autocomplete lista nomes vindos de 3 fontes:
1. `imoveis_proprios.edificio`
2. `imoveis_proprios.condominio_nome`
3. `condominios_cache.nome`

Mas a query atual filtra apenas a coluna `edificio`:

```ts
if (f.edificio) query = query.ilike('edificio', `%${f.edificio}%`);
if (f.tipo_condominio !== 'todos') query = query.eq('edificio', f.tipo_condominio);
```

Quando o usuário escolhe um nome que só existe em `condominio_nome` (ou veio do cache do Imoview), a listagem não filtra porque a coluna `edificio` está vazia/diferente nesses registros.

Há também um detalhe de UX: ao clicar em uma opção do autocomplete o valor é definido em `filters.edificio`, mas o filtro só é aplicado quando o usuário clica em **Aplicar filtros** (padrão atual do projeto — manter).

## Correção

Em `src/crm/pages/Imoveis.tsx`, dentro do `useEffect` que monta a query, substituir o filtro de `edificio` por um `OR` que cubra as duas colunas reais da tabela `imoveis_proprios`:

```ts
if (f.edificio) {
  const s = f.edificio.replace(/[,()]/g, ' ').trim();
  query = query.or(
    `edificio.ilike.%${s}%,condominio_nome.ilike.%${s}%`
  );
}
```

E remover (ou ajustar de forma equivalente) a linha redundante:

```ts
if (f.tipo_condominio !== 'todos') query = query.eq('edificio', f.tipo_condominio);
```

`tipo_condominio` não é exposto na UI atual (não há Select para ele), então a remoção é segura. Caso prefira manter por compatibilidade futura, aplicar a mesma lógica OR também para esse campo.

## Verificação

1. Abrir `/crm/imoveis`, abrir Filtros.
2. Digitar no campo Condomínio/Edifício um nome que sabidamente só aparece em `condominio_nome` (ex.: vindo do Imoview), selecionar e clicar **Aplicar filtros**.
3. Confirmar que a listagem reduz para apenas imóveis daquele condomínio.
4. Repetir com um valor que existe em `edificio` para garantir que continua funcionando.

## Escopo

- Arquivo único: `src/crm/pages/Imoveis.tsx`
- Apenas a lógica do filtro na construção da query Supabase; UI e autocomplete permanecem como estão.
