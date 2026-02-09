
## Plano: Exibir Codigo do Imovel no Card

### Alteracao

Adicionar o codigo do imovel (`property.codigo`) no card, logo abaixo do titulo, como um texto discreto antes da localizacao.

### Arquivo: `src/components/PropertyCard.tsx`

Inserir entre o titulo (h3, linha 164) e a localizacao (linha 169):

```typescript
{/* Código */}
<span className="text-xs text-muted-foreground/70 font-mono">
  Cód. {property.codigo}
</span>
```

O codigo aparecera em fonte mono, tamanho pequeno, com opacidade reduzida para nao competir visualmente com o titulo e localizacao.
