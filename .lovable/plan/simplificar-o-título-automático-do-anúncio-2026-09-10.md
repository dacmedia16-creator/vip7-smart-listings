# Simplificar o título automático do anúncio

## Objetivo

Deixar o título gerado automaticamente exatamente neste formato:

```text
Apartamento à venda, 3 quartos, Jardim Vera Cruz, Sorocaba/SP
```

Ordem das partes: **Tipo do imóvel**, **Finalidade**, **Número de quartos**, **Bairro**, **Cidade/Estado**.

## Hoje

A função `gerarTituloAnuncio` em `src/crm/pages/ImovelForm.tsx` já gera tipo + finalidade e cidade/estado, mas:

- inclui suítes, vagas, área em m² e "piscina" no título;
- usa o nome do **condomínio** no lugar do bairro quando existe condomínio.

## Mudança

Reescrever a montagem do título para:

1. **Tipo + finalidade** — `Apartamento à venda` / `Casa para alugar` (como já é hoje).
2. **Quartos** — só inclui se for maior que zero: `3 quartos` / `1 quarto`.
3. **Bairro** — passa a usar sempre o **bairro** (não mais o nome do condomínio).
4. **Cidade/Estado** — `Sorocaba/SP`.

Suítes, vagas, área e piscina **saem** do título automático (continuam salvos normalmente no imóvel, só não aparecem no título).

## O que não muda

- O título continua sendo gerado só quando o campo está vazio ou ainda contém o último título automático — texto digitado à mão ou gerado pela IA nunca é sobrescrito.
- Continua limitado a 100 caracteres.
- Site público continua usando o título principal.

## Arquivo a alterar

- `src/crm/pages/ImovelForm.tsx` — corpo da função `gerarTituloAnuncio`.
