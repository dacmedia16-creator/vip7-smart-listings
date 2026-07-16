## Corrigir link "não encontrado"

O site usa `BrowserRouter` (não `HashRouter`), então o `#/` no link gerado quebra a rota. A rota real é `/imovel/:codigo`.

### Mudança

Em `src/crm/pages/ImovelDetail.tsx`, trocar:

```ts
const linkPublico = `${window.location.origin}/#/imovel/${codigoPublico}`;
```

por:

```ts
const linkPublico = `${window.location.origin}/imovel/${codigoPublico}`;
```

Sem outras alterações.
