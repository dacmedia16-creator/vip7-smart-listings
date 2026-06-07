## Diagnóstico

Na tela **CRM > Imóveis**, o dropdown envia `finalidade = locacao`, mas os imóveis estão gravados no banco como `finalidade = aluguel`.

Por isso a consulta fica equivalente a buscar `finalidade = 'locacao'`, e retorna zero, mesmo existindo **110 imóveis de aluguel** cadastrados.

## Plano de correção

1. Ajustar o filtro de finalidade do CRM para usar o valor real do banco:
   - Trocar a opção **Locação** de `locacao` para `aluguel`.

2. Manter o rótulo visual como **Locação**, sem alterar a experiência do usuário.

3. Adicionar compatibilidade defensiva na consulta:
   - Se algum estado antigo ainda enviar `locacao`, converter para `aluguel` antes de consultar.

4. Validar no preview:
   - Abrir `/crm/imoveis`
   - Selecionar apenas **Locação**
   - Aplicar filtros
   - Confirmar que os imóveis de aluguel aparecem.