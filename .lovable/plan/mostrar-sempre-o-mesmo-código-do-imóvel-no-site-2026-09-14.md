# Mostrar sempre o mesmo código do imóvel no site

## O que está acontecendo

Imóveis cadastrados à mão (sem código do Imoview) não têm número de código. Para preencher essa lacuna, o site inventa um número calculado a partir do identificador interno — foi daí que saiu o "Cód. 260265573" da tela.

Por isso o endereço da página é `/imovel/VIP0010`, mas dentro dela aparece um número totalmente diferente. Nos imóveis importados do Imoview isso não acontece, porque eles já têm um código próprio.

## O que será feito

1. Criar uma regra única de exibição: se o imóvel tem código interno (VIP0010), é esse que aparece; se não tem, aparece o código do Imoview (ex.: 1835).
2. Aplicar essa regra em todos os lugares onde o código aparece para o cliente:
   - página do imóvel ("Cód. ...")
   - caminho de navegação no topo (breadcrumb)
   - cartões de imóvel nas listas
   - mensagem pronta de WhatsApp
3. Os links dos cartões passam a usar esse mesmo código, então o endereço da página e o código mostrado ficam sempre iguais.
4. Links antigos com o número inventado continuam funcionando: nada muda para os imóveis do Imoview, e o VIP continua sendo aceito no endereço.

## Detalhes técnicos

- `src/services/imoveisDb.ts`: expor um `codigoExibicao = codigo_interno ?? codigo_imoview` no `mapRow` (o campo `codigoReferencia` já traz o `codigo_interno`); manter `codigo` numérico para comparação/favoritos/mapa.
- `src/pages/ImovelDetail.tsx` (linhas 192 e 236), `src/components/PropertyCard.tsx` (linhas 67 e 172), `PropertyBreadcrumb` e `generatePropertyWhatsAppMessage`: usar `codigoReferencia ?? codigo`.
- `detalhesImovel` já resolve código numérico, UUID e `codigo_interno` via `ilike`, então nenhuma mudança de rota ou banco é necessária.
