import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Building, Loader2, Star, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

const BUCKET = 'imoveis-fotos';
const MAX_MB = 10;

export interface CondominioFotosTarget {
  codigo: number;
  nome: string;
  fotos: string[] | null;
}

function storagePathFromUrl(url: string): string | null {
  const m = url.match(/\/imoveis-fotos\/(.+?)(\?|$)/);
  return m ? decodeURIComponent(m[1]) : null;
}

interface Props {
  condo: CondominioFotosTarget | null;
  onOpenChange: (open: boolean) => void;
  canDelete: boolean;
}

export function CondominioFotosDialog({ condo, onOpenChange, canDelete }: Props) {
  const qc = useQueryClient();
  const [fotos, setFotos] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    setFotos(condo?.fotos ?? []);
    setSelected([]);
    setPreview(null);
  }, [condo?.codigo, condo?.fotos]);

  if (!condo) return null;

  const persist = async (novas: string[]) => {
    setSaving(true);
    const anterior = fotos;
    setFotos(novas);
    const { error } = await supabase
      .from('condominios_cache')
      .update({ fotos: novas })
      .eq('codigo', condo.codigo);
    setSaving(false);
    if (error) {
      setFotos(anterior);
      toast.error(`Não foi possível salvar: ${error.message}`);
      return false;
    }
    qc.invalidateQueries({ queryKey: ['condominios-cache'] });
    return true;
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    const invalidos = list.filter((f) => !f.type.startsWith('image/'));
    const grandes = list.filter((f) => f.size > MAX_MB * 1024 * 1024);
    const validos = list.filter((f) => f.type.startsWith('image/') && f.size <= MAX_MB * 1024 * 1024);
    if (invalidos.length) toast.error(`${invalidos.length} arquivo(s) ignorado(s): não são imagens`);
    if (grandes.length) toast.error(`${grandes.length} arquivo(s) acima de ${MAX_MB}MB foram ignorados`);
    if (!validos.length) return;

    setUploading(true);
    setProgress(0);
    const urls: string[] = [];
    let done = 0;
    const CONCURRENCY = 4;

    const enviar = async (file: File) => {
      try {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `condominios/${condo.codigo}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type || `image/${ext}`, upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        urls.push(data.publicUrl);
      } catch (e) {
        console.error('[condominio fotos upload]', file.name, e);
      } finally {
        done += 1;
        setProgress(Math.round((done / validos.length) * 100));
      }
    };

    for (let i = 0; i < validos.length; i += CONCURRENCY) {
      await Promise.all(validos.slice(i, i + CONCURRENCY).map(enviar));
    }

    setUploading(false);
    if (urls.length === 0) {
      toast.error('Falha ao enviar as fotos');
      return;
    }
    const ok = await persist([...fotos, ...urls]);
    if (ok) toast.success(`${urls.length} foto(s) adicionada(s)`);
  };

  const definirCapa = async (url: string) => {
    const ok = await persist([url, ...fotos.filter((u) => u !== url)]);
    if (ok) toast.success('Capa atualizada');
  };

  const reordenar = async (from: number, to: number) => {
    if (from === to) return;
    const novas = [...fotos];
    const [item] = novas.splice(from, 1);
    novas.splice(to, 0, item);
    await persist(novas);
  };

  const excluir = async (urls: string[]) => {
    const paths = urls.map(storagePathFromUrl).filter(Boolean) as string[];
    if (paths.length) {
      const { error } = await supabase.storage.from(BUCKET).remove(paths);
      if (error) {
        toast.error(`Não foi possível apagar os arquivos: ${error.message}`);
        return;
      }
    }
    const ok = await persist(fotos.filter((u) => !urls.includes(u)));
    if (ok) {
      setSelected((s) => s.filter((u) => !urls.includes(u)));
      toast.success(urls.length > 1 ? `${urls.length} fotos excluídas` : 'Foto excluída');
    }
  };

  const toggleSelect = (url: string) => {
    setSelected((s) => (s.includes(url) ? s.filter((u) => u !== url) : [...s, url]));
  };

  return (
    <>
      <Dialog open={!!condo} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-[#C9A24C]" />
              Fotos · {condo.nome}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8E4D9] pb-3">
            <div className="text-sm text-[#4A4A52]">
              {fotos.length} foto{fotos.length === 1 ? '' : 's'}
              {selected.length > 0 && ` · ${selected.length} selecionada(s)`}
              {saving && <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin" />}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canDelete && selected.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/40 hover:bg-destructive/10"
                  onClick={() => setConfirmDelete(selected)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir selecionadas
                </Button>
              )}
              {selected.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setSelected([])}>Limpar seleção</Button>
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#C9A24C] px-3 py-2 text-sm font-medium text-[#0F0F12] hover:bg-[#B8923C]">
                <Upload className="h-4 w-4" />
                {uploading ? 'Enviando…' : 'Enviar fotos'}
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
          </div>

          {uploading && <Progress value={progress} className="h-2" />}

          {fotos.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#4A4A52]">
              Nenhuma foto ainda. Envie as primeiras — a primeira da lista vira a capa.
            </p>
          ) : (
            <>
              <p className="text-xs text-[#7A7A80]">Arraste as miniaturas para mudar a ordem. A primeira é a capa.</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {fotos.map((url, i) => (
                  <div
                    key={url}
                    draggable
                    onDragStart={() => setDragIndex(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); if (dragIndex !== null) reordenar(dragIndex, i); setDragIndex(null); }}
                    onDragEnd={() => setDragIndex(null)}
                    className={`group relative aspect-[4/3] cursor-move overflow-hidden rounded-md border border-[#E8E4D9] bg-[#FAF8F3] ${dragIndex === i ? 'opacity-40' : ''}`}
                  >
                    <img
                      src={url}
                      alt={`Foto ${i + 1} do condomínio ${condo.nome}`}
                      loading="lazy"
                      onClick={() => setPreview(url)}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute left-1 top-1">
                      <Checkbox
                        checked={selected.includes(url)}
                        onCheckedChange={() => toggleSelect(url)}
                        aria-label="Selecionar foto"
                        className="bg-white/90 border-white"
                      />
                    </div>
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 rounded bg-[#C9A24C] px-1.5 py-0.5 text-[10px] font-medium text-[#0F0F12]">Capa</span>
                    )}
                    <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {i !== 0 && (
                        <button type="button" title="Definir como capa" onClick={() => definirCapa(url)} className="rounded bg-black/60 p-1 text-white hover:bg-black/80">
                          <Star className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button type="button" title="Excluir foto" onClick={() => setConfirmDelete([url])} className="rounded bg-black/60 p-1 text-white hover:bg-destructive">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(o) => { if (!o) setPreview(null); }}>
        <DialogContent className="max-w-3xl p-2">
          <DialogHeader className="sr-only"><DialogTitle>Foto do condomínio</DialogTitle></DialogHeader>
          {preview && <img src={preview} alt={`Foto ampliada do condomínio ${condo.nome}`} className="max-h-[80vh] w-full object-contain" />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {confirmDelete && confirmDelete.length > 1 ? `${confirmDelete.length} fotos` : 'foto'}</AlertDialogTitle>
            <AlertDialogDescription>
              A foto é apagada de vez do armazenamento e não pode ser recuperada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); const urls = confirmDelete ?? []; setConfirmDelete(null); excluir(urls); }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
