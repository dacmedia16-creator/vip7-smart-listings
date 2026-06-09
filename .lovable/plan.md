## Diagnóstico

O erro não está mais na regra de criação do lead. A política pública atual permite criar leads com:

- origem `site_contato`, `site_avaliacao`, `site_whatsapp` ou `portal`;
- `status_funil` vazio ou `novo`;
- `corretor_id` vazio;
- `created_by` vazio.

O problema mais provável está no final do insert no frontend:

```ts
.insert({...})
.select('id')
.single()
```

No backend, depois de inserir, esse `.select('id')` pede para ler o lead recém-criado. Mas a tabela `leads` não tem leitura pública, por segurança. Então o cadastro público até atende à regra de criação, mas a resposta com `id` é barrada pela política de leitura e aparece como erro de RLS.

## Correção proposta

1. Alterar `src/lib/leadCapture.ts` para criar o lead sem pedir retorno da linha:

```ts
await supabase.from('leads').insert(payload)
```

2. Remover o `.select('id').single()` do fluxo público.
3. Ajustar o retorno de `capturarLead` para não depender do `id` quando o lead vem do formulário público.
4. Manter as políticas atuais do banco, sem liberar leitura pública dos leads.
5. Validar o formulário de contato novamente no `/contato` e confirmar que:
   - o toast mostra sucesso;
   - o lead é criado no CRM;
   - visitantes continuam sem permissão para listar/ler leads.

## Por que essa é a correção certa

Abrir leitura pública em `leads` resolveria o erro, mas exporia dados sensíveis de clientes. A solução segura é deixar o visitante apenas criar o lead e não solicitar a leitura do registro criado.

## Arquivo a alterar

- `src/lib/leadCapture.ts`

## Observação

Do I know what the issue is? Sim: o insert público está solicitando leitura (`RETURNING id`) em uma tabela que corretamente não permite leitura pública.

<presentation-actions>
  <presentation-open-history>View History</presentation-open-history>
</presentation-actions>

<presentation-actions>
<presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>