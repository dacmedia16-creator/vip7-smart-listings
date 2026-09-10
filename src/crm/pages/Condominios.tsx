import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CrmLayout } from '@/crm/components/CrmLayout';
import { useRoles } from '@/crm/hooks/useRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { RefreshCw, Search, Building, ExternalLink, Plus, Loader2, Pencil, Trash2, Upload, X, Star } from 'lucide-react';
import { toast } from 'sonner';

interface CondoRow {
  codigo: number;
  nome: string;
  cidade: string | null;
  updated_at: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  estado: string | null;
  fotos: string[] | null;
}

interface FormState {
  nome: string;
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
}

const emptyForm: FormState = { nome: '', cep: '', endereco: '', numero: '', bairro: '', cidade: '', estado: '' };

const BUCKET = 'imoveis-fotos';

function storagePathFromUrl(url: string): string | null {
  const m = url.match(/\/imoveis-fotos\/(.+?)(\?|$)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function enderecoResumo(c: CondoRow) {
  const parts = [
    [c.endereco, c.numero].filter(Boolean).join(', '),
    c.bairro,
    c.cep,
  ].filter(Boolean);
  return parts.join(' · ');
}

export default function Condominios() {
  const { roles } = useRoles();
  const isAdmin = roles.includes('admin') || roles.includes('gestor');
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [cidade, setCidade] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CondoRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [cepLoading, setCepLoading] = useState(false);
  const [toDelete, setToDelete] = useState<CondoRow | null>(null);
  const [fotos, setFotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [capaUploading, setCapaUploading] = useState<number | null>(null);
  const PAGE_SIZE = 30;

  useEffect(() => { setPage(1); }, [search, cidade]);

  const { data: condos = [], isLoading } = useQuery({
    queryKey: ['condominios-cache'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('condominios_cache')
        .select('codigo, nome, cidade, updated_at, cep, endereco, numero, bairro, estado, fotos')
        .order('nome');
      if (error) throw error;
      return (data ?? []) as CondoRow[];
    },
  });

  const { data: counts = {} } = useQuery({
    queryKey: ['condominios-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('imoveis_proprios')
        .select('codigo_condominio_imoview')
        .not('codigo_condominio_imoview', 'is', null)
        .eq('ativo', true);
      if (error) throw error;
      const m: Record<number, number> = {};
      for (const r of data ?? []) {
        const k = (r as { codigo_condominio_imoview: number }).codigo_condominio_imoview;
        m[k] = (m[k] ?? 0) + 1;
      }
      return m;
    },
  });

  const cidades = useMemo(() => {
    const s = new Set<string>();
    condos.forEach((c) => c.cidade && s.add(c.cidade));
    return Array.from(s).sort();
  }, [condos]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return condos.filter((c) => {
      if (cidade !== 'all' && c.cidade !== cidade) return false;
      if (q && !c.nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [condos, search, cidade]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const lastSync = useMemo(() => {
    const ds = condos.map((c) => c.updated_at).filter(Boolean) as string[];
    if (!ds.length) return null;
    return new Date(Math.max(...ds.map((d) => new Date(d).getTime())));
  }, [condos]);

  const sync = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-condominios');
      if (error) throw error;
      return data;
    },
    onSuccess: (d: { totalCondominios?: number }) => {
      toast.success(`Sincronizado: ${d?.totalCondominios ?? 0} condomínios`);
      qc.invalidateQueries({ queryKey: ['condominios-cache'] });
      qc.invalidateQueries({ queryKey: ['condominios-counts'] });
    },
    onError: (e: Error) => toast.error(`Falha: ${e.message}`),
  });

  const buscarCep = async (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cep-lookup', { body: { cep: digits } });
      if (error) throw error;
      const d = data as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
      if (d?.erro) {
        toast.error('CEP não encontrado');
        return;
      }
      setForm((f) => ({
        ...f,
        endereco: d.logradouro || f.endereco,
        bairro: d.bairro || f.bairro,
        cidade: d.localidade || f.cidade,
        estado: d.uf || f.estado,
      }));
    } catch {
      toast.error('Não foi possível consultar o CEP');
    } finally {
      setCepLoading(false);
    }
  };

  const openNovo = () => {
    setEditing(null);
    setForm(emptyForm);
    setFotos([]);
    setDialogOpen(true);
  };

  const openEdit = (c: CondoRow) => {
    setEditing(c);
    setForm({
      nome: c.nome ?? '',
      cep: c.cep ?? '',
      endereco: c.endereco ?? '',
      numero: c.numero ?? '',
      bairro: c.bairro ?? '',
      cidade: c.cidade ?? '',
      estado: c.estado ?? '',
    });
    setFotos(c.fotos ?? []);
    setDialogOpen(true);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const novas: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `condominios/${editing?.codigo ?? 'novo'}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type || `image/${ext}`, upsert: false });
        if (error) {
          console.error('[condominio upload]', file.name, error);
          toast.error(`Falha ao enviar ${file.name}`);
          continue;
        }
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        novas.push(data.publicUrl);
      }
      if (novas.length) {
        setFotos((f) => [...f, ...novas]);
        toast.success(`${novas.length} foto(s) enviada(s)`);
      }
    } finally {
      setUploading(false);
    }
  };

  const removerFoto = async (url: string) => {
    setFotos((f) => f.filter((u) => u !== url));
    const path = storagePathFromUrl(url);
    if (path) await supabase.storage.from(BUCKET).remove([path]);
  };

  const definirCapa = (url: string) => {
    setFotos((f) => [url, ...f.filter((u) => u !== url)]);
  };

  const uploadCapa = async (c: CondoRow, file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem');
      return;
    }
    setCapaUploading(c.codigo);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `condominios/${c.codigo}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type || `image/${ext}`, upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const url = data.publicUrl;
      const novas = [url, ...(c.fotos ?? []).filter((u) => u !== url)];
      const { error } = await supabase
        .from('condominios_cache')
        .update({ fotos: novas })
        .eq('codigo', c.codigo);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['condominios-cache'] });
      toast.success('Foto de capa atualizada');
    } catch (e) {
      console.error('[condominio capa]', e);
      toast.error(`Falha ao enviar a capa: ${(e as Error).message}`);
    } finally {
      setCapaUploading(null);
    }
  };

  const salvar = useMutation({
    mutationFn: async () => {
      const nome = form.nome.trim();
      if (!nome) throw new Error('Informe o nome do condomínio');
      const payload = {
        nome,
        cep: form.cep.trim() || null,
        endereco: form.endereco.trim() || null,
        numero: form.numero.trim() || null,
        bairro: form.bairro.trim() || null,
        cidade: form.cidade.trim() || null,
        estado: form.estado.trim() || null,
        fotos,
      };

      if (editing) {
        const { error } = await supabase
          .from('condominios_cache')
          .update(payload)
          .eq('codigo', editing.codigo);
        if (error) throw error;
        return;
      }

      // Código negativo para não colidir com códigos do Imoview
      const { data: minRow } = await supabase
        .from('condominios_cache')
        .select('codigo')
        .lt('codigo', 0)
        .order('codigo')
        .limit(1)
        .maybeSingle();
      const codigo = Math.min(0, minRow?.codigo ?? 0) - 1;
      const { error } = await supabase.from('condominios_cache').insert({ codigo, ...payload });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editing ? 'Condomínio atualizado' : 'Condomínio cadastrado');
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setFotos([]);
      qc.invalidateQueries({ queryKey: ['condominios-cache'] });
    },
    onError: (e: Error) => toast.error(`Falha ao salvar: ${e.message}`),
  });

  const excluir = useMutation({
    mutationFn: async (c: CondoRow) => {
      const { count, error: cErr } = await supabase
        .from('imoveis_proprios')
        .select('id', { count: 'exact', head: true })
        .eq('codigo_condominio_imoview', c.codigo);
      if (cErr) throw cErr;
      if ((count ?? 0) > 0) {
        throw new Error(`Este condomínio tem ${count} imóveis vinculados. Desvincule antes de excluir.`);
      }
      const { error } = await supabase.from('condominios_cache').delete().eq('codigo', c.codigo);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Condomínio excluído');
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ['condominios-cache'] });
      qc.invalidateQueries({ queryKey: ['condominios-counts'] });
    },
    onError: (e: Error) => {
      setToDelete(null);
      toast.error(e.message);
    },
  });

  const totalImoveis = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <CrmLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-[#0F0F12] flex items-center gap-2">
              <Building className="h-6 w-6 text-[#C9A24C]" /> Condomínios
            </h1>
            <p className="text-sm text-[#4A4A52] mt-1">
              {condos.length} condomínios • {totalImoveis} imóveis vinculados
              {lastSync && ` • Última sincronização: ${lastSync.toLocaleString('pt-BR')}`}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={openNovo} variant="outline" className="border-[#C9A24C] text-[#7A5A14] hover:bg-[#FBF3DC]">
              <Plus className="h-4 w-4 mr-2" /> Novo condomínio
            </Button>
            {isAdmin && (
              <Button onClick={() => sync.mutate()} disabled={sync.isPending} className="bg-[#C9A24C] hover:bg-[#B8923C] text-[#0F0F12]">
                <RefreshCw className={`h-4 w-4 mr-2 ${sync.isPending ? 'animate-spin' : ''}`} />
                {sync.isPending ? 'Sincronizando…' : 'Sincronizar do Imoview'}
              </Button>
            )}
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar condomínio' : 'Novo condomínio'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="cond-nome">Nome *</Label>
                <Input id="cond-nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Residencial Parque das Flores" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="cond-cep">CEP</Label>
                  <div className="relative">
                    <Input
                      id="cond-cep"
                      value={form.cep}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm((f) => ({ ...f, cep: v }));
                        if (v.replace(/\D/g, '').length === 8) buscarCep(v);
                      }}
                      onBlur={(e) => buscarCep(e.target.value)}
                      placeholder="00000-000"
                      inputMode="numeric"
                    />
                    {cepLoading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cond-numero">Número</Label>
                  <Input id="cond-numero" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="Ex.: 250" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cond-endereco">Endereço</Label>
                <Input id="cond-endereco" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} placeholder="Rua / Avenida" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="cond-bairro">Bairro</Label>
                  <Input id="cond-bairro" value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cond-estado">Estado</Label>
                  <Input id="cond-estado" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase().slice(0, 2) })} placeholder="SP" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cond-cidade">Cidade</Label>
                <Input id="cond-cidade" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} placeholder="Ex.: Sorocaba" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Fotos</Label>
                  <label className="inline-flex items-center gap-2 text-sm text-[#7A5A14] cursor-pointer hover:text-[#C9A24C]">
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Enviando…' : 'Adicionar fotos'}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => { handleUpload(e.target.files); e.target.value = ''; }}
                    />
                  </label>
                </div>
                {fotos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma foto. A primeira foto será a capa.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {fotos.map((url, i) => (
                      <div key={url} className="relative group rounded-md overflow-hidden border border-[#E8E4D9]">
                        <img src={url} alt={`Foto ${i + 1} do condomínio`} loading="lazy" className="h-24 w-full object-cover" />
                        {i === 0 && (
                          <span className="absolute bottom-1 left-1 rounded bg-[#C9A24C] px-1.5 py-0.5 text-[10px] font-medium text-[#0F0F12]">Capa</span>
                        )}
                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {i !== 0 && (
                            <button type="button" title="Definir como capa" onClick={() => definirCapa(url)} className="rounded bg-black/60 p-1 text-white hover:bg-black/80">
                              <Star className="h-3 w-3" />
                            </button>
                          )}
                          <button type="button" title="Remover" onClick={() => removerFoto(url)} className="rounded bg-black/60 p-1 text-white hover:bg-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={() => salvar.mutate()} disabled={salvar.isPending} className="bg-[#C9A24C] hover:bg-[#B8923C] text-[#0F0F12]">
                {salvar.isPending ? 'Salvando…' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!toDelete} onOpenChange={(o) => { if (!o) setToDelete(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir condomínio</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir <strong>{toDelete?.nome}</strong>? Esta ação não pode ser desfeita.
                Condomínios vindos do Imoview podem reaparecer na próxima sincronização.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); if (toDelete) excluir.mutate(toDelete); }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {excluir.isPending ? 'Excluindo…' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Card className="p-4 bg-white border-[#E8E4D9]">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#4A4A52]" />
              <Input
                placeholder="Buscar condomínio..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white border-[#E8E4D9] text-[#0F0F12] placeholder:text-[#4A4A52]"
              />
            </div>
            <Select value={cidade} onValueChange={setCidade}>
              <SelectTrigger className="w-[220px] bg-white border-[#E8E4D9] text-[#0F0F12]">
                <SelectValue placeholder="Cidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as cidades</SelectItem>
                {cidades.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card className="bg-white border-[#E8E4D9] overflow-hidden">
          <Table>
            <TableHeader className="bg-[#FAF8F3]">
              <TableRow className="border-b border-[#E8E4D9] hover:bg-transparent">
                <TableHead className="text-[#4A4A52]">Nome</TableHead>
                <TableHead className="text-[#4A4A52]">Cidade</TableHead>
                <TableHead className="text-right text-[#4A4A52]">Imóveis</TableHead>
                <TableHead className="text-[#4A4A52]">Código Imoview</TableHead>
                <TableHead className="w-[140px] text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-[#4A4A52]">Carregando…</TableCell></TableRow>
              ) : pageItems.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-[#4A4A52]">Nenhum condomínio encontrado</TableCell></TableRow>
              ) : pageItems.map((c) => {
                const n = counts[c.codigo] ?? 0;
                const end = enderecoResumo(c);
                return (
                  <TableRow key={c.codigo} className="border-b border-[#E8E4D9] hover:bg-[#FAF8F3]">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <label
                          title={c.fotos?.[0] ? 'Trocar capa' : 'Adicionar capa'}
                          className="group relative h-14 w-[72px] shrink-0 cursor-pointer overflow-hidden rounded-md border border-[#E8E4D9] bg-[#FAF8F3] block"
                        >
                          {c.fotos?.[0] ? (
                            <img src={c.fotos[0]} alt={`Foto de capa do condomínio ${c.nome}`} loading="lazy" className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center">
                              <Building className="h-5 w-5 text-[#C9A24C]" />
                            </span>
                          )}
                          <span className="absolute inset-0 hidden items-center justify-center bg-black/55 text-[10px] font-medium text-white group-hover:flex">
                            {c.fotos?.[0] ? 'Trocar capa' : 'Adicionar capa'}
                          </span>
                          {capaUploading === c.codigo && (
                            <span className="absolute inset-0 flex items-center justify-center bg-black/60">
                              <Loader2 className="h-4 w-4 animate-spin text-white" />
                            </span>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={capaUploading !== null}
                            onChange={(e) => { uploadCapa(c, e.target.files?.[0]); e.target.value = ''; }}
                          />
                        </label>
                        <div>
                          <Link to={`/crm/condominios/${c.codigo}`} className="text-[#0F0F12] hover:text-[#7A5A14]">{c.nome}</Link>
                          {end && <div className="text-xs text-[#4A4A52] font-normal mt-0.5">{end}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-[#4A4A52]">{c.cidade ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={n > 0 ? 'default' : 'secondary'} className={n > 0 ? 'bg-[#FBF3DC] text-[#7A5A14] hover:bg-[#FBF3DC]' : ''}>
                        {n}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#4A4A52] text-sm">{c.codigo}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/crm/condominios/${c.codigo}`} className="inline-flex items-center p-2 text-[#7A5A14] hover:text-[#C9A24C]" title="Abrir">
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-[#4A4A52] hover:text-[#0F0F12]" title="Editar" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Excluir"
                            onClick={() => setToDelete(c)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#4A4A52]">Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
            </div>
          </div>
        )}
      </div>
    </CrmLayout>
  );
}
