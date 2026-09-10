# Endereço dos condomínios

## Por que só um aparece

Dos 203 condomínios da lista, apenas 1 tem endereço preenchido: o "Alameda Teste", que foi cadastrado manualmente com CEP. Todos os outros vieram da sincronização do Imoview, que só devolve código, nome e cidade — nenhum campo de endereço. Por isso a linha de endereço aparece só nesse.

## Proposta

1. **Preencher o endereço automaticamente a partir dos imóveis vinculados.** Os imóveis já têm rua, número, bairro, cidade, estado e CEP, e sabem a qual condomínio pertencem. Para cada condomínio sem endereço, usar o endereço mais frequente entre seus imóveis. Isso cobre 230 condomínios com imóveis vinculados.
2. **Manter o preenchimento em dia:** ao sincronizar com o Imoview, reaplicar esse preenchimento apenas onde o endereço estiver vazio, sem sobrescrever o que foi digitado à mão.
3. **Editar manualmente** continua possível na tela, com busca por CEP, como já funciona hoje.

## Correção importante encontrada

O botão "Sincronizar do Imoview" hoje **apaga todos os condomínios** antes de gravar os novos. Isso remove os condomínios cadastrados à mão (e as fotos e endereços deles). Vou trocar por atualização por código: atualiza nome/cidade dos que vieram do Imoview e não toca nos cadastrados manualmente nem nas fotos/endereços já salvos.

## Detalhes técnicos

- Script de backfill (run_sql): para cada `condominios_cache.codigo` sem `endereco`, pegar o par (`endereco`, `numero`, `bairro`, `cep`, `estado`) mais comum em `imoveis_proprios` com aquele `codigo_condominio_imoview`; gravar cidade só se estiver vazia.
- `supabase/functions/sync-condominios/index.ts`: remover o `delete().neq('codigo', 0)` e usar `upsert` por `codigo` gravando apenas `nome`, `cidade`, `cidade_codigo`; ao final, rodar o mesmo preenchimento de endereço para linhas vazias.
- Nenhuma mudança de schema é necessária.
