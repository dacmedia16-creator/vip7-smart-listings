## Problema

A IA do WhatsApp ignora o contexto novo da mensagem do cliente e repete os filtros da primeira busca (casa em Alphaville), mesmo quando o cliente pede explicitamente "apartamento no Campolim" e depois corrige com "eu disse apartamento".

Causa raiz (confirmada nos logs):
- A saudação inicial usa o `imovel_interesse_codigo` do lead (casa em Alphaville) e fica gravada no histórico `ia_conversas`.
- A persona atual tem apenas 1 linha genérica, sem regra obrigando a IA a reextrair filtros a cada nova mensagem.
- O modelo (`gemini-3-flash-preview`, temperature 0.4) reusa os argumentos da tool call anterior em vez de reconsiderar.

## O que vou fazer

### 1. Reescrever a persona (system prompt) em `app_config.ia_whatsapp_persona`

Nova persona com regras explícitas:
- Tom acolhedor, pt-BR, 2-3 linhas
- **Sempre extraia tipo / finalidade / bairro / quartos / preço da ÚLTIMA mensagem do cliente**
- **Se o cliente trocar de tipo (casa↔apartamento) ou bairro, descarte os filtros anteriores e refaça a busca**
- Se o cliente corrigir ("eu disse X"), peça desculpa curta e refaça
- Nunca invente imóvel — sempre use `buscar_imoveis`
- Inclua preço, bairro, código e link `https://vipsevenimoveis.com.br/imovel/{codigo}` para cada opção
- Quando faltar info essencial (cidade/finalidade), pergunte 1 coisa por vez
- Quando o cliente pedir visita ou falar com humano → chame `pedir_handoff`

### 2. Reforçar a instrução por mensagem

Em `ia-whatsapp-inbound/index.ts` (linha ~274), adicionar uma segunda mensagem `system` logo antes da última mensagem do usuário no array enviado ao modelo:

```
Mensagem ATUAL do cliente: "<userMessage>"
Reextraia os filtros desta mensagem. Se conflitar com buscas anteriores, ignore o contexto antigo.
```

Isso "ancora" o modelo na mensagem nova mesmo com histórico longo.

### 3. Baixar temperature para 0.2

Em `ia-whatsapp-inbound/index.ts` linha 291: `temperature: 0.4` → `0.2`. Menos criatividade = menos reuso de args antigos.

### 4. Manter o modelo atual

Não vou trocar de modelo agora — primeiro testamos persona + reforço de contexto + temperature. Se ainda falhar, aí migramos para `google/gemini-2.5-pro` (mais raciocínio, mais caro).

## Como validar

1. Limpar o histórico do lead de teste (`ia_conversas` do Denis) para começar do zero.
2. Você manda: "oi" → IA cumprimenta
3. Você manda: "quero apartamento 3 suítes no Campolim" → tool deve receber `tipo=apartamento, bairro=Campolim`
4. Você manda: "na verdade quero casa" → tool deve receber `tipo=casa, bairro=Campolim`
5. Confirmar nos logs do edge function que os `args` da tool batem com a última mensagem.

## Arquivos tocados

- `app_config` (UPDATE da row `ia_whatsapp_persona`) — via migration
- `supabase/functions/ia-whatsapp-inbound/index.ts` — adicionar system de reforço + baixar temperature
