# Filtros avançados em CRM → Imóveis

Replicar o painel de filtros da imagem em `/crm/imoveis`, consultando `imoveis_proprios` no Supabase (campos já existem no schema).

## Painel colapsável "Filtros" com 4 seções

### Identificação
- **Códigos** (input texto, múltiplos separados por vírgula → `codigo_interno.in.()` ou `codigo_imoview.in.()`)
- **Finalidade** (`venda` / `locacao` / `temporada`)
- **Situação** (mapeia para `status`: disponível, sob_proposta, vendido, alugado, inativo, etc.)
- **Tipo de imóvel** (multi-select carregado de `distinct tipo`)
- **Etiquetas** (multi-select, busca em array `etiquetas`)
- **Pontuação** (placeholder/desabilitado — não há campo na base; mantemos visual mas oculto até existir)

### Localização
- **Cidade** (multi-input)
- **Regiões / Sub-regiões** (`regiao`, `sub_regiao` — selects dependentes carregados de distinct)
- **Bairro** (multi-input)
- **Endereço / Nº / Complemento** (inputs `ilike`)
- **Local chaves** / **Identificador chaves** (`local_chaves`, `identificador_chaves`)

### Características
- **Valor imóvel** (de/até → `preco`)
- **Valor condomínio** (de/até → `condominio`)
- **Área interna m²** (de/até → `area`)
- **Quartos / Suítes / Vagas** (selects 1+/2+/3+/4+)
- **Edifício** (`edificio` ilike)
- **Tipo condomínio** (select de distinct)
- **Imóvel ocupado** (Todos / Sim / Não → `imovel_ocupado`)

## Implementação

- Arquivo único: `src/crm/pages/Imoveis.tsx`.
- Estado consolidado em um objeto `filters` + botão **"Aplicar filtros"** e **"Limpar"** (sem auto-fetch, conforme padrão do projeto).
- Persistência leve via querystring (para preservar ao navegar).
- Query Supabase combinando `.eq`, `.in`, `.gte/.lte`, `.ilike`, `.contains` (para arrays).
- Opções dinâmicas (Tipo, Região, Sub-região, Tipo condomínio, Etiquetas) carregadas em paralelo com um único `select` de colunas + deduplicação no cliente (uma vez na montagem).
- Layout em `Card` com header colapsável (`ChevronDown`), seções separadas por divisores, grid responsivo 1→2→4 colunas igual à referência.
- Mantém a busca rápida atual (input "q") no topo, fora do painel.

## Sem migração
Todos os campos já existem em `imoveis_proprios` (status, finalidade, tipo, regiao, sub_regiao, bairro, cidade, endereco, numero, complemento, local_chaves, identificador_chaves, preco, condominio, area, quartos, suites, vagas, edificio, imovel_ocupado, etiquetas, codigo_interno, codigo_imoview).

## Arquivo afetado
- `src/crm/pages/Imoveis.tsx` (refactor do bloco de filtros + lógica de query)
