# Cadastro manual de condomínio no CRM

## Situação atual
- A página `/crm/condominios` só **lista** condomínios vindos do Imoview (botão "Sincronizar do Imoview"). Não existe opção de cadastrar um condomínio novo manualmente.
- A tabela `condominios_cache` permite leitura pública, mas **somente o service role pode escrever** — usuários logados do CRM não conseguem inserir hoje.

## O que será feito

### 1. Botão "Novo condomínio" na página Condomínios
- Botão no topo da página `/crm/condominios`, ao lado de "Sincronizar do Imoview".
- Abre um diálogo com campos: **Nome** (obrigatório) e **Cidade**.
- Ao salvar, insere em `condominios_cache` com um código negativo gerado automaticamente (ex.: -1, -2, …) para não colidir com códigos do Imoview.
- Toast de sucesso/erro e atualização imediata da lista.

### 2. Permissão no banco (RLS)
- Nova política permitindo que usuários autenticados do CRM (`is_crm_user(auth.uid())`) insiram e editem condomínios.
- Leitura pública continua como está.

### 3. Uso no cadastro de imóvel
- O `CondominioAutocomplete` usado no formulário de imóvel já lê de `condominios_cache`, então condomínios criados manualmente passam a aparecer lá automaticamente — sem mudança extra.

## Detalhes técnicos
- Arquivo alterado: `src/crm/pages/Condominios.tsx` (botão + diálogo com `react-query` mutation).
- Migration: política de INSERT/UPDATE em `condominios_cache` para `is_crm_user(auth.uid())`.
- Código negativo evita conflito com a sincronização do Imoview, que usa códigos positivos.
