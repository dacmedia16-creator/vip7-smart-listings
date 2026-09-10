# Excluir condomínios e endereço automático por CEP

## 1. Excluir condomínio

- Botão de excluir (ícone de lixeira) em cada linha da lista `/crm/condominios`, visível apenas para admin/gestor.
- Diálogo de confirmação com o nome do condomínio.
- Se houver imóveis vinculados, a exclusão é bloqueada com um aviso: "Este condomínio tem X imóveis vinculados. Desvincule antes de excluir."
- Observação: condomínios vindos do Imoview podem reaparecer na próxima sincronização.

## 2. Endereço completo com busca por CEP

- O diálogo "Novo condomínio" ganha os campos: CEP, Endereço (rua), Número, Bairro, Cidade, Estado.
- Ao digitar um CEP com 8 dígitos, o endereço, bairro, cidade e estado são preenchidos automaticamente; ainda dá para corrigir manualmente.
- Cidade continua obrigatória apenas no sentido de ser usada nos filtros da lista; nome segue sendo o único campo obrigatório.
- Também é possível editar um condomínio existente para completar o endereço, pelo mesmo diálogo.

## Detalhes técnicos

- Migration em `condominios_cache`: novas colunas `cep`, `endereco`, `numero`, `bairro`, `estado` (todas texto, opcionais); política de DELETE restrita a `is_admin_or_gestor(auth.uid())` e GRANT de DELETE para `authenticated`.
- `src/crm/pages/Condominios.tsx`: mutation de exclusão com verificação prévia da contagem em `imoveis_proprios.codigo_condominio_imoview`, `AlertDialog` de confirmação, e diálogo de cadastro/edição estendido.
- Busca de CEP reutiliza a edge function existente `cep-lookup` (multi-provedor, já em uso na avaliação), sem criar nada novo.
- A lista passa a exibir o endereço resumido abaixo do nome quando existir.
