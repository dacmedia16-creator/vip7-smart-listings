# Foto de capa dos condomínios

Objetivo: cada condomínio ter uma foto de capa enviada manualmente, visível na lista.

## O que muda

1. **Enviar a capa direto na lista**
   - A miniatura ao lado do nome vira um botão. Ao passar o mouse aparece "Trocar capa" (ou "Adicionar capa" quando não houver foto).
   - Clicando, abre a seleção de arquivo do computador; a foto é enviada e vira imediatamente a capa daquele condomínio.
   - Enquanto envia, a miniatura mostra um indicador de carregamento; ao terminar, aparece um aviso de sucesso.

2. **Miniatura maior e mais legível**
   - A capa passa de 56x40 px para 72x56 px, com cantos arredondados e borda suave, mantendo o ícone atual como espaço reservado quando não existe foto.

3. **No cadastro/edição (ajuste mínimo)**
   - Continua como está: a primeira foto é a capa e a estrela define outra foto como capa. Sem mudanças de comportamento.

Nada é preenchido automaticamente a partir das fotos dos imóveis — a capa é sempre escolhida por você.

## Detalhes técnicos

- Arquivo: `src/crm/pages/Condominios.tsx`.
- Upload reaproveita o fluxo já existente: bucket público `imoveis-fotos`, prefixo `condominios/<codigo>/<uuid>.<ext>`.
- A URL enviada é inserida na **primeira posição** do array `fotos` de `condominios_cache` (capa = índice 0), preservando as demais fotos.
- Após o upload, invalidar a query da lista para refletir a nova capa sem recarregar a página.
- Validação: aceitar apenas `image/*`, um arquivo por vez nessa ação rápida; erros mostram toast destrutivo.
- Sem migração de banco: a coluna `fotos text[]` já existe.
