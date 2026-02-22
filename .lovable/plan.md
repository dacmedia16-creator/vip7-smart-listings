

## Adicionar campo CEP ao formulario de avaliacao

### O que muda

Adicionar um campo opcional de CEP na secao "Localizacao" do formulario de avaliacao. O CEP sera enviado junto com os outros dados no email e tambem passado para a edge function de estimativa com IA.

### Alteracoes

**1. `src/pages/Avaliacao.tsx`**
- Adicionar `cep` ao schema zod (opcional, string de 8-9 caracteres)
- Adicionar campo CEP no grid de localizacao, ao lado de bairro e cidade (ficando 3 campos: CEP, Bairro, Cidade, com Endereco ocupando a linha inteira acima)
- Enviar `cep` no body da chamada a `avaliacao-ia` e no email

**2. `supabase/functions/avaliacao-ia/index.ts`**
- Adicionar `cep` ao interface `RequestBody`
- Incluir o CEP no prompt enviado para a IA (para contextualizar melhor a localizacao)

**3. `supabase/functions/send-avaliacao-email/index.ts`**
- Incluir o CEP no corpo do email enviado

### Detalhes Tecnicos

- Campo CEP com placeholder "00000-000", tipo texto (para aceitar hifen)
- Validacao zod: `z.string().max(9).optional()`
- No prompt da IA, adicionar linha "CEP: xxxxx-xxx" quando informado
- Layout: endereco ocupa linha inteira, CEP + bairro + cidade na linha abaixo (grid de 3 colunas)
