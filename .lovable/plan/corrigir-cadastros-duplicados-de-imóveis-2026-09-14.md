# Corrigir cadastros duplicados de imóveis

## O que está acontecendo (confirmado no banco)

Ao cadastrar um imóvel novo, o sistema cria 2 ou 3 registros em vez de 1. Os duplicados nascem com diferença de milésimos de segundo:

- VIP0003 e VIP0004 — mesmo apartamento, R$ 550.000, Jardim Vera Cruz (10/09, 23:38:46 e 23:38:48)
- VIP0005, VIP0006 e VIP0007 — mesmo apartamento, R$ 600.000, Jardim Vera Cruz (10/09, 23:45:07 e 23:45:10)
- VIP0008 e VIP0009 — mesmo apartamento, R$ 725.000, Parque Campolim (14/09, 14:46:15 e 14:46:18). O VIP0008 ficou sem nenhuma foto.

Causa: o salvamento automático da tela de cadastro dispara mais de uma vez ao mesmo tempo enquanto o primeiro registro ainda está sendo criado. Como o registro ainda não tem identificador, cada disparo cria um imóvel novo. O clique em "Finalizar e salvar" pode somar mais um.

## O que será feito

1. Travar a criação: enquanto um salvamento estiver em andamento, nenhum outro pode começar. O segundo disparo espera o primeiro terminar e passa a atualizar o mesmo imóvel, em vez de criar outro.
2. Ao clicar em "Finalizar e salvar", cancelar qualquer salvamento automático pendente e aguardar o que estiver em andamento, para nunca criar um registro paralelo.
3. Limpar os duplicados já existentes, mantendo um de cada: apagar VIP0003, VIP0006, VIP0007 e VIP0008 (os que estão inativos/sem fotos), mantendo VIP0004, VIP0005 e VIP0009. Nenhum desses está publicado em portal.

## Detalhes técnicos

- `src/crm/pages/ImovelForm.tsx`: adicionar `savingRef` (ou uma promessa em andamento) em `runAutoSave`; sair cedo se já houver gravação ativa e reagendar; após o insert, reusar `currentId`. Em `onSubmit`, aguardar a promessa pendente do auto-save antes de decidir entre insert e update.
- Limpeza: remoção dos registros duplicados em `imoveis_proprios` (e vínculos associados) por id, com confirmação antes de executar.
