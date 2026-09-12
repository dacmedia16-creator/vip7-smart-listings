# Corrigir erro "Título excede 100 caracteres" nos portais

## Causa
O feed dos portais (`portal-feed`) rejeita anúncios com título acima de 100 caracteres. 16 imóveis estão marcados com esse erro em `imovel_portais.erro_validacao` — por isso aparece o selo "1 erro" na tela de Portais.

Os títulos afetados foram gerados pela versão antiga do título automático, que incluía suítes, vagas e condomínio (ex.: "Casa de Condomínio à venda, 4 quartos, 4 suítes, 6 vagas, Jardim Residencial Saint Patrick – Sorocaba/SP"). O formato atual é mais curto, mas os títulos antigos ficaram gravados.

## Correção
1. Localizar os 16 imóveis com `erro_validacao` no banco.
2. Regenerar o `titulo_anuncio` desses imóveis com o formato atual (Tipo à venda/aluguel, N quartos, Bairro, Cidade/UF) — apenas para títulos automáticos acima de 100 caracteres; títulos manuais são apenas truncados com reticências ou relatados.
3. Limpar o campo `erro_validacao` das linhas afetadas para o selo de erro sumir na tela de Portais.
4. Confirmar que o feed (`portal-feed`) passa a incluir esses imóveis sem erro.

## Verificação
- Consultar `imovel_portais` e conferir que não resta nenhum "Título excede 100 caracteres".
- Abrir a tela de Portais e conferir que o selo "1 erro" desapareceu.
