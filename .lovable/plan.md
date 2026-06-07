## O que a planilha tem

`imoveis-2026-06-07-014614.xls` é o export HTML do Imoview com **1.140 imóveis**, 158 colunas. As que importam:

- `Codigo` (col 0) — código Imoview do imóvel
- `Proprietarios` (col 121) — campo único no formato `Cód. 2652 | Eder Souza | (15) 98176-7268 | email@x.com`, com suporte a múltiplos (`1) ... 2) ...`)

A página `/crm/imoveis/importar-proprietarios` já tem o parser exato (`parseProprietariosCell`) e o fluxo de upsert cliente + vínculo `cliente_imoveis(papel='proprietario')`. Só que rodar 1.140 linhas pelo navegador é lento e instável.

## O que vou fazer

Rodar a importação **direto no banco**, em lote, usando a mesma lógica da página:

1. **Ler a planilha** no sandbox (parser HTML idêntico ao da página).
2. **Casar pelo código do imóvel** com `imoveis_proprios.codigo_imoview` (carrego todos uma vez num Map).
3. Para cada linha, **parsear a célula `Proprietarios`** com a mesma função (suporta 1, 2 ou 3 sócios, extrai nome, código Imoview do cliente, CPF/CNPJ, e-mail, telefone, telefone 2).
4. **Upsert do cliente** em `public.clientes`:
   - se `codigo_imoview` do cliente já existir → update preenchendo só campos vazios e adicionando `'proprietario'` em `categorias`;
   - senão se `cpf_cnpj` bater → mesmo update;
   - senão → insert com `origem='imoview_planilha'`, `categorias=['proprietario']`.
5. **Vínculo** em `public.cliente_imoveis` com `onConflict (cliente_id, imovel_id, papel='proprietario')` — não duplica.
6. **Relatório final** com:
   - imóveis processados / não encontrados no banco (lista de códigos)
   - clientes novos / atualizados
   - vínculos criados / já existentes
   - linhas com erro

## Detalhes técnicos

- Executo via script no sandbox que chama a API REST do Supabase com `SUPABASE_SERVICE_ROLE_KEY` (já disponível como secret) — bypassa RLS e roda do servidor, sem precisar abrir a página no navegador.
- Reaproveito a função `parseProprietariosCell` exportada de `src/crm/pages/ImportarProprietarios.tsx` para garantir o mesmo comportamento.
- Sem alteração de schema, sem novas tabelas, sem mudança na página existente.
- O CSV/HTML da planilha não é copiado para o repositório — leio direto de `/mnt/user-uploads/`.

## O que NÃO muda

- A página `/crm/imoveis/importar-proprietarios` continua funcionando igual para próximos uploads manuais.
- Nenhum imóvel é alterado — só insiro/atualizo em `clientes` e `cliente_imoveis`.
- Categorias e dados já existentes nos clientes não são sobrescritos, só completados.
