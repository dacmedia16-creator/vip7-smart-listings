# Fazer o link do imóvel mostrar foto e informações no WhatsApp

## O que está acontecendo

O endereço `https://vipsevenimoveis.com.br/imovel/VIP0010` é uma página que só se monta no celular de quem abre. O WhatsApp não abre a página: ele lê apenas o texto fixo do site, que é o mesmo para todas as páginas (nome da empresa e o ícone). Por isso não aparece foto nem valor.

O link que gera a prévia bonita (como na imagem que você mandou) é o que começa com `qozlwzgesezsygmnuzky.supabase.co` — ele entrega título, descrição e foto para o WhatsApp e, ao ser tocado, leva a pessoa direto para a página do imóvel no site.

Hoje esse link de prévia só entende código numérico do Imoview ou o identificador interno longo. Se alguém montar com "VIP0010", ele não encontra o imóvel e joga para a lista geral.

## O que vou fazer

1. Fazer o link de prévia aceitar também o código VIP (ex.: `...?codigo=VIP0010`), além do código numérico e do identificador longo.
2. Fazer o destino do clique apontar sempre para `https://vipsevenimoveis.com.br/imovel/VIP0010` (o mesmo código que aparece na página), em vez do identificador longo.
3. Usar o código VIP nos botões de compartilhar do site e no botão "Link do site" da ficha do imóvel no CRM, para o link copiado já sair pronto.

## Importante

O endereço curto `vipsevenimoveis.com.br/imovel/VIP0010` continuará sem prévia quando colado direto no WhatsApp — isso depende da hospedagem do site, que entrega a mesma página para todos os imóveis. Para compartilhar, use sempre o botão de compartilhar / "Link do site": quem clicar cai na página certa do site.

## Detalhes técnicos

- `supabase/functions/og-metadata/index.ts`: em `fetchPropertyDetails`, adicionar busca por `codigo_interno` (case-insensitive, padrão `^VIP\d+$`) antes do fallback por UUID; retornar `codigoExibicao = codigo_interno ?? codigo_imoview` e usar esse valor em `buildCanonicalUrl` no lugar de `property.id`.
- `src/lib/formatters.ts`: `generatePropertyWhatsAppMessage` passa a receber/usar o código de exibição.
- `src/pages/ImovelDetail.tsx`: `shareCode` passa a usar `property.codigoExibicao ?? property.codigo`.
- `src/crm/pages/ImovelDetail.tsx`: o link do card "Link do site" usa `codigo_interno ?? codigo_imoview ?? id`.
- Redeploy da função `og-metadata` e teste com user-agent de crawler para conferir as meta tags e a foto.
