## Problema

Ao clicar em "Importar proprietários", a página fica em branco com erro de runtime:
`Rendered more hooks than during the previous render`.

Causa: em `src/crm/pages/ImportarProprietarios.tsx` os early-returns
```ts
if (rolesLoading) return null;
if (!isAdmin) return <Navigate to="/crm" replace />;
```
estão nas linhas 124-125, **antes** dos `useMemo` declarados nas linhas 161 (`codigosNaPlanilha`) e 360 (`ausentesPreview`). No primeiro render `rolesLoading=true` retorna cedo (só 6 hooks). Quando roles carrega, o componente renderiza completo (16 hooks) — React aborta.

## Correção

Mover os early-returns para **depois** de todos os `useMemo`, logo antes do `return (<CrmLayout>...)`. Nenhuma outra mudança de lógica.

### Arquivo
- `src/crm/pages/ImportarProprietarios.tsx`
  - Remover linhas 124-125 (early returns no topo).
  - Antes do `return (<CrmLayout>...` (linha 366), adicionar:
    ```ts
    if (rolesLoading) return null;
    if (!isAdmin) return <Navigate to="/crm" replace />;
    ```

Sem migrações, sem mudança de UI ou comportamento.
