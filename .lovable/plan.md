
## Plano: Corrigir Travamento na Galeria de Fotos

### Diagnostico

Identifiquei **4 problemas principais** no componente `PropertyGallery.tsx` que causam o travamento intermitente ao passar as fotos:

| Problema | Localização | Impacto |
|----------|-------------|---------|
| 1. **Bloqueio por `isAnimating`** | Linhas 106-118 | O estado `isAnimating` bloqueia cliques rápidos, mas o `setTimeout` de 300ms pode não sincronizar corretamente com a animação CSS |
| 2. **Touch handlers sem debounce** | Linhas 121-142 | Múltiplos eventos de touch podem disparar navegação duplicada |
| 3. **Re-render excessivo** | Linhas 78-80, 121-128 | Estados `touchStart` e `touchEnd` causam re-renders desnecessários |
| 4. **Animação CSS conflitante** | Linhas 392-398 | Ken Burns animation (`subtle-zoom`) conflita com a transição de troca de imagem |

### Causa Raiz Principal

O problema mais crítico está nas funções `nextImage` e `prevImage`:

```typescript
// CÓDIGO ATUAL - Problema de timing
const nextImage = useCallback(() => {
  if (isAnimating) return;  // Bloqueia cliques durante animação
  setIsAnimating(true);
  setCurrentImage((prev) => (prev + 1) % images.length);
  setTimeout(() => setIsAnimating(false), 300);  // Timing fixo pode não corresponder à animação real
}, [images.length, isAnimating]);
```

O `setTimeout` de 300ms **não sincroniza** com a duração real da animação CSS (`transition-all duration-700` na linha 393), causando:
- Cliques ignorados quando `isAnimating` ainda é true
- Ou múltiplos cliques processados quando o timeout reseta muito cedo

### Solucao Proposta

| Arquivo | Alteração |
|---------|-----------|
| `src/components/PropertyGallery.tsx` | 1. Usar refs para touch em vez de state (evita re-renders) |
| `src/components/PropertyGallery.tsx` | 2. Sincronizar timeout com CSS duration (300ms -> usar `onTransitionEnd`) |
| `src/components/PropertyGallery.tsx` | 3. Adicionar debounce no swipe |
| `src/components/PropertyGallery.tsx` | 4. Pausar Ken Burns durante troca de imagem |
| `src/components/PropertyGallery.tsx` | 5. Usar `requestAnimationFrame` para animações mais suaves |

### Codigo Corrigido

**1. Trocar estados de touch por refs (evita re-renders):**

```typescript
// ANTES (causa re-render a cada movimento)
const [touchStart, setTouchStart] = useState<number | null>(null);
const [touchEnd, setTouchEnd] = useState<number | null>(null);

// DEPOIS (sem re-renders)
const touchStartRef = useRef<number | null>(null);
const touchEndRef = useRef<number | null>(null);
```

**2. Melhorar handlers de navegação com debounce:**

```typescript
const lastNavigationRef = useRef<number>(0);
const NAVIGATION_DEBOUNCE = 250; // ms entre navegações

const nextImage = useCallback(() => {
  const now = Date.now();
  if (now - lastNavigationRef.current < NAVIGATION_DEBOUNCE) return;
  lastNavigationRef.current = now;
  
  setIsAnimating(true);
  setCurrentImage((prev) => (prev + 1) % images.length);
  // Deixar o onTransitionEnd resetar isAnimating
}, [images.length]);
```

**3. Usar onTransitionEnd em vez de setTimeout:**

```typescript
<img
  src={images[currentImage]}
  alt={title}
  className={cn(
    "w-full h-full object-cover cursor-pointer transition-opacity duration-300",
    isAnimating ? "opacity-0" : "opacity-100"
  )}
  onTransitionEnd={() => setIsAnimating(false)}
  onClick={() => setLightboxOpen(true)}
/>
```

**4. Simplificar touch handlers:**

```typescript
const onTouchStart = useCallback((e: React.TouchEvent) => {
  touchEndRef.current = null;
  touchStartRef.current = e.targetTouches[0].clientX;
}, []);

const onTouchMove = useCallback((e: React.TouchEvent) => {
  touchEndRef.current = e.targetTouches[0].clientX;
}, []);

const onTouchEnd = useCallback(() => {
  if (!touchStartRef.current || !touchEndRef.current) return;
  
  const distance = touchStartRef.current - touchEndRef.current;
  
  if (Math.abs(distance) > minSwipeDistance) {
    if (distance > 0) {
      nextImage();
    } else {
      prevImage();
    }
  }
  
  touchStartRef.current = null;
  touchEndRef.current = null;
}, [nextImage, prevImage]);
```

**5. Remover Ken Burns conflitante durante transição:**

```typescript
<img
  src={images[currentImage]}
  alt={title}
  className="w-full h-full object-cover cursor-pointer"
  style={{ 
    animation: !isAnimating ? 'subtle-zoom 20s ease-in-out infinite alternate' : 'none',
    transition: 'opacity 0.3s ease-out',
    opacity: isAnimating ? 0 : 1
  }}
  onTransitionEnd={() => setIsAnimating(false)}
/>
```

### Resumo das Alterações

| Linha | Antes | Depois |
|-------|-------|--------|
| 78-79 | `useState` para touch | `useRef` para touch |
| 80 | `isAnimating` com setTimeout | Debounce com ref + onTransitionEnd |
| 106-118 | setTimeout fixo 300ms | Debounce 250ms + onTransitionEnd |
| 121-142 | Touch handlers com state | Touch handlers com ref (sem re-render) |
| 389-401 | Animação conflitante | Pausar Ken Burns durante transição |

### Resultado Esperado

- Navegação fluida sem travamentos
- Resposta consistente a cliques e swipes
- Menos re-renders = melhor performance
- Sincronização correta entre animações
