import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PropertyCard } from '@/components/PropertyCard';
import type { ImoviewProperty } from '@/services/imoviewApi';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

type ChatRole = 'user' | 'assistant';
interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  imoveis?: ImoviewProperty[];
}

const SUGESTOES = [
  'Apto 3 quartos no Campolim até 800 mil',
  'Casa com piscina em Sorocaba',
  'Aluguel 2 quartos até R$ 3.000',
  'Imóvel de alto padrão acima de 1,5 milhão',
];

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/busca-ia-site`;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function HeroAiSearch() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const content = text.trim();
    if (!content || loading) return;

    const userMsg: ChatMessage = { id: uid(), role: 'user', content };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errMsg =
          res.status === 429
            ? 'Muitas buscas em pouco tempo. Aguarde alguns segundos e tente de novo.'
            : res.status === 402
            ? 'Nosso assistente está temporariamente indisponível. Tente novamente em instantes.'
            : data?.error || 'Não foi possível processar agora. Tente novamente.';
        toast({ title: 'Ops', description: errMsg, variant: 'destructive' });
        setMessages((m) => [
          ...m,
          { id: uid(), role: 'assistant', content: errMsg },
        ]);
        return;
      }

      const reply = String(data?.reply ?? '');
      const imoveis = Array.isArray(data?.imoveis) ? (data.imoveis as ImoviewProperty[]) : [];
      setMessages((m) => [
        ...m,
        { id: uid(), role: 'assistant', content: reply, imoveis },
      ]);
    } catch (e) {
      const err = (e as Error).message;
      toast({ title: 'Erro de conexão', description: err, variant: 'destructive' });
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function resetChat() {
    setMessages([]);
    setInput('');
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="glass-luxury-dark rounded-2xl border border-primary/20 shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-primary/10 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gradient-gold flex items-center justify-center shadow-md">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-heading font-semibold text-foreground leading-tight">
              Busca com IA
            </p>
            <p className="text-xs text-muted-foreground leading-tight">
              Descreva o imóvel dos seus sonhos
            </p>
          </div>
        </div>
        {hasMessages && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetChat}
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Nova busca
          </Button>
        )}
      </div>

      {/* Conversa */}
      <div
        ref={scrollRef}
        className={cn(
          'overflow-y-auto px-5 py-5 space-y-5 transition-all',
          hasMessages ? 'min-h-[320px] max-h-[60vh]' : 'min-h-[180px]',
        )}
      >
        {!hasMessages && (
          <div className="text-center space-y-4 py-2">
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Conte o que procura em linguagem natural — bairro, número de quartos,
              faixa de preço, características — e a IA encontra os imóveis ideais
              no nosso catálogo.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-foreground/80 hover:text-foreground hover:bg-primary/10 hover:border-primary/60 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className="space-y-3">
            {m.role === 'user' ? (
              <div className="flex justify-end">
                <div className="max-w-[85%] bg-gradient-gold text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm font-medium shadow-md">
                  {m.content}
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <div className="h-7 w-7 shrink-0 rounded-full bg-primary/15 flex items-center justify-center mt-0.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  {m.content && (
                    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {m.content}
                    </p>
                  )}
                  {m.imoveis && m.imoveis.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      {m.imoveis.slice(0, 6).map((p) => (
                        <PropertyCard key={p.codigo} property={p} />
                      ))}
                    </div>
                  )}
                  {m.imoveis && m.imoveis.length === 0 && m.content === '' && (
                    <p className="text-sm text-muted-foreground italic">
                      Nenhum imóvel encontrado com esses filtros.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="h-7 w-7 shrink-0 rounded-full bg-primary/15 flex items-center justify-center mt-0.5">
              <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Buscando imóveis…
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-primary/10 p-3 bg-background/40"
      >
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ex: apartamento 3 quartos no Campolim até 850 mil com piscina"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none min-h-[44px] max-h-32 bg-secondary/60 border-border/60 rounded-xl text-sm focus-visible:ring-primary"
          />
          <Button
            type="submit"
            size="icon"
            disabled={loading || !input.trim()}
            className="h-11 w-11 rounded-xl bg-gradient-gold text-primary-foreground hover:opacity-90 shrink-0"
            aria-label="Enviar"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
