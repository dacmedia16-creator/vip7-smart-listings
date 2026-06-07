## Diagnóstico

O preview não carrega porque o Vite está quebrando ao pré-bundlar dependências:

```
[vite] error while updating dependencies:
Error: ENOENT: no such file or directory, open '/dev-server/node_modules/date-fns/index.mjs'
Error: ENOENT: no such file or directory, open '/dev-server/node_modules/date-fns/locale.mjs'
```

Causa: o projeto está com `date-fns@^4.4.0`, mas:
- O Vite optimizer tenta resolver `date-fns` e `date-fns/locale` como entry points `.mjs` (formato do v2/v3) — esses arquivos não existem no v4 (que é totalmente subpath-based, ex.: `date-fns/format`).
- `react-day-picker@^8.10.1` (usado pelo shadcn Calendar) tem peerDependency com `date-fns@^2 || ^3`, não suporta v4 oficialmente.

Resultado: o dev server falha ao otimizar deps e nada renderiza no preview.

## Correção

1. Baixar `date-fns` para a faixa compatível com `react-day-picker@8` e com o pré-bundling do Vite:
   - alterar `package.json`: `"date-fns": "^3.6.0"`
   - rodar `bun install` (auto-restart do dev server)
2. Se o erro persistir após o reinstall (cache do Vite), apagar `node_modules/.vite` e reiniciar o dev server.

## Validação

- Confirmar nos logs do Vite ausência de `error while updating dependencies`.
- Abrir `/` e `/crm/imoveis` no preview e verificar render.
- Conferir que componentes que usam `date-fns` continuam funcionando: `Calendar` (shadcn), formatações em `Agenda.tsx`, `Tarefas.tsx`, `Dashboard.tsx`, `InteracaoTimeline.tsx`.

## Fora de escopo

- Atualizar `react-day-picker` para v9 (que aceita date-fns v4) — mudaria props do Calendar.
- Qualquer outra mudança de UI/feature.
