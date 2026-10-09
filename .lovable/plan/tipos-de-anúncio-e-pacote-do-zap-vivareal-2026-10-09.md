# Tipos de anúncio e pacote do Zap + VivaReal

## O que será feito

1. **Opções iguais às do seu pacote**
   - Sem Destaque, Destaque, Super Destaque, Destaque Triplo e Destaque Exclusivo.
   - Disponíveis na lista de Portais e dentro do cadastro do imóvel, para Zap + VivaReal.
   - Manter as opções dos outros portais sem alterações.
   - Confirmar o código oficial de envio do Destaque Exclusivo antes de disponibilizá-lo; não presumir que corresponde a uma das opções Premiere atuais.

2. **Quadro de consumo do pacote**
   - Mostrar total e contagem por tipo, com barras e limites iniciais da imagem:

   | Categoria | Limite |
   |---|---:|
   | Anúncios | 500 |
   | Super Destaque | 40 |
   | Destaque Triplo | 360 |
   | Sem Destaque | 56 |
   | Destaque Exclusivo | 4 |
   | Destaque | 40 |

   - Permitir que administradores e gestores editem e salvem esses limites quando o contrato mudar.
   - Calcular o uso a partir dos imóveis marcados no CRM, atualizando ao publicar, despublicar ou mudar o tipo.
   - Identificar a contagem como **selecionados no CRM**, não como confirmação de publicação pelo Zap. Os números 287/243/4 da imagem não serão copiados como consumo atual.
   - Sinalizar limite atingido ou ultrapassado, sem alterar anúncios automaticamente nem bloquear as publicações existentes.

3. **Aplicação em lote**
   - Permitir escolher o tipo do Zap + VivaReal para os imóveis selecionados e aplicar em lote.
   - Manter as validações de dados obrigatórios e informar os imóveis que não puderam ser publicados.

## Preservação dos anúncios

A consulta atual encontrou **346 imóveis marcados para publicar** no Zap + VivaReal: 269 Destaque, 40 Super Destaque e 37 Simples. Esses números diferem do consumo da imagem; os anúncios existentes não serão convertidos, removidos ou redistribuídos automaticamente.

## Detalhes técnicos

- Centralizar opções e rótulos específicos por portal em `src/crm/lib/portais.ts`, reutilizados por `Portais.tsx` e `PortaisCard.tsx`.
- Preservar os identificadores já salvos quando houver equivalência confirmada: `simples`, `destaque`, `super_destaque` e `triple`.
- Verificar o vocabulário oficial VRSync e ajustar o tradutor da função existente `portal-feed` apenas quando necessário. Se o Exclusivo exigir um novo valor, adicionar o suporte correspondente por migration, sem reinterpretar os registros Premiere existentes.
- Salvar os limites em uma chave específica de `app_config`, que já possui acesso restrito a administradores/gestores e ao serviço. Não criar uma tabela nova para o pacote.
- Não integrar leitura automática do painel Zap neste escopo; o consumo confirmado continua sendo o exibido pelo portal.

## Verificação

- Testar alteração individual e em lote, persistência após recarregar e atualização das contagens.
- Conferir no XML os códigos oficiais de cada opção, sobretudo Triplo e Exclusivo.
- Testar avisos de limites sem modificar anúncios existentes.
- Verificar que os demais portais mantêm suas opções e publicações.