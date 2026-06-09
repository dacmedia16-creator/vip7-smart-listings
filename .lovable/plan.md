## Diagnóstico

O formulário de contato continua falhando porque a política pública de criação de leads exige que `status_funil = 'novo'`, mas o frontend não envia esse campo no cadastro. Embora a coluna tenha default, em regras de acesso o valor pode não estar sendo aceito no momento da validação do insert.

Também confirmei que as permissões básicas de gravação para visitantes e usuários autenticados existem; o problema está na condição da política.

## Plano de correção

1. Ajustar a regra de criação pública de leads para aceitar contatos do site quando `status_funil` vier vazio ou como `novo`.
2. Manter as restrições de segurança atuais:
   - origem limitada a formulários públicos do site;
   - sem corretor atribuído;
   - sem usuário criador manual;
   - sem liberar edição, exclusão ou leitura pública.
3. Ajustar o envio do formulário para mandar explicitamente `status_funil: 'novo'` nos leads públicos, evitando depender só do default do banco.
4. Validar novamente que o formulário de contato consegue criar o lead sem abrir acesso indevido aos dados do CRM.

## Detalhe técnico

A política atual permite apenas:

```text
origem em site_contato/site_avaliacao/site_whatsapp/portal
corretor_id nulo
created_by nulo
status_funil = novo
```

A correção será tornar essa condição compatível com inserts públicos que não enviam `status_funil`, e reforçar o payload do frontend para enviar `novo` explicitamente.