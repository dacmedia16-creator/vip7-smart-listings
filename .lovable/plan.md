# Prévia dos imóveis no WhatsApp

## O problema

Hoje, colar `vipsevenimoveis.com.br/imovel/2100` no WhatsApp mostra sempre o mesmo texto genérico ("VIP7 Imóveis | Imóveis de Alto Padrão") e o favicon, nunca a foto e o valor do imóvel. Confirmei isso pedindo a página como se fosse o WhatsApp: o endereço devolve a mesma página inicial para qualquer imóvel, porque o conteúdo só é montado depois, dentro do navegador — e o WhatsApp não espera por isso.

## O que vamos fazer

Atualizar o site para a tecnologia mais nova da Lovable (TanStack Start), que monta cada página já pronta no servidor. Com isso:

- Qualquer link de imóvel colado no WhatsApp, Instagram, Facebook ou LinkedIn mostra a foto principal, o título e o valor.
- O Google passa a enxergar o conteúdo real de cada imóvel, o que ajuda no aparecimento nas buscas.
- As páginas abrem mais rápido na primeira visita.

Depois da atualização, cada página de imóvel passa a gerar seu próprio título, descrição e foto de compartilhamento direto no endereço do site — sem depender do link especial de compartilhamento usado hoje.

## Como será feito

1. Atualização do site para a nova tecnologia, feita por mim, com verificação de que tudo continua funcionando: site público, busca de imóveis, mapas, avaliação, leads e todo o CRM.
2. Ajuste das páginas de imóvel para gerarem título, descrição, foto e endereço oficial no próprio servidor.
3. Testes com o "leitor" do WhatsApp em alguns imóveis (por código VIP e por código do Imoview) para confirmar a prévia.
4. Publicação, que é o momento em que as mudanças passam a valer no endereço oficial.

## Pontos importantes

- É uma mudança grande na base do site. Se algo não ficar bom, dá para desfazer pelo histórico da conversa.
- Enquanto eu trabalho, a pré-visualização continua mostrando o site atual; a versão nova aparece ao final.
- O botão de compartilhar atual continua funcionando normalmente durante todo o processo.
- Links já enviados no WhatsApp podem continuar mostrando a prévia antiga por um tempo, porque o WhatsApp guarda o que leu; links novos já saem corretos.
- Nada muda no banco de dados, nos imóveis, nos leads ou nos envios para os portais.

## Detalhes técnicos

- Migração in-place Classic (Vite + React Router) → TanStack Start usando a skill `migrate-to-tanstack`: preflight de stack e build, scan de rotas/providers/`index.html`/`main.tsx`, geração de `src/routes/` e `__root.tsx`, merge de `package.json`, e camadas de tratamento de erro SSR (`src/server.ts`, `src/start.ts`, `error-capture`, `errorComponent`).
- Pontos de atenção do projeto: tema custom em `src/index.css` (Cormorant/Outfit, paleta dourada) precisa ser reaplicado no `src/styles.css` (Tailwind v4); `react-helmet-async` em `ImovelDetail.tsx` e demais páginas é substituído por `head()` das rotas; tags de `index.html` migram para `__root.tsx`; Mapbox e outras libs browser-only podem exigir import dinâmico; rotas do CRM com guarda de autenticação precisam do inventário de wrappers.
- Após a migração, `/imovel/$codigo` passa a ter `loader` + `head()` com `og:title`, `og:description`, `og:image` (foto do bucket, renderização 1200x630) e `og:url` canônico próprio; `codigo_interno` (VIP####) e `codigo_imoview` continuam resolvendo.
- A edge function `og-metadata` e `buildOgShareUrl` permanecem como estão durante a migração e podem ser aposentadas depois, quando a prévia nativa estiver confirmada.
