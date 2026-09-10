# Título automático não pega os quartos

## Por que acontece

O formulário salva sozinho a cada 2 segundos enquanto você digita. Na primeira vez que ele salva, você normalmente já preencheu tipo, bairro e cidade, mas ainda **não** preencheu os quartos. O título é montado nesse momento (sem quartos) e gravado no campo.

Depois disso, a regra atual é: "só gera o título se o campo estiver vazio". Como já está preenchido, ele nunca mais é atualizado — mesmo depois que você informa 3 quartos, suítes, vagas ou área.

Verificado em `src/crm/pages/ImovelForm.tsx`: a montagem do título (linhas 171-222) inclui os quartos corretamente; o problema é o momento e a condição da gravação (linhas 384-388 no salvamento automático e 443-448 ao finalizar).

## Correção

Passar a distinguir "título escrito por uma pessoa (ou pela IA)" de "título gerado automaticamente":

1. Guardar em memória o último título que o sistema gerou sozinho.
2. Ao salvar (automático ou ao clicar em Finalizar), regenerar o título quando o campo estiver vazio **ou** quando o conteúdo atual for exatamente o último título gerado automaticamente.
3. Se o texto foi alterado à mão ou veio do botão "Gerar com IA", nunca sobrescrever.
4. Ao abrir um imóvel já existente, considerar como automático o título que coincidir com o que a regra geraria naquele momento, para que ele volte a se atualizar quando faltar informação (por exemplo, sem os quartos).

Assim, conforme você completa quartos, suítes, vagas e área, o título vai se ajustando sozinho até o salvamento final:

```text
Apartamento à venda, 3 quartos, Parque Morumbi, Votorantim/SP
```

## Arquivo alterado

- `src/crm/pages/ImovelForm.tsx` — nova referência com o último título automático, ajuste nas duas checagens de geração (salvamento automático e Finalizar) e marcação na carga do registro.

## O que não muda

- Formato do título continua o mesmo.
- Botão "Gerar com IA" continua tendo prioridade.
- Site público continua usando o campo de título principal.
