## Objetivo

Replicar no formulário de cadastro de imóveis (`/crm/imoveis/novo` e edição) todos os campos e seções vistos no Imoview, organizados em abas/etapas: **Endereço**, **Detalhes**, **Relacionamentos** e **Anotações**.

## Estrutura de abas (wizard)

```text
[ ENDEREÇO ]  →  [ DETALHES ]  →  [ RELACIONAMENTOS ]  →  [ ANOTAÇÕES ]
```

Navegação com botões "Voltar" / "Próximo" + "Salvar" disponível em qualquer etapa (para edição). Indicação visual de "Campos obrigatórios".

### 1. Endereço
CEP, Endereço, Nº, Bairro, Região, Sub-região, Cidade-Estado, Finalidade, Tipo de imóvel, Tipo complemento, Complemento, Torre/bloco.

### 2. Detalhes (várias sub-seções)

**Identificação / Comercial**
Código auxiliar, Destinação, Finalidade, Tipo de imóvel, Segundo tipo, Local das chaves, Identificador de chaves, Nº de chaves, Nº de controles, Horário de visita, Edifício, Condomínio (nome — combobox vinculado à tabela `condominios_cache`), Etiqueta (tags), Identificador imóvel.

**Valores**
Venda, Valor anterior, Condomínio (R$), IPTU mensal, IPTU anual, Rentabilidade %, Comissão venda %, Valor sob consulta (toggle), Valor avaliação, Descrição avaliação.

**Flags**
Exclusivo, Imóvel ocupado, Imóvel alugado, Placa/Faixa, CIB, Aceita financiamento, Aceita permuta, Na planta, Permite animais.

**Áreas | Dimensões | Zoneamento**
Área interna (m²), Área externa (m²), Área lote/terreno, Tipo de medida, M. frente, M. fundo, M. direito, M. esquerdo, Confrontação frente/fundo/lado direito/lado esquerdo, Zona de uso, Coeficiente de aproveitamento.

**Texto & SEO**
Ponto de referência, Melhor acesso, Título para anúncio, Descrição, Meta description, Construtora, Ano construção, Vencimento autorização de venda.

**Cartório**
Cartório, Matrícula, Livro cartório, Folha cartório.

**Características internas**
Andar, Banheiros, Piso/acabamento, Posição imóvel, Quartos, Salas, Suítes, Varandas.
Toggles: Ar condicionado, Área serviço, Armário cozinha, Box banheiro, DCE, Escritório, Mobiliado, Sol da manhã, Varanda gourmet, Cabeamento estruturado, Conexão internet, Vista para lago, Área privativa, Armário banheiro, Armário quarto, Closet, Despensa, Lavabo, Rouparia, Vista para o mar, Lareira, TV a cabo, Vista para montanha.

**Características externas**
Vagas de garagem, Tipo de vaga, Elevadores, Nº torres/blocos, Nº andares, Unidades por andar, Total unidades.
Toggles: Água individual, Aquec. elétrico, Aquec. gás, Aquec. solar, Cerca elétrica, Gás canalizado, Jardim, Portão eletrônico, Segurança 24h, Gramado, Alarme, Box despejo, Circuito TV, Interfone, Lavanderia, Portaria 24h, Quintal.

**Lazer**
Toggles: Academia, Churrasqueira, Hidromassagem, Home cinema, Piscina, Playground, Quadra poliesportiva, Quadra de tênis, Sala de massagem, Salão de festas, Salão de jogos, Sauna, Wifi, Espaço gourmet, Garage Band, Quadra de squash, Quadra de beach tênis.

### 3. Relacionamentos
Corretor responsável (já existe), Proprietário (futuro — placeholder por ora), Condomínio (link para `/crm/condominios/:codigo`).

### 4. Anotações
Observações internas, Notas privadas, Fotos (já existe), Vídeo, Tour 360.

## Mudanças técnicas

