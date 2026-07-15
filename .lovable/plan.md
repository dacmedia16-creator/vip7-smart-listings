# Importar dados completos da planilha Imoview

Planilha `imoveis-Ativos_2026-06-08-162435.xls` é HTML com **1.155 imóveis × 158 colunas**. Traz campos que a API não devolve: `Descricao`, `Anotacoes`, `Empreendimento`, `Administradora/Sindico`, IPTU anual, todas as áreas, `Andar`, `PisoAcabamento`, cada característica (Piscina, Academia, Portaria24H, Wifi…), cartório/matrícula, `Pontuacao`, `Etiquetas`, portais publicados, etc.

Match sempre por `Codigo` (planilha) = `codigo_imoview` (banco). Códigos sem imóvel correspondente são ignorados no relatório — nada é criado do zero.

## Passos

**1. Migração — colunas novas em `imoveis_proprios`** (apenas as que ainda não existem no schema atual)
- Financeiro: `valor_iptu_anual`, `indice_iptu`, `rentabilidade`, `taxa_administracao`, `taxa_intermediacao`, `comissao_venda`, `valor_seguro_incendio`, `valor_parcela_seguro_incendio`
- Endereço/local: `bairro2`, `regiao`, `ponto_referencia`, `melhor_acesso`, `zona_uso`, `coeficiente_aprov`
- Imóvel: `andar`, `piso_acabamento`, `posicao_imovel`, `area_lote`, `area_interna`, `area_externa`, `area_privativa`, `area_servico`
- Empreendimento: `empreendimento`, `construtora`, `idade`, `horario_visita`, `administradora`, `administradora_telefone`, `administradora_email`, `sindico`, `sindico_telefone`, `sindico_email`, `na_planta`, `exclusivo`, `placa`, `unidade`
- Prédio: `numero_elevador`, `numero_torres`, `numero_andar`, `numero_unidades_andar`, `total_unidades`
- Datas: `data_cadastro`, `data_entrega`, `data_vago_desde`, `data_vencimento_autorizacao`, `data_hora_ultima_alteracao_imoview`, `data_hora_ultima_situacao`
- Registro: `cartorio`, `matricula_cartorio`, `livro_cartorio`, `folha_cartorio`, `agua_identificador`, `agua_matricula`, `agua_padrao`, `luz_numero_cliente`, `luz_numero_instalacao`, `luz_padrao`
- Interno: `anotacoes`, `padrao`, `pontuacao`, `etiquetas` (text[]), `captadores`, `indicado_por`, `motivo_desativacao`, `situacao_imoview`, `tipo2`, `numero_controle`, `identificador_imovel`
- Consolidados em JSONB (evita ~70 booleans no schema):
  - `caracteristicas jsonb` — ArCondicionado, Alarme, Piscina, Academia, Portaria24H, Wifi, Churrasqueira, Playground, Sauna, etc.
  - `portais_publicados jsonb` — OLX, ImovelWeb, CasaMineira, MercadoLivre, Facebook, ChaveFacil, LugarCerto, ChavesNaMao

Sem RLS nova, sem GRANT novo — tabela já existe e é usada.

**2. Edge function `import-imoveis-completo`**
- Input: `{ rows: [...], dryRun?: boolean }` (frontend envia em lotes de 100).
- Só admin/gestor autenticado (checa `is_admin_or_gestor`).
- Para cada linha: normaliza (moeda BR `1.234,56` → number, datas `dd/mm/aaaa` → ISO, `Sim/Não` → boolean, `Etiquetas` split por `;`), monta payload e faz `UPDATE ... WHERE codigo_imoview = <Codigo>`.
- Nunca sobrescreve: `id`, `codigo_imoview`, `codigo_interno`, `fotos`, `latitude/longitude`, `created_at`, `created_by`.
- Dry-run: só conta `atualizariam` vs `nao_encontrados` (lista os 50 primeiros códigos ignorados).
- Retorna: `atualizados`, `nao_encontrados`, `erros_por_linha`.

**3. Página `/crm/importar-imoveis-completo`**
- Aceita `.xls` (HTML Imoview), `.xlsx`, `.csv`.
- Parser dedicado do HTML da Imoview usando `DOMParser` (mapeia os 158 cabeçalhos automaticamente).
- Passo 1: upload → parse → mostra "1155 imóveis detectados", preview das 5 primeiras linhas e amostra de campos.
- Passo 2: botão "Verificar" → chama edge function em modo `dryRun`. Mostra quantos serão atualizados vs quantos códigos não existem no banco (com lista).
- Passo 3: botão "Importar" → dispara os lotes com barra de progresso.
- Relatório final com contadores + download CSV dos erros/ignorados.

**4. Link no menu**
Entrada nova em `CrmSidebar.tsx` na seção Importações: "Dados completos (planilha)".

**5. Exibir campos novos em `ImovelDetail.tsx`**
Sessões adicionais quando os campos existirem:
- "Descrição completa" (`descricao` ou `anotacoes`)
- "Áreas" (grid com lote/interna/externa/privativa/serviço)
- "Empreendimento & Condomínio" (empreendimento, construtora, idade, administradora, síndico com telefone/email)
- "Características" (chips a partir do JSONB `caracteristicas`)
- "Registro" (cartório, matrícula, água, luz)

`ImovelForm.tsx` não muda agora — edição manual desses campos fica pra outra etapa se quiser.

## Fora de escopo

- Não mexe no sync da API (`imoview-sync`).
- Não importa fotos (planilha só tem `QuantidadeFotos`).
- Não cria imóvel novo se `Codigo` não existir no banco — só atualiza.
- Não toca em proprietários (fluxo separado já existente).
