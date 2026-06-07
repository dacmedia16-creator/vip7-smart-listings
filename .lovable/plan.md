## Diagnóstico da planilha

`atendimentos-2026-06-07-004721.xls` é HTML disfarçado de `.xls` (igual ao export de proprietários), com **40 colunas separadas**:

```
Codigo, Finalidade, UnidadeCodigo, Unidade, ClienteNome, ClienteTelefone,
ClienteEmail, Midia, Campanha, Tipo, Fase, Termometro, Mql, Corretor,
Equipe, Situacao, SituacaoDescarte, ImoveisCarrinho, ImoveisVisita,
ImoveisProposta, DataHoraInclusao, UsuarioInclusao, DataHoraUltimaInteracao,
UltimaInteracao, UsuarioUltimaInteracao, PerfilQuartos, PerfilBanhos,
PerfilSuites, PerfilVagas, PerfilValorDe, PerfilValorAte,
PerfilAreaInternaDe, PerfilAreaInternaAte, PerfilTipos, PerfilCidades,
PerfilBairros, PerfilRegioes, Valor, PerfilSistema, Indicacao, Etiquetas
```

Como cada campo já vem em coluna própria, **não preciso de parser de texto livre** como fiz nos proprietários — basta auto-mapear e gravar.

## O que vou construir

Nova página `src/crm/pages/ImportarLeads.tsx` em `/crm/leads/importar`, com a mesma UX mínima da importação de proprietários:
1. Upload do `.xls` (detecta HTML e parseia via `DOMParser`).
2. Pré-visualização das primeiras 10 linhas.
3. **Auto-mapeamento** das colunas → campos da tabela `leads` (mostrado de forma compacta, apenas duas linhas obrigatórias para confirmar: **Nome** e **Telefone**).
4. Botão **Importar** com barra de progresso e relatório final (inseridos / duplicados / erros).

## Mapeamento Imoview → `leads`

| Coluna planilha | Campo `leads` | Tratamento |
|---|---|---|
| ClienteNome | `nome` | obrigatório |
| ClienteTelefone | `telefone` | só dígitos, obrigatório |
| ClienteEmail | `email` | lowercase, opcional |
| Finalidade | `finalidade` | "Venda"→`venda`, "Locação"→`aluguel` |
| PerfilTipos | `tipo_imovel` | primeiro tipo da string |
| PerfilCidades | `cidade_interesse` | primeira cidade |
| PerfilBairros | `bairro_interesse` | string completa |
| PerfilValorDe | `orcamento_min` | número |
| PerfilValorAte | `orcamento_max` | número |
| PerfilQuartos/Banhos/Suites/Vagas | concatena em `perfil_busca` | texto descritivo |
| Midia + Campanha | `origem` + `origem_url` | "cliqueimudei"→`portal`, etc; padrão `importado` |
| Etiquetas | `tags` | split por vírgula |
| DataHoraInclusao | `created_at` | parse `dd/MM/yyyy HH:mm` |
| DataHoraUltimaInteracao | `last_contact_at` | idem |
| Fase + Situacao | `status_funil` | mapa: "Lead qualificado"→`em_atendimento`, "Visita"→`visita_agendada`, "Proposta"→`proposta_enviada`, "Negócio fechado"→`fechamento`, Situacao="Descartado"→`perdido`, padrão `novo` |
| Codigo | `imovel_interesse_codigo` | string |
| UltimaInteracao + SituacaoDescarte | `observacoes` | texto consolidado |

Campos sem destino direto (Termometro, Mql, Corretor, Equipe, etc.) vão para `observacoes` como texto extra para não perder informação.

## Deduplicação

Antes de inserir cada linha, chamo o RPC já existente `find_duplicate_lead(_telefone, _email)`. Se retornar um lead, **pulo** (sem criar interação, já que é importação em massa, não contato novo). Contador "duplicados" no relatório final.

## Acesso à página

- Rota nova em `src/App.tsx`: `/crm/leads/importar` → `ImportarLeads` (com `RequireAuth`).
- Botão **"Importar planilha"** em `src/crm/pages/Leads.tsx`, ao lado do "Novo lead".

## Arquivos

- **Novo**: `src/crm/pages/ImportarLeads.tsx`
- **Editados**: `src/App.tsx` (rota), `src/crm/pages/Leads.tsx` (botão)

## O que NÃO vou fazer

- Não vou criar `clientes` a partir da planilha (só `leads`). Se depois você quiser duplicar como cliente categoria "interessado", é um passo extra.
- Não vou vincular ao corretor importado por nome (só gravo o nome em `observacoes`). Vincular exigiria uma tabela de-para que você ainda não tem.
- Não vou alterar nada na importação de proprietários.

## Validação após implementar

- Abrir `/crm/leads/importar`, subir o `.xls` enviado.
- Conferir: ~N linhas detectadas, colunas auto-mapeadas, preview correto.
- Importar e verificar no Funil (`/crm/funil`) que aparecem distribuídos nas colunas certas conforme `Fase`/`Situacao`.