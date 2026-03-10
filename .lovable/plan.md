

## WhatsApp com número diferente na página de Leilão

O `WhatsAppButton` já aceita prop `phone`. O `Layout` já renderiza o botão. A solução é:

1. **`src/components/Layout.tsx`** — Aceitar prop opcional `whatsappPhone` e passá-la ao `WhatsAppButton`
2. **`src/pages/Leilao.tsx`** — Passar `whatsappPhone="5515996544379"` ao `Layout`

Duas edições simples, sem impacto nas demais páginas.

