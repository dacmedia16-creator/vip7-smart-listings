import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Building2 } from 'lucide-react';
import { addVinculo } from '../lib/clientes';
import { toast } from 'sonner';

type ImovelRow = {
  id: string;
  titulo: string;
  codigo_imoview: number | null;
  cidade: string | null;
  bairro: string | null;
};

export function AddImovelInteresseDialog({ clienteId, onAdded }: { clienteId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<ImovelRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      const s = q.trim();
      let query = supabase
        .from('imoveis_proprios')
        .select('id, titulo, codigo_imoview, cidade, bairro')
        .eq('ativo', true)
        .order('updated_at', { ascending: false })
        .limit(30);
      if (s) {
        const asNum = Number(s);
        if (Number.isInteger(asNum) && asNum > 0) {
          query = query.eq('codigo_imoview', asNum);
        } else {
          query = query.or(`titulo.ilike.%${s}%,bairro.ilike.%${s}%,cidade.ilike.%${s}%`);
        }
      }
      const { data } = await query;
      setResults((data || []) as ImovelRow[]);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q, open]);

  const handlePick = async (imovelId: string) => {
    try {
      await addVinculo(clienteId, imovelId, 'interessado');
      toast.success('Imóvel adicionado como interesse');
      setOpen(false);
      setQ('');
      onAdded();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> Adicionar imóvel de interesse</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Adicionar imóvel de interesse</DialogTitle></DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por código, título, bairro ou cidade" className="pl-9" autoFocus />
        </div>
        <div className="max-h-80 overflow-y-auto -mx-2">
          {loading && <div className="text-sm text-muted-foreground p-3">Buscando...</div>}
          {!loading && results.length === 0 && <div className="text-sm text-muted-foreground p-3">Nenhum imóvel encontrado.</div>}
          {results.map((r) => (
            <button key={r.id} onClick={() => handlePick(r.id)} className="w-full text-left px-3 py-2 hover:bg-muted rounded flex items-start gap-2">
              <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="font-medium truncate">{r.titulo}</div>
                <div className="text-xs text-muted-foreground">
                  {r.codigo_imoview && `#${r.codigo_imoview} · `}
                  {[r.bairro, r.cidade].filter(Boolean).join(' · ')}
                </div>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
