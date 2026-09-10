# Gerar título do anúncio automaticamente ao salvar

## Objetivo

Ao salvar um imóvel no CRM (botão Finalizar ou auto-save), preencher automaticamente o campo `titulo_anuncio` quando ele estiver vazio, usando os dados já cadastrados (tipo, bairro/condomínio, quartos, suítes, vagas, área e característica de destaque). Sem precisar clicar em nada.

## Contexto atual

- `titulo_anuncio` existe no banco e no formulário (aba "Textos"), mas hoje só é preenchido manualmente ou via botão "✨ Gerar com IA".
- O campo **não** é usado no site público hoje (o site usa `titulo`). Esta mudança não afeta o site.
- O `titulo` principal já é gerado na importação Imoview como `tipo + " em " + bairro/cidade`, mas `titulo_anuncio` fica vazio.

## Implementação

### 1. Função `gerarTituloAnuncio(values)` em `ImovelForm.tsx`

Gera uma string no formato comercial, por exemplo:

```
"Apartamento no Parque Campolim com 3 quartos e 2 vagas"
"Casa em Alphaville Itu com piscina e 4 suítes"
"Sala comercial no Centro com 45 m²"
```

Lógica:
- **Localização**: usar `condominio_nome` se existir; senão `bairro`; senão `cidade`. Preposição adequada ("no" vs "em") conforme gênero do tipo (Casa → "na", Apartamento → "no", default "em").
- **Diferenciais** (nesta ordem, incluir os que existirem):
  - "com piscina" se `caracteristicas` contiver "piscina" (case-insensitive)
  - quartos: "X quartos" (ou "1 quarto")
  - suítes: "X suítes" (se > 0)
  - vagas: "X vagas" (se > 0)
  - área: "XX m²" (se > 0)
- Juntar diferenciais com " e " entre os dois últimos e ", " entre os demais.
- Limitar a 100 caracteres (truncate no último espaço antes do limite).
- Se não houver tipo nem localização, retornar string vazia (não preenche).

### 2. Chamar no `onSubmit`

Antes de montar o payload, se `values.titulo_anuncio` estiver vazio/nulo, atribuir `gerarTituloAnuncio(values)`. Isso garante que o título seja gerado no salvamento final.

### 3. Chamar no `runAutoSave`

Mesma lógica: se `titulo_anuncio` vazio, gerar antes de enviar o payload. Assim o auto-save também preenche.

### 4. Preservar edição manual

Se o usuário (ou o botão de IA) já preencheu `titulo_anuncio`, **não sobrescrever**. O campo só é gerado quando está vazio. Para regenerar, o usuário limpa o campo e salva.

## O que não muda

- Site público continua usando `titulo` (não `titulo_anuncio`).
- Botão "✨ Gerar com IA" continua funcionando e pode sobrescrever com versão via IA.
- Importação Imoview não é afetada (poderia ser um passo futuro, mas não está no escopo agora).

## Arquivos a alterar

- `src/crm/pages/ImovelForm.tsx` — adicionar função `gerarTituloAnuncio` + chamada em `onSubmit` e `runAutoSave`.
