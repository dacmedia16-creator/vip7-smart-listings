import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, User } from 'lucide-react';
import { addVinculo } from '../lib/clientes';
import { toast } from 'sonner';

type ClienteRow = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
};

export function AddInteressadoDialog({ imovelId, onAdded }: { imovelId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<ClienteRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      const s = q.trim().replace(/%/g, '');
      let query = supabase
        .from('clientes')
        .select('id, nome, telefone, email, cidade')
        .eq('ativo', true)
        .order('updated_at', { ascending: false })
        .limit(30);
      if (s) query = query.or(`nome.ilike.%${s}%,email.ilike.%${s}%,telefone.ilike.%${s}%`);
      const { data } = await query;
      setResults((data || []) as ClienteRow[]);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q, open]);

  const handlePick = async (clienteId: string) => {
    try {
      await addVinculo(clienteId, imovelId, 'interessado');
      toast.success('Interessado adicionado');
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
        <Button variant="outline" size="sm" className="w-full"><Plus className="h-4 w-4 mr-1" /> Adicionar interessado</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Adicionar interessado</DialogTitle></DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, telefone ou e-mail" className="pl-9" autoFocus />
        </div>
        <div className="max-h-80 overflow-y-auto -mx-2">
          {loading && <div className="text-sm text-muted-foreground p-3">Buscando...</div>}
          {!loading && results.length === 0 && <div className="text-sm text-muted-foreground p-3">Nenhum cliente encontrado.</div>}
          {results.map((r) => (
            <button key={r.id} onClick={() => handlePick(r.id)} className="w-full text-left px-3 py-2 hover:bg-muted rounded flex items-start gap-2">
              <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="font-medium truncate">{r.nome}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {[r.telefone, r.email, r.cidade].filter(Boolean).join(' · ')}
                </div>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
