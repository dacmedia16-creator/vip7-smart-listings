# Rodar a importação da planilha completa direto no servidor

Planilha `imoveis-Ativos_2026-06-08-162435-2.xls` já parseada: **1.155 linhas**. Aplicar UPDATEs em `imoveis_proprios` casando por `codigo_imoview` = `Codigo`.

## Passos

1. Regerar 58 lotes menores (~20 UPDATEs cada) para caber no limite de payload.
2. Executar cada lote via `supabase--insert`.
3. Rodar consulta final mostrando quantos imóveis ficaram com cada campo novo preenchido (administradora, síndico, área privativa, portais publicados, pontuação, características, etc.).
4. Listar códigos da planilha que não existem no banco (ignorados).

## Campos atualizados por linha (quando presentes na planilha)

Financeiro (preço, condomínio, IPTU, seguros, comissões), endereço completo, áreas, cômodos, dados do prédio/empreendimento, administradora e síndico, cartório, água/luz, datas, descrição, anotações, pontuação, características (array), etiquetas (array), portais publicados (jsonb).

## Fora de escopo

- Nada de criar novo imóvel — só UPDATE em quem já existe.
- Fotos, geocode, `codigo_interno`, `created_at`, `created_by` não são tocados.
