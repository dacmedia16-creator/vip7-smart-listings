## Busca automática de endereço por CEP

No `src/crm/pages/ImovelForm.tsx`, aba **Endereço**, adicionar lookup automático ao preencher o CEP.

### Comportamento
- Ao digitar/colar no campo CEP, aplicar máscara `00000-000`.
- Quando atingir 8 dígitos, chamar a edge function `cep-lookup` via `supabase.functions.invoke('cep-lookup', { body: { cep } })`.
- Durante a chamada, mostrar spinner pequeno ao lado/dentro do input.
- Em sucesso, preencher automaticamente: `endereco` (logradouro), `bairro`, `cidade` (localidade) e `estado` (uf) — apenas se o campo destino estiver vazio, para não sobrescrever edição manual. Foco vai para `numero`.
- Em erro / CEP não encontrado, toast discreto "CEP não encontrado" e mantém o que foi digitado.
- Não duplicar chamada para o mesmo CEP (cache do último consultado).

### Onde
- Trocar o `T('cep','CEP')` da aba Endereço por um `FormField` customizado com `onChange` que dispara o lookup.
- Sem mudanças no schema, no backend ou em outras abas. A edge function `cep-lookup` já existe e cobre 4 provedores.