# Tirar o selo "1 erro" que ainda aparece na tela de Portais

## O que está acontecendo

No banco não há mais nenhum erro registrado: a consulta de erros de validação volta vazia. O selo "1 erro" é calculado na própria tela, e ela está conferindo o **título interno** do imóvel em vez do **título do anúncio**.

Exemplo real (imóvel 3899):
- título interno: 107 caracteres (acima do limite de 100)
- título do anúncio: 88 caracteres (dentro do limite)

O envio para os portais já usa o título do anúncio quando ele existe — por isso o feed sai sem erro, mas a tela continua acusando problema.

## Correção

1. A validação passa a usar o título do anúncio quando ele estiver preenchido, e só cai no título interno quando o anúncio estiver vazio — exatamente a mesma regra do envio.
2. Aplicar isso na lista de Portais e também no bloco de portais dentro do imóvel, para os dois mostrarem o mesmo resultado.
3. Garantir que a lista carregue o título do anúncio junto com os demais dados do imóvel.

Resultado: os imóveis que hoje mostram "1 erro" passam a mostrar "OK", e continuam sinalizados apenas os que realmente têm dado faltando.

## Detalhes técnicos

- `src/crm/lib/portais.ts`: `ImovelParaValidacao` ganha `titulo_anuncio`; `validarImovelParaPortais` valida `titulo_anuncio?.trim() || titulo`.
- `src/crm/pages/Portais.tsx`: incluir `titulo_anuncio` no tipo local e no `select`.
- `src/crm/components/PortaisCard.tsx`: passar `titulo_anuncio` no objeto validado.
- Sem mudanças no banco nem na edge function `portal-feed`.
