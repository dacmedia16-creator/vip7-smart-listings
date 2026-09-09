# Importar os imóveis que faltam do backup Imoview

## O que foi verificado

O backup (`Backup_vipseven.xlsx`) tem 2.999 imóveis; o sistema tem 1.232 com código Imoview, e todos eles existem no backup. Faltam **1.767 imóveis**, sendo:

- 361 disponíveis (Vago/Disponível)
- 1.389 desativados
- 14 vendidos, 1 alugado, 2 em moderação

O backup também traz 5.455 pessoas, os vínculos de proprietário (3.022 linhas) e 90.179 fotos com os links originais.

## O que será feito

Importar apenas os **361 imóveis disponíveis** que faltam, com fotos e proprietários.

### 1. Imóveis (361 novos)

Cada imóvel entra como registro próprio com `codigo_imoview` igual ao código do backup, ativo e com status disponível. Nenhum imóvel existente é alterado — só entram códigos que ainda não existem.

Campos aproveitados: tipo, finalidade, valor, endereço completo (rua, número, complemento, bloco, bairro, cidade, UF, CEP), condomínio e nome do condomínio, IPTU, quartos, suítes, salas, banheiros, varandas, vagas e tipo de vaga, andar, áreas (interna, externa, lote, privativa), ano de construção, latitude/longitude, descrição, título, ponto de referência, matrícula/cartório, aceita permuta/financiamento, exclusivo, mobiliado, padrão, taxas e comissões, anotações internas e as características (portaria 24h, closet, armários, ar-condicionado, área de serviço, varanda gourmet, aquecimento solar, jardim, gás canalizado, etc.).

Códigos internos VIP continuam sendo gerados só para imóveis cadastrados manualmente; estes ficam identificados pelo código Imoview.

### 2. Fotos

O backup traz os links diretos das fotos hospedadas no S3 da Imoview, na ordem correta. As fotos desses 361 imóveis serão gravadas usando esses links (todas, sem limite por imóvel), respeitando a ordem definida no backup — a primeira vira a capa. Não é preciso baixar e reenviar arquivo por arquivo.

Observação: se um dia a Imoview desligar esse endereço das imagens, as fotos deixariam de carregar. Se preferir, depois posso fazer uma cópia dessas fotos para o armazenamento próprio do site — isso é bem mais demorado e pode ficar para uma segunda etapa.

### 3. Proprietários

Somente as pessoas ligadas a esses 361 imóveis serão cadastradas em Clientes (nome, CPF/CNPJ, telefones, e-mails, endereço, data de nascimento, profissão, anotações), sem duplicar quem já existe (comparação pelo código Imoview da pessoa). Cada uma é vinculada ao imóvel como **proprietário**, com o percentual informado no backup.

### 4. Conferência

Ao final: quantos imóveis entraram, quantas fotos, quantos proprietários criados e quantos reaproveitados, além da lista de qualquer código que não pôde entrar.

## Detalhes técnicos

- Fonte: `/tmp/bk/Backup_vipseven.xlsx`, abas `Imoveis`, ` Imoveis x Fotos`, `Imoveis x Proprietários `, `Pessoas`, `Pessoas x Email x Telefone`.
- Chave de correspondência: `CodigoImovel` → `imoveis_proprios.codigo_imoview`; `CodigoPessoa` → `clientes.codigo_imoview`.
- Inserção em lotes via SQL a partir de uma tabela temporária de staging, removida ao final (mesmo procedimento usado na importação anterior).
- Fotos gravadas no array `fotos` como URLs http completas — o helper `toPublicPhotoUrl` já preserva URLs absolutas.
- Vínculos gravados em `cliente_imoveis` com `papel = 'proprietario'`.
- JSON bruto de cada imóvel guardado em `imoview_raw` e `origem = 'imoview'`.
