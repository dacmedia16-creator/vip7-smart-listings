# Ajustar formato do título do anúncio automático

## Objetivo

Mudar o formato gerado por `gerarTituloAnuncio` em `ImovelForm.tsx` para seguir o padrão portal-friendly:

```
Apartamento à venda, 3 quartos, Parque Morumbi, Votorantim/SP
Casa para alugar, 2 suítes, Alphaville Itu, Itu/SP
Terreno à venda, 350 m², Centro, Sorocaba/SP
```

## Formato alvo

Partes separadas por vírgula, nesta ordem:

1. **Tipo + finalidade** — `{tipo} à venda` (venda ou venda_aluguel) / `{tipo} para alugar` (aluguel). Se `finalidade` estiver vazio, usar só `{tipo}`.
2. **Diferenciais** (só os que existirem, separados por `, `):
   - `{quartos} quarto(s)`
   - `{suites} suíte(s)`
   - `{vagas} vaga(s)`
   - `{area} m²`
   - "piscina" se `caracteristicas` contiver piscina
3. **Local** — `condominio_nome` se existir; senão `bairro`; senão vazio.
4. **Cidade/UF** — `{cidade}/{estado}` se ambos existirem; senão só `{cidade}`.

Juntar com `, `. Se não houver tipo nem local, retornar string vazia.

Limite: 100 caracteres (truncate no último espaço antes do limite).

## Arquivo a alterar

- `src/crm/pages/ImovelForm.tsx` — substituir o corpo de `gerarTituloAnuncio` (linhas ~171-217) pelo novo formato. As chamadas em `runAutoSave` e `onSubmit` já existem e não mudam.

## O que não muda

- `titulo_anuncio` só é gerado quando vazio; valores manuais/IA são preservados.
- Site público continua usando `titulo`.