### Banco (`imoveis_proprios`) — migration
Adicionar colunas faltantes. As já existentes (preco, condominio, iptu, area, area_total, quartos, suites, banheiros, vagas, caracteristicas[], video_url, tour_360_url, fotos, condominio_nome, codigo_condominio_imoview, aceita_permuta, valor_m2) são reaproveitadas.

Novas colunas:
- `codigo_auxiliar text`, `destinacao text`, `segundo_tipo text`
- `local_chaves text`, `identificador_chaves text`, `num_chaves int`, `num_controles int`, `horario_visita text`, `edificio text`, `identificador_imovel text`, `etiquetas text[]`
- `valor_anterior numeric`, `iptu_anual numeric`, `iptu_mensal numeric`, `rentabilidade_pct numeric`, `comissao_venda_pct numeric`, `valor_sob_consulta bool`, `valor_avaliacao numeric`, `descricao_avaliacao text`
- `exclusivo bool`, `imovel_ocupado bool`, `imovel_alugado bool`, `placa_faixa text`, `cib text`, `aceita_financiamento bool`, `na_planta bool`, `permite_animais bool`
- `area_externa numeric`, `tipo_medida text`, `m_frente numeric`, `m_fundo numeric`, `m_direito numeric`, `m_esquerdo numeric`, `confront_frente text`, `confront_fundo text`, `confront_dir text`, `confront_esq text`, `zona_uso text`, `coef_aproveitamento numeric`
- `ponto_referencia text`, `melhor_acesso text`, `titulo_anuncio text`, `meta_description text`, `construtora text`, `ano_construcao int`, `venc_autorizacao_venda date`
- `cartorio text`, `matricula text`, `livro_cartorio text`, `folha_cartorio text`
- `andar text`, `piso_acabamento text`, `posicao_imovel text`, `salas int`, `varandas int`
- `tipo_vaga text`, `elevadores int`, `num_torres int`, `num_andares int`, `unidades_por_andar int`, `total_unidades int`
- `sub_regiao text`, `regiao text`, `numero text`, `complemento text`, `tipo_complemento text`, `torre_bloco text`
- `segundo_bairro text`

Toggles (lazer/internas/externas) → armazenadas no array `caracteristicas` já existente (chaves normalizadas tipo `lazer:piscina`, `interna:ar_condicionado`).

### Frontend

**`src/crm/lib/imoveis.ts`**
- Adicionar listas constantes: `DESTINACAO`, `TIPO_VAGA`, `POSICAO_IMOVEL`, `TIPO_MEDIDA`, `PLACA_FAIXA`, `LOCAL_CHAVES`.
- Catálogos de características: `CARACT_INTERNAS`, `CARACT_EXTERNAS`, `LAZER` (cada item: `{key, label}`).

**`src/crm/pages/ImovelForm.tsx`** — refatorar:
- Trocar o layout atual por wizard com `Tabs` (shadcn) — abas Endereço, Detalhes, Relacionamentos, Anotações.
- Em "Detalhes", usar `Accordion` com as sub-seções acima para evitar tela gigante.
- Expandir schema zod com todos os novos campos (opcionais).
- Adicionar componente `CaracteristicasToggleGrid` reutilizável (grid de Switches) que lê/escreve no array `caracteristicas`.
- Manter a regra RBAC e a lógica de salvar atual; apenas o payload cresce.

**`CondominioCombobox`** já existe — reutilizar no campo "Condomínio (nome)" e preencher também `codigo_condominio_imoview`.

### Sem alterações
- Página pública, sincronização Imoview, listagem `Imoveis.tsx`, detalhe público — permanecem como estão (campos novos ficam invisíveis até serem usados).

## Entrega
1. Migration adicionando colunas.
2. Refator do `ImovelForm.tsx` com wizard de 4 abas + todas as seções.
3. Constantes e catálogos em `src/crm/lib/imoveis.ts`.
4. Componente auxiliar `CaracteristicasToggleGrid`.
