# Corrigir filtro com um único valor (condomínio, cidade, bairro)

## O que está acontecendo

Ao selecionar **um** condomínio, o endereço da página fica assim:

```text
/imoveis?finalidade=venda&condominios="12"
```

Repare nas aspas em volta do 12. Quando há **dois** condomínios o endereço fica `condominios=12,13`, sem aspas — e aí funciona.

Essas aspas extras são colocadas automaticamente pelo sistema de endereços do site sempre que um filtro tem um valor que parece um número. Na hora de ler o filtro de volta, o site tenta usar `"12"` (com aspas) como código do condomínio, não encontra nada e mostra "Nenhum imóvel encontrado".

Isso atinge qualquer filtro com um único valor numérico — condomínio, cidade e bairro — e não só o condomínio.

## Correção

Fazer o site gravar e ler os filtros no endereço como texto simples, sem aspas nem conversões automáticas. Assim `condominios=12` funciona igual a `condominios=12,13`.

Depois da correção:
- Um condomínio selecionado traz os imóveis daquele condomínio.
- Endereços já compartilhados com aspas (`condominios="12"`) continuam funcionando, porque a leitura também passa a ignorar aspas em volta do valor.
- Os demais filtros (finalidade, tipo, ordenação, busca) seguem iguais.

## Detalhes técnicos

- `src/router.tsx`: passar `parseSearch`/`stringifySearch` planos ao `createRouter`, baseados em `URLSearchParams` (sem JSON encoding). Nenhuma rota do projeto usa `validateSearch`, então não há dependência do formato JSON atual.
- `src/lib/router-compat.tsx` (`useSearchParams`): ao ler, remover aspas envolventes de valores legados (`"12"` → `12`), garantindo compatibilidade com links antigos.
- Nenhuma mudança em `src/pages/Imoveis.tsx`, banco de dados, feeds ou CRM.
- Verificação: abrir `/imoveis?finalidade=venda&condominios=12` e confirmar resultados; conferir também cidade e bairro únicos, e o botão Limpar Filtros.
