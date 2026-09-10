# Aproveitar as fotos de condomínio que já vieram dos imóveis

## O que foi encontrado

Nas fotos importadas do Imoview, cada foto vem marcada se é do imóvel ou da área comum do condomínio. Hoje essa marcação não é usada em lugar nenhum.

- 55.032 fotos importadas no total
- 17.559 delas marcadas como "foto de condomínio"
- Depois de tirar as repetidas (o mesmo condomínio aparece em vários imóveis), sobram 1.511 fotos diferentes
- Elas cobrem 90 condomínios, média de 17 fotos cada; 8 condomínios têm mais de 30
- Hoje nenhum dos 203 condomínios cadastrados tem foto

## O que será feito

1. Para cada um dos 90 condomínios, juntar as fotos de área comum encontradas nos imóveis daquele condomínio, remover as repetidas e salvar na ficha do condomínio.
2. Limite de 30 fotos por condomínio, mantendo a ordem em que aparecem nos imóveis (a primeira vira a capa).
3. Só preencher condomínios que ainda estão sem foto — nada que já foi enviado manualmente é apagado ou trocado.
4. Passar a fazer isso automaticamente: sempre que novos imóveis forem sincronizados, as fotos de condomínio novas são acrescentadas às fichas que ainda estiverem vazias.

Depois disso, na tela de Condomínios esses 90 passam a aparecer com capa e galeria, e você continua podendo trocar a capa ou subir fotos suas normalmente.

## Detalhes técnicos

- Migration com função `preencher_fotos_condominios()`: expande `imoveis_proprios.imoview_raw->'fotos'`, filtra `(foto->>'condominio')::bool = true`, agrupa por `codigo_condominio_imoview`, deduplica pela URL sem query string, força `https`, limita a 30 e grava em `condominios_cache.fotos` apenas quando `coalesce(array_length(fotos,1),0) = 0`. Retorna a quantidade de condomínios preenchidos.
- Execução única da função na própria migration para preencher os 90 condomínios agora.
- `supabase/functions/sync-condominios/index.ts`: chamar a nova função via `rpc` logo após `preencher_endereco_condominios()`.
- Nenhuma alteração na tela de Condomínios — ela já lê `condominios_cache.fotos`.
