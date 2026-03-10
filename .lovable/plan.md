

## Criar página "Assessoria para Investidores e Leilão"

### O que será criado

Uma nova página institucional em `/leilao` seguindo o mesmo padrão visual da página "Nossa História", com o conteúdo completo fornecido sobre assessoria para investidores em imóveis de leilão.

### Estrutura da página

A página terá as seguintes seções:

1. **Hero** — Título "Assessoria para Investidores e Leilão" com subtítulo resumindo o serviço
2. **Como Funciona** — Texto introdutório explicando o modelo de assessoria
3. **Etapas do Processo** — Cards visuais com ícones mostrando o fluxo (busca → análise → arrematação → burocracia → desocupação → regularização)
4. **Dois Modelos de Assessoria** — Seção com dois cards lado a lado:
   - **Assessoria Tradicional** — Lista de entregas + custos (10% assessoria + 3% advogado)
   - **Assessoria Caixa-Forte** — Lista de entregas + modelo de remuneração (50% do lucro) com exemplo prático
5. **Transparência** — Seção destacando que pagamentos são diretos, sem valores ocultos
6. **CTA** — Botão WhatsApp para contato

### Alterações

| Arquivo | Ação |
|---------|------|
| `src/pages/Leilao.tsx` | **Criar** — Página completa com Layout, ScrollReveal, SEOHead |
| `src/App.tsx` | **Editar** — Adicionar rota `/leilao` |
| `src/components/Header.tsx` | **Editar** — Adicionar "LEILÃO" no menu de navegação |

### Padrões seguidos

- Usa `Layout`, `ScrollReveal`, `SEOHead`, `Button` existentes
- Mesmo estilo visual e classes CSS da página Nossa História (glass-luxury, gradients, etc.)
- Ícones do lucide-react (Gavel, Search, FileCheck, Shield, Home, TrendingUp, etc.)

