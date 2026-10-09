import { useEffect, useState } from 'react';
import { Pencil, Save, X, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { TipoAnuncio } from '../lib/portais';

const CAMPOS = [
  { id: 'total', label: 'Anúncios', limite: 500 },
  { id: 'super_destaque', label: 'Super Destaque', limite: 40 },
  { id: 'triple', label: 'Destaque Triplo', limite: 360 },
  { id: 'simples', label: 'Sem Destaque', limite: 56 },
  { id: 'premiere_premium', label: 'Destaque Exclusivo', limite: 4 },
  { id: 'destaque', label: 'Destaque', limite: 40 },
] as const;
type Campo = typeof CAMPOS[number]['id'];
type Limites = Record<Campo, number>;
const PADRAO = Object.fromEntries(CAMPOS.map((c) => [c.id, c.limite])) as Limites;
const CONFIG_KEY = 'zap_pacote_limites_json';

export function ZapPacote({ total, porTipo, carregando }: { total: number; porTipo: Partial<Record<TipoAnuncio, number>>; carregando: boolean }) {
  const { toast } = useToast();
  const [limites, setLimites] = useState<Limites>(PADRAO);
  const [rascunho, setRascunho] = useState<Limites>(PADRAO);
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let ativo = true;
    async function load() {
      try {
        const { data, error } = await supabase.from('app_config').select('value').eq('key', CONFIG_KEY).maybeSingle();
        if (error) throw error;
        const raw = data ? JSON.parse(data.value) : PADRAO;
        const next = { ...PADRAO };
        for (const c of CAMPOS) {
          if (Number.isSafeInteger(raw[c.id]) && raw[c.id] >= 0) next[c.id] = raw[c.id];
        }
        if (ativo) { setLimites(next); setRascunho(next); setPronto(true); }
      } catch {
        if (ativo) { setErro(true); setPronto(true); }
      }
    }
    void load();
    return () => { ativo = false; };
  }, []);

  async function salvar() {
    if (CAMPOS.some((c) => !Number.isSafeInteger(rascunho[c.id]) || rascunho[c.id] < 0)) {
      toast({ title: 'Informe limites inteiros iguais ou maiores que zero', variant: 'destructive' });
      return;
    }
    setSalvando(true);
    const { error } = await supabase.from('app_config').upsert({ key: CONFIG_KEY, value: JSON.stringify(rascunho) }, { onConflict: 'key' });
    setSalvando(false);
    if (error) { toast({ title: 'Não foi possível salvar os limites', variant: 'destructive' }); return; }
    setLimites({ ...rascunho }); setEditando(false); setErro(false);
    toast({ title: 'Limites do pacote salvos' });
  }

  return (
    <section className="border-y py-4 space-y-4" aria-labelledby="zap-pacote-titulo">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="zap-pacote-titulo" className="font-semibold">Pacote Zap + VivaReal</h2>
          <p className="text-xs text-muted-foreground">Selecionados no CRM · publicação confirmada no painel do Zap</p>
        </div>
        {editando ? <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={salvando} onClick={() => setEditando(false)}><X className="h-4 w-4" /> Cancelar</Button>
          <Button size="sm" disabled={salvando} onClick={salvar}><Save className="h-4 w-4" /> {salvando ? 'Salvando…' : 'Salvar limites'}</Button>
        </div> : <Button size="sm" variant="outline" disabled={!pronto} onClick={() => { setRascunho({ ...limites }); setEditando(true); }}><Pencil className="h-4 w-4" /> Editar limites</Button>}
      </div>
      {erro && <p role="alert" className="text-sm text-destructive">Não foi possível carregar os limites salvos; exibindo os valores iniciais.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {CAMPOS.map((c) => {
          const uso = c.id === 'total' ? total : porTipo[c.id] ?? 0;
          const limite = limites[c.id];
          const excedeu = uso > limite;
          const atingiu = uso > 0 && uso === limite;
          return <div key={c.id} className="min-w-0 space-y-2">
            <div className="flex flex-wrap justify-between gap-1 text-sm"><span>{c.label}</span><span className={excedeu ? 'text-destructive font-medium' : 'text-muted-foreground'}>{carregando || !pronto ? '…' : `${uso} de ${limite}`}</span></div>
            <meter aria-label={`Consumo ${c.label}`} min={0} max={Math.max(limite, 1)} value={Math.min(uso, Math.max(limite, 1))} className="w-full h-3 accent-primary" />
            {editando && <Input aria-label={`Limite ${c.label}`} type="number" min={0} step={1} value={Number.isNaN(rascunho[c.id]) ? '' : rascunho[c.id]} onChange={(e) => setRascunho((prev) => ({ ...prev, [c.id]: e.target.value === '' ? NaN : Number(e.target.value) }))} />}
            {!carregando && pronto && (excedeu || atingiu) && <p className={`text-xs flex items-center gap-1 ${excedeu ? 'text-destructive' : 'text-muted-foreground'}`}><AlertCircle className="h-3 w-3 shrink-0" />{excedeu ? `${uso - limite} acima do limite` : 'Limite atingido'}</p>}
          </div>;
        })}
      </div>
      {!!porTipo.premiere_especial && <p className="text-xs text-muted-foreground">Premiere especial (legado): {porTipo.premiere_especial} · incluídos no total</p>}
    </section>
  );
}