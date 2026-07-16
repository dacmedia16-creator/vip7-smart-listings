## Problema

Ao colar o link do imóvel no WhatsApp, aparece o preview genérico da VIP7 (escudo dourado + descrição da empresa), e não a foto e as informações do imóvel específico.

Isso acontece porque a app é uma SPA (React + Vite). Quando o robô do WhatsApp acessa `https://vipsevenimoveis.com.br/imovel/{id}`, ele recebe o `index.html` genérico — não consegue executar JavaScript para ler o título, a descrição e a foto do imóvel.

## Solução

Já existe uma edge function `og-metadata` no backend que:
- Consulta o imóvel no banco
- Retorna HTML com meta tags `og:image`, `og:title`, `og:description` específicas do imóvel para robôs (WhatsApp, Facebook, Twitter, etc.)
- Redireciona usuários reais para a página bonita `/imovel/{id}` no site

Vou trocar o link copiado no card "Link do site" do CRM para apontar para essa edge function, passando o `id` do imóvel e o `redirect` para o site final. O robô do WhatsApp vai ler as meta tags e mostrar:

- **Foto principal** do imóvel (primeira foto do array `fotos`)
- **Título** do imóvel (ex.: "Casa em Alto da Boa Vista | VIP7 Imóveis")
- **Descrição** com tipo, finalidade (Venda/Aluguel), bairro, cidade e preço formatado

Quem clicar continua caindo em `https://vipsevenimoveis.com.br/imovel/{id}` normalmente.

## Alterações

**`src/crm/pages/ImovelDetail.tsx`** (linha 164)

Trocar:

```ts
const linkPublico = `${window.location.origin}/imovel/${imovel.id}`;
```

por:

```ts
const siteOrigin = "https://vipsevenimoveis.com.br";
const destinoFinal = `${siteOrigin}/imovel/${imovel.id}`;
const linkPublico = `https://qozlwzgesezsygmnuzky.supabase.co/functions/v1/og-metadata?codigo=${imovel.id}&redirect=${encodeURIComponent(destinoFinal)}`;
```

O comportamento do card não muda: continua mostrando o link, o botão "Copiar" copia essa URL, e "Abrir no site" abre em nova aba (a edge function redireciona o navegador para a página real).

## Observação

A `og-metadata` já lida com o `id` UUID (fallback pelo `id` da tabela `imoveis_proprios`), já busca a primeira foto do array `fotos`, e já monta descrição com tipo/bairro/cidade/preço. Nenhuma mudança no backend é necessária.
