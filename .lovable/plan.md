## Autocomplete de Condomínio no cadastro de imóvel

No `src/crm/pages/ImovelForm.tsx`, aba **Detalhes → Identificação & Comercial**, transformar o campo "Condomínio (nome)" em um autocomplete que busca em `condominios_cache` e vincula o condomínio ao imóvel.

### Comportamento
- Conforme o usuário digita (a partir de 2 caracteres, com debounce ~300ms), consulta `condominios_cache` via `supabase.from('condominios_cache').select('codigo, nome, cidade').ilike('nome', '%termo%').limit(20)`.
- Sugestões aparecem em um popover abaixo do input (mesma UX do autocomplete já usado em outras telas — `AutocompleteInput` do CRM, se aplicável; senão um popover simples com `Command`).
- Ao selecionar uma sugestão:
  - Preenche `condominio_nome` com o nome exato.
  - Preenche `codigo_condominio_imoview` com `codigo` da `condominios_cache` (vínculo persistente entre imóvel e condomínio).
  - Se `cidade` do imóvel estiver vazio, sugere preencher com a cidade do condomínio.
- O usuário também pode digitar livremente um nome novo que não exista no cache (campo continua text livre) — nesse caso `codigo_condominio_imoview` fica nulo.
- Indicador "✓ Vinculado ao condomínio #codigo" abaixo do input quando há vínculo.
- Botão pequeno "Desvincular" para limpar o código sem apagar o nome.

### Arquivos
- Novo: `src/crm/components/CondominioAutocomplete.tsx` — input com popover de sugestões usando `Command`/`Popover` shadcn (mais simples que `CondominioCombobox` porque busca server-side ao digitar, sem carregar lista inteira).
- Editado: `src/crm/pages/ImovelForm.tsx` — substituir o `T('condominio_nome', 'Condomínio (nome)')` por `<CondominioAutocomplete>` controlado pelo `FormField`.

### Nada muda
- Sem migração de schema (colunas `condominio_nome` e `codigo_condominio_imoview` já existem).
- Sem mexer em RLS (tabela já tem leitura pública).
- Sem afetar outras telas.