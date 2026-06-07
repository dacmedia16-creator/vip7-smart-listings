import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Users, Plus, X, Phone, Mail, Search, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  listClientes, listVinculosByImovel, addVinculo, removeVinculo, upsertCliente,
  type Cliente,
} from '../lib/clientes';

type PendingVinculo = { cliente: Cliente; percentual: number | null };
type ExistingVinculo = {
  id: string;
  papel: string;
  percentual: number | null;
  clientes: { id: string; nome: string; email: string | null; telefone: string | null } | null;
};

interface Props {
  /** Quando informado, opera direto no banco (modo edição). Quando null, mantém em memória (modo criação). */
  imovelId: string | null;
  /** Em modo criação, expõe os vínculos pendentes para o pai persistir após criar o imóvel. */
  onPendingChange?: (pending: PendingVinculo[]) => void;
}

function waLink(tel: string) {
  const digits = tel.replace(/\D/g, '');
  const withDDI = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${withDDI}`;
}

export function ProprietariosSection({ imovelId, onPendingChange }: Props) {
  const { toast } = useToast();
  const [existing, setExisting] = useState<ExistingVinculo[]>([]);
  const [pending, setPending] = useState<PendingVinculo[]>([]);
  const [loading, setLoading] = useState(!!imovelId);
  const [open, setOpen] = useState(false);

  const refresh = async () => {
    if (!imovelId) return;
    setLoading(true);
    try {
      const data = await listVinculosByImovel(imovelId);
      setExisting((data as unknown as ExistingVinculo[]).filter((v) => v.papel === 'proprietario'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [imovelId]);

  useEffect(() => { onPendingChange?.(pending); /* eslint-disable-next-line */ }, [pending]);

  const handleAddExisting = async (cliente: Cliente, percentual: number | null) => {
    if (imovelId) {
      try {
        await addVinculo(cliente.id, imovelId, 'proprietario', percentual ?? undefined);
        toast({ title: 'Proprietário vinculado' });
        setOpen(false);
        refresh();
      } catch (e) {
        toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' });
      }
    } else {
      if (pending.some((p) => p.cliente.id === cliente.id)) {
        toast({ title: 'Já adicionado', variant: 'destructive' });
        return;
      }
      setPending((p) => [...p, { cliente, percentual }]);
      setOpen(false);
    }
  };

  const handleRemoveExisting = async (id: string) => {
    if (!confirm('Remover este proprietário do imóvel?')) return;
    try { await removeVinculo(id); refresh(); } catch (e) { toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' }); }
  };

  const handleRemovePending = (clienteId: string) => setPending((p) => p.filter((x) => x.cliente.id !== clienteId));

  const rows = imovelId
    ? existing.map((v) => v.clientes && {
        id: v.id, removable: true, nome: v.clientes.nome, email: v.clientes.email, telefone: v.clientes.telefone, percentual: v.percentual,
      })
    : pending.map((p) => ({
        id: p.cliente.id, removable: true, nome: p.cliente.nome, email: p.cliente.email, telefone: p.cliente.telefone, percentual: p.percentual,
      }));

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Proprietários</h2>
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar proprietário
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum proprietário vinculado.</p>
      ) : (
        <div className="space-y-2">
          {rows.filter(Boolean).map((r) => r && (
            <div key={r.id} className="flex items-center justify-between gap-3 border border-[#F0E9D6] rounded p-3 bg-white">
              <div className="min-w-0">
                <div className="font-medium text-[#0F0F12] truncate">{r.nome}</div>
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-[#4A4A52]">
                  {r.telefone && (
                    <a href={waLink(r.telefone)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[#25D366]">
                      <Phone className="h-3 w-3" /> {r.telefone}
                    </a>
                  )}
                  {r.email && (
                    <a href={`mailto:${r.email}`} className="flex items-center gap-1 hover:text-primary">
                      <Mail className="h-3 w-3" /> {r.email}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {r.percentual != null && <Badge variant="outline">{r.percentual}%</Badge>}
                {r.removable && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => imovelId ? handleRemoveExisting(r.id) : handleRemovePending(r.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddProprietarioDialog open={open} onOpenChange={setOpen} onPick={handleAddExisting} />
    </Card>
  );
}

function AddProprietarioDialog({ open, onOpenChange, onPick }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (cliente: Cliente, percentual: number | null) => void;
}) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Cliente[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Cliente | null>(null);
  const [percentual, setPercentual] = useState('');
  const [creating, setCreating] = useState(false);
  const [newForm, setNewForm] = useState({ nome: '', telefone: '', email: '', cpf_cnpj: '' });

  useEffect(() => {
    if (!open) { setSearch(''); setResults([]); setPicked(null); setPercentual(''); setCreating(false); setNewForm({ nome: '', telefone: '', email: '', cpf_cnpj: '' }); }
  }, [open]);

  useEffect(() => {
    if (!open || creating || !search.trim() || search.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try { setResults(await listClientes({ search })); } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [search, open, creating]);

  const submitNew = async () => {
    if (!newForm.nome.trim()) return toast({ title: 'Nome obrigatório', variant: 'destructive' });
    try {
      const cli = await upsertCliente({
        nome: newForm.nome.trim(),
        telefone: newForm.telefone.trim() || null,
        email: newForm.email.trim() || null,
        cpf_cnpj: newForm.cpf_cnpj.trim() || null,
        categorias: ['proprietario'],
        origem: 'manual',
      });
      onPick(cli, percentual ? Number(percentual) : null);
    } catch (e) { toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' }); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar proprietário</DialogTitle>
          <DialogDescription>Vincule um cliente existente ou crie um novo.</DialogDescription>
        </DialogHeader>

        {!creating ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por nome, telefone, CPF ou e-mail" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="max-h-72 overflow-auto border border-[#F0E9D6] rounded">
              {searching ? (
                <div className="p-3 text-sm text-muted-foreground">Buscando...</div>
              ) : results.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">{search.trim().length < 2 ? 'Digite ao menos 2 letras' : 'Nenhum cliente encontrado'}</div>
              ) : (
                results.map((c) => (
                  <button key={c.id} type="button" onClick={() => setPicked(c)}
                    className={`w-full text-left p-2 border-b border-[#F0E9D6] last:border-0 hover:bg-[#FBF3DC] ${picked?.id === c.id ? 'bg-[#FBF3DC]' : ''}`}>
                    <div className="font-medium text-sm">{c.nome}</div>
                    <div className="text-xs text-muted-foreground">{c.telefone || c.email || c.cpf_cnpj || '—'}</div>
                  </button>
                ))
              )}
            </div>
            {picked && (
              <div className="space-y-2 pt-2 border-t">
                <Label>Selecionado: <strong>{picked.nome}</strong></Label>
                <div>
                  <Label className="text-xs">Percentual (opcional)</Label>
                  <Input type="number" min={0} max={100} step="0.01" placeholder="ex: 50"
                    value={percentual} onChange={(e) => setPercentual(e.target.value)} />
                </div>
              </div>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(true)} className="w-full">
              <UserPlus className="h-4 w-4 mr-1" /> Criar novo cliente
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={newForm.nome} onChange={(e) => setNewForm({ ...newForm, nome: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Telefone</Label><Input value={newForm.telefone} onChange={(e) => setNewForm({ ...newForm, telefone: e.target.value })} /></div>
              <div><Label>CPF/CNPJ</Label><Input value={newForm.cpf_cnpj} onChange={(e) => setNewForm({ ...newForm, cpf_cnpj: e.target.value })} /></div>
            </div>
            <div><Label>E-mail</Label><Input type="email" value={newForm.email} onChange={(e) => setNewForm({ ...newForm, email: e.target.value })} /></div>
            <div><Label className="text-xs">Percentual (opcional)</Label>
              <Input type="number" min={0} max={100} step="0.01" value={percentual} onChange={(e) => setPercentual(e.target.value)} />
            </div>
            <Button type="button" variant="link" onClick={() => setCreating(false)} className="px-0">← Voltar para busca</Button>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {creating ? (
            <Button type="button" onClick={submitNew}>Criar e vincular</Button>
          ) : (
            <Button type="button" disabled={!picked} onClick={() => picked && onPick(picked, percentual ? Number(percentual) : null)}>Vincular</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
