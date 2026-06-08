# Integração com Portais Imobiliários

Objetivo: publicar imóveis do CRM nos portais Zap/VivaReal, ImovelWeb, OLX e Chaves na Mão. Como cada portal lê feeds XML uma vez por dia (não tem API push), vamos **gerar URLs públicas de feed** que você cadastra na conta de cada portal.

## Como funciona na prática

```text
[CRM]                    [Edge Function feed-portais]              [Portal]
imóvel marcado     →     gera XML em /feeds/zap.xml         →      lê 1x/dia
"publicar no Zap"        gera XML em /feeds/olx.xml                e atualiza
                         gera XML em /feeds/imovelweb.xml          o site deles
                         gera XML em /feeds/chavesnamao.xml
```

Você nunca envia nada manualmente — basta marcar o imóvel e o feed se atualiza sozinho.

## Fase 1 — Modelo de dados

Nova tabela `imovel_portais` (1 linha por imóvel + portal):
- `imovel_id`, `portal` (zap_vivareal / olx / imovelweb / chavesnamao)
- `publicar` (bool), `destaque_portal` (bool — alguns portais cobram por destaque)
- `ultimo_envio_em`, `erro_validacao` (texto)

Novos campos em `imoveis_proprios` (obrigatórios para os portais aceitarem):
- `mostrar_endereco` (bool — Zap exige saber se exibe rua/número)
- `youtube_url` separado de `video_url`
- `tour_virtual_url`
- Validação: portal exige título, descrição ≥ 100 caracteres, ≥ 1 foto, preço, área, CEP e cidade.

## Fase 2 — Edge function de feeds

Uma única função `portal-feed` com rota por portal:
- `GET /portal-feed/zap` → XML padrão **VRSync** (Zap + VivaReal)
- `GET /portal-feed/olx` → XML padrão **OLX**
- `GET /portal-feed/imovelweb` → XML padrão **Universal/ImovelWeb**
- `GET /portal-feed/chavesnamao` → XML próprio do Chaves na Mão

Cada feed:
1. Lê `imoveis_proprios` ativos + `imovel_portais.publicar = true` para aquele portal.
2. Monta XML conforme o schema oficial do portal.
3. Adiciona `Cache-Control: max-age=3600` (1h).
4. Pula imóveis que falham validação e registra em `erro_validacao`.

Pública (sem JWT), porque é o portal que vai ler.

## Fase 3 — UI no CRM

**No formulário do imóvel** (`ImovelForm.tsx`):
- Seção nova "Publicação em Portais" com 4 toggles (um por portal) + toggle "Destaque" por portal.
- Mostra status: ✓ válido / ⚠ erro de validação com o motivo.

**Tela nova `/crm/portais`** (gestão em massa):
- Tabela com imóveis × colunas por portal (checkbox).
- Filtros: portal, status (publicado/não/com erro), cidade, tipo.
- Ações em massa: "Publicar selecionados no Zap", "Remover do OLX" etc.
- Card no topo com URLs dos 4 feeds para copiar e colar no painel de cada portal.
- Contadores: quantos imóveis em cada portal, quantos com erro.

**No CrmSidebar**: novo item "Portais" (ícone de globo).

## Fase 4 — Cadastro nos portais (manual, você faz uma vez)

Quando contratar cada portal, você cola a URL do feed (ex: `https://...supabase.co/functions/v1/portal-feed/zap`) no painel do portal. Eles passam a ler diariamente. Vou deixar um botão "Copiar URL do feed" e instruções curtas em cada seção.

## Fora deste plano

- API direta de portais (exige contrato B2B caso a caso, não escala).
- Métricas de visualização vindas dos portais (cada um tem dashboard próprio).
- Sincronização reversa (lead que vem do portal → CRM): isso já chega como e-mail/WhatsApp normal.

## Detalhes técnicos

- **Migração**: cria `imovel_portais` com RLS (admin/gestor escrevem, corretor lê os próprios), adiciona campos em `imoveis_proprios`, GRANTs corretos.
- **Edge function**: `supabase/functions/portal-feed/index.ts` com `verify_jwt = false`, geração de XML com template strings + escape de caracteres.
- **Validador compartilhado**: `src/crm/lib/portais.ts` — mesma lógica usada na UI (para mostrar erro antes) e na edge function (para pular).
- **Schemas XML**: implementados conforme docs públicas — VRSync 2.0 (Zap), OLX Real Estate XML, ImovelWeb Universal Feed, Chaves na Mão XML 1.0.
