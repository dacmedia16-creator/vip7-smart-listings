import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CondominioRow {
  codigo: number;
  nome: string;
  cidade: string | null;
}

interface Props {
  nome: string;
  codigo: number | null | undefined;
  onChange: (val: { nome: string; codigo: number | null; cidade?: string | null }) => void;
}

export function CondominioAutocomplete({ nome, codigo, onChange }: Props) {
  const [results, setResults] = useState<CondominioRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const search = (term: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (term.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('condominios_cache')
        .select('codigo, nome, cidade')
        .ilike('nome', `%${term.trim()}%`)
        .order('nome')
        .limit(20);
      setLoading(false);
      if (!error && data) {
        setResults(data as CondominioRow[]);
        setOpen(true);
        setFocusIdx(-1);
      }
    }, 300);
  };

  const select = (r: CondominioRow) => {
    onChange({ nome: r.nome, codigo: r.codigo, cidade: r.cidade });
    setOpen(false);
    setResults([]);
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Input
          value={nome ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            onChange({ nome: v, codigo: codigo && nome === v ? codigo : null });
            search(v);
          }}
          onFocus={() => { if (results.length) setOpen(true); }}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); setFocusIdx((i) => Math.min(i + 1, results.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusIdx((i) => Math.max(i - 1, 0)); }
            else if (e.key === 'Enter' && focusIdx >= 0) { e.preventDefault(); select(results[focusIdx]); }
            else if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="Digite o nome do condomínio…"
        />
        {loading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {codigo ? (
        <div className="mt-1 flex items-center gap-2 text-xs text-emerald-700">
          <Check className="h-3 w-3" /> Vinculado ao condomínio #{codigo}
          <Button
            type="button" variant="ghost" size="sm"
            className="h-5 px-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onChange({ nome, codigo: null })}
          >
            <X className="h-3 w-3 mr-1" /> Desvincular
          </Button>
        </div>
      ) : nome && nome.length >= 2 ? (
        <div className="mt-1 text-xs text-muted-foreground">Novo condomínio (não cadastrado)</div>
      ) : null}

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-72 overflow-auto">
          {results.map((r, i) => (
            <button
              type="button"
              key={r.codigo}
              onClick={() => select(r)}
              onMouseEnter={() => setFocusIdx(i)}
              className={cn(
                'w-full text-left px-3 py-2 text-sm hover:bg-accent flex flex-col',
                focusIdx === i && 'bg-accent'
              )}
            >
              <span className="font-medium">{r.nome}</span>
              <span className="text-xs text-muted-foreground">
                {r.cidade ? `${r.cidade} · ` : ''}#{r.codigo}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
