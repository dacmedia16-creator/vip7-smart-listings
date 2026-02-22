

## Plano: Estimativa de Valor com IA na Pagina de Avaliacao

### O que muda para o usuario

Ao preencher o formulario de avaliacao, alem do botao "Solicitar Avaliacao Gratuita" (que continua enviando por email), aparece um segundo botao **"Estimar Valor com IA"**. Ao clicar:

1. O sistema busca imoveis semelhantes no catalogo do site
2. Uma IA analisa os comparaveis e calcula uma estimativa
3. Um card aparece com a faixa de valor estimado, valor do m2, e uma explicacao

O envio por email continua funcionando normalmente em ambos os casos -- ao clicar "Solicitar Avaliacao", os dados vao por email. Ao clicar "Estimar com IA", a estimativa aparece na tela E os dados tambem sao enviados por email.

### Alteracoes

| Arquivo | O que muda |
|---------|-----------|
| `supabase/functions/avaliacao-ia/index.ts` | **Novo** - Busca imoveis comparaveis via API Imoview e envia para IA analisar |
| `src/pages/Avaliacao.tsx` | Adiciona botao "Estimar Valor com IA", estados para resultado, e card de exibicao |

### Detalhes Tecnicos

**1. Nova Edge Function: `avaliacao-ia/index.ts`**

- Recebe dados do formulario (tipo, cidade, bairro, area, quartos, finalidade)
- Chama a API Imoview internamente para buscar imoveis comparaveis (mesma cidade, tipo, finalidade)
- Filtra por bairro e caracteristicas semelhantes
- Envia prompt para Lovable AI (`google/gemini-2.5-flash`) com:
  - Dados do imovel do usuario
  - Lista de imoveis comparaveis (valor, area, quartos, bairro, valorM2)
- Usa tool calling para extrair JSON estruturado:
  - `valorEstimadoMin`, `valorEstimadoMax`
  - `valorM2Medio`
  - `imoveisComparados` (quantidade)
  - `analise` (texto explicativo)
  - `confianca` ("alta", "media", "baixa")
- Trata erros 429 (rate limit) e 402 (creditos)

**2. Frontend: `src/pages/Avaliacao.tsx`**

- Novo estado `estimativa` e `isEstimating`
- Funcao `handleEstimarIA` que:
  - Valida campos essenciais (tipo, finalidade, cidade, bairro, pelo menos uma area)
  - Chama a edge function
  - Tambem envia os dados por email (fluxo existente)
  - Exibe resultado em card abaixo do formulario
- Botao "Estimar Valor com IA" ao lado do botao existente
- Card de resultado com:
  - Faixa de valor (R$ min - R$ max)
  - Valor medio do m2
  - Nivel de confianca (badge colorido)
  - Texto de analise
  - Aviso de que e uma estimativa

**3. Fluxo**

```text
Usuario preenche formulario
         |
    +-----------+-----------+
    |                       |
[Solicitar Avaliacao]  [Estimar com IA]
    |                       |
  Envia email          Envia email +
  (fluxo atual)        Busca comparaveis +
                       IA analisa +
                       Mostra resultado
```

