import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Upload, X, Trash2, EyeOff, Eye, ChevronLeft, ChevronRight, Check, Loader2, CloudOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CrmLayout } from '../components/CrmLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useAuth } from '../hooks/useAuth';
import { useRoles } from '../hooks/useRole';
import {
  IMOVEL_STATUS, TIPO_IMOVEL, FINALIDADE, DESTINACAO, TIPO_VAGA,
  POSICAO_IMOVEL, TIPO_MEDIDA, PLACA_FAIXA, LOCAL_CHAVES, TIPO_COMPLEMENTO,
  CARACT_INTERNAS, CARACT_EXTERNAS, LAZER,
} from '../lib/imoveis';
import { CaracteristicasToggleGrid } from '../components/CaracteristicasToggleGrid';
import { ProprietariosSection } from '../components/ProprietariosSection';
import { ProprietariosCard } from '../components/ProprietariosCard';
import { addVinculo, type Cliente } from '../lib/clientes';
import { CondominioAutocomplete } from '../components/CondominioAutocomplete';

const num = z.coerce.number().optional().nullable();
const int = z.coerce.number().int().optional().nullable();
const str = z.string().optional().or(z.literal(''));

const schema = z.object({
  // Básico (obrigatórios)
  titulo: z.string().min(3).max(200),
  tipo: z.string().min(1),
  finalidade: z.string().min(1),
  status: z.string().min(1),
  preco: z.coerce.number().positive(),
  destaque: z.boolean(),
  ativo: z.boolean(),

  // Identificação
  codigo_interno: str, codigo_auxiliar: str, destinacao: str, segundo_tipo: str,
  local_chaves: str, identificador_chaves: str, num_chaves: int, num_controles: int,
  horario_visita: str, edificio: str, identificador_imovel: str,
  condominio_nome: str, codigo_condominio_imoview: int,

  // Endereço
  cep: str, endereco: str, numero: str, bairro: str, segundo_bairro: str,
  regiao: str, sub_regiao: str, cidade: str, estado: str,
  tipo_complemento: str, complemento: str, torre_bloco: str,

  // Valores
  valor_anterior: num, condominio: num, iptu_mensal: num, iptu_anual: num,
  rentabilidade_pct: num, comissao_venda_pct: num, valor_sob_consulta: z.boolean().optional(),
  valor_avaliacao: num, descricao_avaliacao: str,

  // Flags
  exclusivo: z.boolean().optional(), imovel_ocupado: z.boolean().optional(),
  imovel_alugado: z.boolean().optional(), placa_faixa: str, cib: str,
  aceita_financiamento: z.boolean().optional(), aceita_permuta: z.boolean().optional(),
  na_planta: z.boolean().optional(), permite_animais: z.boolean().optional(),

  // Áreas
  area: num, area_externa: num, area_total: num,
  tipo_medida: str, m_frente: num, m_fundo: num, m_direito: num, m_esquerdo: num,
  confront_frente: str, confront_fundo: str, confront_dir: str, confront_esq: str,
  zona_uso: str, coef_aproveitamento: num,

  // Texto & SEO
  ponto_referencia: str, melhor_acesso: str, titulo_anuncio: str, descricao: str,
  meta_description: str, construtora: str, ano_construcao: int,
  venc_autorizacao_venda: str,

  // Cartório
  cartorio: str, matricula: str, livro_cartorio: str, folha_cartorio: str,

  // Internas
  andar: str, banheiros: int, piso_acabamento: str, posicao_imovel: str,
  quartos: int, salas: int, suites: int, varandas: int,

  // Externas
  vagas: int, tipo_vaga: str, elevadores: int, num_torres: int, num_andares: int,
  unidades_por_andar: int, total_unidades: int,

  // Anotações
  observacoes_internas: str, notas_privadas: str,
  video_url: str, tour_360_url: str,
});

type FormData = z.infer<typeof schema>;

export default function ImovelForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isManager, isCorretor, isAtendente, loading: rolesLoading } = useRoles();
  const [saving, setSaving] = useState(false);
  const [fotos, setFotos] = useState<string[]>([]);
  const [caracteristicas, setCaracteristicas] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [corretorId, setCorretorId] = useState<string>('');
  const [corretores, setCorretores] = useState<any[]>([]);
  const [loadedRecord, setLoadedRecord] = useState<any>(null);
  const [tab, setTab] = useState('endereco');
  const [pendingProprietarios, setPendingProprietarios] = useState<{ cliente: Cliente; percentual: number | null }[]>([]);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'dirty' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [currentId, setCurrentId] = useState<string | undefined>(id);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextAutoSaveRef = useRef(true);
  const hasOfferedRestoreRef = useRef(false);
  const [cepLoading, setCepLoading] = useState(false);
  const lastCepRef = useRef<string>('');

  const lookupCep = async (rawCep: string) => {
    const digits = rawCep.replace(/\D/g, '');
    if (digits.length !== 8 || digits === lastCepRef.current) return;
    lastCepRef.current = digits;
    setCepLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cep-lookup', { body: { cep: digits } });
      if (error || !data || (data as any).erro) {
        toast({ title: 'CEP não encontrado', variant: 'destructive' });
        return;
      }
      const d: any = data;
      const setField = (name: any, value: string) => {
        if (!value) return;
        form.setValue(name, value, { shouldDirty: true, shouldValidate: true });
      };
      setField('endereco', d.logradouro || '');
      setField('bairro', d.bairro || '');
      setField('cidade', d.localidade || '');
      setField('estado', (d.uf || '').toUpperCase());
      setTimeout(() => {
        const el = document.querySelector<HTMLInputElement>('input[name="numero"]');
        el?.focus();
      }, 50);
    } catch (e: any) {
      toast({ title: 'Erro ao consultar CEP', description: e.message, variant: 'destructive' });
    } finally {
      setCepLoading(false);
    }
  };

  const formatCep = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  };

  const TABS = useMemo(() => [
    { key: 'endereco', label: 'Endereço' },
    { key: 'detalhes', label: 'Detalhes' },
    { key: 'relacionamentos', label: 'Relacionamentos' },
    { key: 'anotacoes', label: 'Anotações' },
    { key: 'fotos', label: 'Fotos' },
  ], []);
  const tabIndex = TABS.findIndex((t) => t.key === tab);
  const isLastTab = tabIndex === TABS.length - 1;
  const isFirstTab = tabIndex === 0;
  const draftKey = user ? `imovel-rascunho:${user.id}` : null;

  const goToTab = (dir: 1 | -1) => {
    const next = TABS[tabIndex + dir];
    if (!next) return;
    setTab(next.key);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };



  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      titulo: '', tipo: 'Apartamento', finalidade: 'venda', status: 'disponivel',
      preco: 0, destaque: false, ativo: true, estado: 'SP',
      valor_sob_consulta: false, exclusivo: false, imovel_ocupado: false,
      imovel_alugado: false, aceita_financiamento: false, aceita_permuta: false,
      na_planta: false, permite_animais: false,
    },
  });

  useEffect(() => {
    if (!rolesLoading && isAtendente && !isManager && !isCorretor) {
      toast({ title: 'Sem permissão', description: 'Atendentes não podem criar ou editar imóveis.', variant: 'destructive' });
      navigate('/crm/imoveis');
    }
  }, [rolesLoading, isAtendente, isManager, isCorretor, navigate, toast]);

  useEffect(() => {
    if (!isManager) return;
    (async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'corretor');
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return setCorretores([]);
      const { data: profs } = await supabase.from('profiles').select('id, nome').in('id', ids).eq('ativo', true);
      setCorretores(profs ?? []);
    })();
  }, [isManager]);

  useEffect(() => {
    if (!id) return;
    skipNextAutoSaveRef.current = true;
    (async () => {
      const { data } = await supabase.from('imoveis_proprios').select('*').eq('id', id).maybeSingle();
      if (data) {
        setLoadedRecord(data);
        setCorretorId(data.corretor_id ?? '');
        const reset: any = { ...data };
        Object.keys(reset).forEach((k) => { if (reset[k] === null) reset[k] = ''; });
        reset.preco = data.preco; reset.destaque = !!data.destaque; reset.ativo = !!data.ativo;
        reset.venc_autorizacao_venda = data.venc_autorizacao_venda ?? '';
        form.reset(reset);
        setFotos(data.fotos ?? []);
        setCaracteristicas(data.caracteristicas ?? []);
        setLastSavedAt(new Date(data.updated_at ?? Date.now()));
        setAutoSaveStatus('saved');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Restaurar rascunho do localStorage (apenas em /novo)
  useEffect(() => {
    if (id || !draftKey || hasOfferedRestoreRef.current) return;
    hasOfferedRestoreRef.current = true;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft || !draft.values) return;
      toast({
        title: 'Rascunho encontrado',
        description: 'Você tem um cadastro de imóvel não finalizado. Restaurar?',
        action: (
          <Button size="sm" variant="outline" onClick={() => {
            skipNextAutoSaveRef.current = true;
            form.reset(draft.values);
            setFotos(draft.fotos ?? []);
            setCaracteristicas(draft.caracteristicas ?? []);
            setLastSavedAt(draft.savedAt ? new Date(draft.savedAt) : null);
            setAutoSaveStatus('saved');
          }}>Restaurar</Button>
        ) as any,
      });
    } catch { /* ignore */ }
  }, [id, draftKey, form, toast]);

  // Auto-save com debounce
  useEffect(() => {
    if (rolesLoading) return;
    const sub = form.watch(() => {
      if (skipNextAutoSaveRef.current) { skipNextAutoSaveRef.current = false; return; }
      setAutoSaveStatus('dirty');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => { void runAutoSave(); }, 2000);
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolesLoading, currentId, fotos, caracteristicas, corretorId]);

  // Auto-save também quando fotos / características / corretor mudam
  useEffect(() => {
    if (skipNextAutoSaveRef.current) return;
    setAutoSaveStatus('dirty');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { void runAutoSave(); }, 2000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotos, caracteristicas, corretorId]);

  // Aviso ao sair com alterações pendentes
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (autoSaveStatus === 'dirty' || autoSaveStatus === 'saving') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [autoSaveStatus]);

  const runAutoSave = async () => {
    if (!user) return;
    const values = form.getValues();
    const payload: any = { ...values, fotos, caracteristicas };
    Object.keys(payload).forEach((k) => { if (payload[k] === '' || payload[k] === undefined) payload[k] = null; });
    if (isManager) payload.corretor_id = corretorId || null;
    else if (isCorretor) payload.corretor_id = loadedRecord?.corretor_id ?? user.id;

    setAutoSaveStatus('saving');
    try {
      if (currentId) {
        const { error } = await supabase.from('imoveis_proprios').update(payload).eq('id', currentId);
        if (error) throw error;
      } else {
        const hasMin = values.titulo && values.titulo.length >= 3 && values.tipo && values.finalidade && Number(values.preco) > 0;
        if (!hasMin) {
          // salva em localStorage
          if (draftKey) localStorage.setItem(draftKey, JSON.stringify({
            values, fotos, caracteristicas, savedAt: new Date().toISOString(),
          }));
          setLastSavedAt(new Date());
          setAutoSaveStatus('saved');
          return;
        }
        // INSERT em rascunho (inativo)
        const draftPayload = { ...payload, status: 'inativo', ativo: false };
        const { data: ins, error } = await supabase.from('imoveis_proprios').insert(draftPayload).select('id').single();
        if (error) throw error;
        const newId = (ins as { id: string }).id;
        setCurrentId(newId);
        setLoadedRecord({ ...draftPayload, id: newId });
        if (draftKey) localStorage.removeItem(draftKey);
        // muda URL silenciosamente
        window.history.replaceState(null, '', `/crm/imoveis/${newId}`);
      }
      setLastSavedAt(new Date());
      setAutoSaveStatus('saved');
    } catch (e) {
      console.error('auto-save erro', e);
      setAutoSaveStatus('error');
    }
  };



  const canEditThisRecord = isManager || (isCorretor && (!loadedRecord || loadedRecord.corretor_id === user?.id));
  const canDeleteThisRecord = isManager || (isCorretor && loadedRecord?.corretor_id === user?.id);

  const onSubmit = async (values: FormData) => {
    setSaving(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    try {
      const payload: any = { ...values, fotos, caracteristicas };
      Object.keys(payload).forEach((k) => { if (payload[k] === '' || payload[k] === undefined) payload[k] = null; });

      if (isManager) {
        payload.corretor_id = corretorId || null;
      } else if (isCorretor) {
        payload.corretor_id = loadedRecord?.corretor_id ?? user!.id;
      }

      if (currentId) {
        const { error } = await supabase.from('imoveis_proprios').update(payload).eq('id', currentId);
        if (error) throw error;
      } else {
        const { data: ins, error } = await supabase.from('imoveis_proprios').insert(payload).select('id').single();
        if (error) throw error;
        const newId = (ins as { id: string }).id;
        for (const p of pendingProprietarios) {
          try { await addVinculo(p.cliente.id, newId, 'proprietario', p.percentual ?? undefined); }
          catch (e) { console.error('vinculo proprietario falhou', e); }
        }
      }
      if (draftKey) localStorage.removeItem(draftKey);
      setAutoSaveStatus('saved');
      toast({ title: 'Imóvel salvo' });
      navigate('/crm/imoveis');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };


  const handleUpload = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('imoveis-fotos').upload(path, file);
        if (error) throw error;
        const { data: pub } = supabase.storage.from('imoveis-fotos').getPublicUrl(path);
        urls.push(pub.publicUrl);
      }
      setFotos((prev) => [...prev, ...urls]);
    } catch (e: any) {
      toast({ title: 'Erro no upload', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const removeFoto = (url: string) => setFotos((p) => p.filter((u) => u !== url));
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const reorderFotos = (from: number, to: number) => {
    if (from === to) return;
    setFotos((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!currentId || !confirm('Excluir este imóvel?')) return;
    const { error } = await supabase.from('imoveis_proprios').delete().eq('id', currentId);
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    toast({ title: 'Excluído' });
    navigate('/crm/imoveis');
  };

  const handleToggleAtivo = async () => {
    if (!currentId) return;
    const currentlyAtivo = !!loadedRecord?.ativo && loadedRecord?.status !== 'inativo';
    const msg = currentlyAtivo
      ? 'Desativar este imóvel? Ele deixará de aparecer no site principal.'
      : 'Reativar este imóvel? Ele voltará a aparecer no site principal.';
    if (!confirm(msg)) return;
    const updates = currentlyAtivo
      ? { ativo: false, status: 'inativo' as const }
      : { ativo: true, status: 'disponivel' as const };
    const { error } = await supabase.from('imoveis_proprios').update(updates).eq('id', currentId);
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    toast({ title: currentlyAtivo ? 'Imóvel desativado' : 'Imóvel reativado' });
    form.setValue('ativo', updates.ativo);
    form.setValue('status', updates.status);
    setLoadedRecord((r: any) => r ? { ...r, ...updates } : r);
  };

  // Helpers para campos
  const T = (name: any, label: string, type: string = 'text', extra: any = {}) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl><Input type={type} {...field} value={field.value ?? ''} {...extra} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );

  const Sel = (name: any, label: string, opts: string[]) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <Select value={field.value || ''} onValueChange={field.onChange}>
          <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
          <SelectContent>
            {opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormItem>
    )} />
  );

  const Sw = (name: any, label: string) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <div className="flex items-center justify-between gap-3 rounded-md border border-[#E8E4D9] bg-white px-3 py-2">
        <Label className="text-sm">{label}</Label>
        <Switch checked={!!field.value} onCheckedChange={field.onChange} />
      </div>
    )} />
  );

  const statusLabel = (() => {
    if (autoSaveStatus === 'saving') return { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, text: 'Salvando…', cls: 'text-[#7A5A14] bg-[#FBF3DC] border-[#E8D9A8]' };
    if (autoSaveStatus === 'saved') return { icon: <Check className="h-3.5 w-3.5" />, text: lastSavedAt ? `Salvo às ${lastSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Salvo', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (autoSaveStatus === 'dirty') return { icon: <span className="h-2 w-2 rounded-full bg-amber-500" />, text: 'Alterações não salvas', cls: 'text-amber-700 bg-amber-50 border-amber-200' };
    if (autoSaveStatus === 'error') return { icon: <CloudOff className="h-3.5 w-3.5" />, text: 'Falha ao salvar', cls: 'text-red-700 bg-red-50 border-red-200' };
    return null;
  })();

  return (
    <CrmLayout>
      <Button variant="ghost" onClick={() => navigate('/crm/imoveis')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />Voltar
      </Button>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold">{currentId ? 'Editar' : 'Inclusão de'} Imóvel</h1>
        {statusLabel && (
          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${statusLabel.cls}`}>
            {statusLabel.icon}{statusLabel.text}
          </span>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-24 md:pb-6">
          {currentId && (
            <ProprietariosCard
              imovelId={currentId}
              codigoImoview={(loadedRecord?.codigo_imoview as number | null) ?? null}
              onVincularClick={() => setTab('relacionamentos')}
            />
          )}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex w-full overflow-x-auto md:grid md:grid-cols-5 md:max-w-3xl no-scrollbar">
              {TABS.map((t, i) => (
                <TabsTrigger key={t.key} value={t.key} className="flex-shrink-0 md:flex-shrink gap-1.5">
                  <span className="text-[10px] opacity-60 md:hidden">{i + 1}/{TABS.length}</span>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>


            {/* ENDEREÇO */}
            <TabsContent value="endereco">
              <Card className="p-6 space-y-4">
                <h2 className="font-semibold">Endereço</h2>
                <div className="grid md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="cep" render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            placeholder="00000-000"
                            maxLength={9}
                            onChange={(e) => {
                              const masked = formatCep(e.target.value);
                              field.onChange(masked);
                              if (masked.replace(/\D/g, '').length === 8) void lookupCep(masked);
                            }}
                            onBlur={(e) => { field.onBlur(); void lookupCep(e.target.value); }}
                          />
                          {cepLoading && (
                            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </FormControl>
                    </FormItem>
                  )} />
                  {T('endereco', 'Endereço')}
                  {T('numero', 'Nº')}
                  {T('bairro', 'Bairro')}
                  {T('segundo_bairro', 'Segundo bairro')}
                  {T('regiao', 'Região')}
                  {T('sub_regiao', 'Sub-região')}
                  {T('cidade', 'Cidade')}
                  <FormField control={form.control} name="estado" render={({ field }) => (
                    <FormItem><FormLabel>Estado</FormLabel><FormControl><Input maxLength={2} {...field} value={field.value ?? ''} /></FormControl></FormItem>
                  )} />
                  {Sel('tipo_complemento', 'Tipo complemento', TIPO_COMPLEMENTO)}
                  {T('complemento', 'Complemento')}
                  {T('torre_bloco', 'Torre / bloco')}
                  <FormField control={form.control} name="finalidade" render={({ field }) => (
                    <FormItem><FormLabel>Finalidade *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{FINALIDADE.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="tipo" render={({ field }) => (
                    <FormItem><FormLabel>Tipo de imóvel *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{TIPO_IMOVEL.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
              </Card>
            </TabsContent>

            {/* DETALHES */}
            <TabsContent value="detalhes" className="space-y-4">
              <Card className="p-6 space-y-4">
                <FormField control={form.control} name="titulo" render={({ field }) => (
                  <FormItem><FormLabel>Título *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Status *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{IMOVEL_STATUS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </Card>

              <Tabs defaultValue="ident" className="w-full">
                <TabsList className="flex w-full overflow-x-auto justify-start h-auto flex-wrap gap-1 bg-muted/60 p-1 no-scrollbar">
                  <TabsTrigger value="ident" className="flex-shrink-0">Identificação & Comercial</TabsTrigger>
                  <TabsTrigger value="valores" className="flex-shrink-0">Valores</TabsTrigger>
                  <TabsTrigger value="flags" className="flex-shrink-0">Situação</TabsTrigger>
                  <TabsTrigger value="areas" className="flex-shrink-0">Áreas & Dimensões</TabsTrigger>
                  <TabsTrigger value="textos" className="flex-shrink-0">Anúncio & SEO</TabsTrigger>
                  <TabsTrigger value="cartorio" className="flex-shrink-0">Cartório</TabsTrigger>
                  <TabsTrigger value="internas" className="flex-shrink-0">Internas</TabsTrigger>
                  <TabsTrigger value="externas" className="flex-shrink-0">Externas</TabsTrigger>
                  <TabsTrigger value="lazer" className="flex-shrink-0">Lazer</TabsTrigger>
                </TabsList>

                <TabsContent value="ident" className="border rounded-md bg-white px-4 py-4">
                  <div className="grid md:grid-cols-3 gap-4 pt-2">
                    {T('codigo_interno', 'Código interno')}
                    {T('codigo_auxiliar', 'Código auxiliar')}
                    {Sel('destinacao', 'Destinação', DESTINACAO)}
                    {T('segundo_tipo', 'Segundo tipo')}
                    {Sel('local_chaves', 'Local das chaves', LOCAL_CHAVES)}
                    {T('identificador_chaves', 'Identificador de chaves')}
                    {T('num_chaves', 'Nº de chaves', 'number')}
                    {T('num_controles', 'Nº de controles', 'number')}
                    {T('horario_visita', 'Horário de visita')}
                    {T('edificio', 'Edifício')}
                    <FormField control={form.control} name="condominio_nome" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condomínio (nome)</FormLabel>
                        <FormControl>
                          <CondominioAutocomplete
                            nome={(field.value as string) ?? ''}
                            codigo={form.watch('codigo_condominio_imoview') as number | null}
                            onChange={({ nome, codigo, cidade }) => {
                              field.onChange(nome);
                              form.setValue('codigo_condominio_imoview', (codigo ?? null) as any, { shouldDirty: true });
                              if (cidade && !form.getValues('cidade')) {
                                form.setValue('cidade', cidade, { shouldDirty: true });
                              }
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )} />
                    {T('identificador_imovel', 'Identificador do imóvel')}
                  </div>
                </TabsContent>

                <TabsContent value="valores" className="border rounded-md bg-white px-4 py-4">
                  <div className="grid md:grid-cols-3 gap-4 pt-2">
                    <FormField control={form.control} name="preco" render={({ field }) => (
                      <FormItem><FormLabel>Venda (R$) *</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    {T('valor_anterior', 'Valor anterior', 'number')}
                    {T('condominio', 'Condomínio (R$)', 'number')}
                    {T('iptu_mensal', 'IPTU (mensal)', 'number')}
                    {T('iptu_anual', 'IPTU (anual)', 'number')}
                    {T('rentabilidade_pct', 'Rentabilidade %', 'number')}
                    {T('comissao_venda_pct', 'Comissão venda %', 'number')}
                    {T('valor_avaliacao', 'Valor avaliação', 'number')}
                    <FormField control={form.control} name="valor_sob_consulta" render={({ field }) => (
                      <div className="flex items-center justify-between gap-3 rounded-md border border-[#E8E4D9] bg-white px-3 py-2">
                        <Label className="text-sm">Valor sob consulta</Label>
                        <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                      </div>
                    )} />
                  </div>
                  <FormField control={form.control} name="descricao_avaliacao" render={({ field }) => (
                    <FormItem className="mt-4"><FormLabel>Descrição avaliação</FormLabel><FormControl><Textarea rows={3} {...field} value={field.value ?? ''} /></FormControl></FormItem>
                  )} />
                </TabsContent>

                <TabsContent value="flags" className="border rounded-md bg-white px-4 py-4">
                  <div className="grid md:grid-cols-3 gap-3 pt-2">
                    {Sw('exclusivo', 'Exclusivo')}
                    {Sw('imovel_ocupado', 'Imóvel ocupado')}
                    {Sw('imovel_alugado', 'Imóvel alugado')}
                    {Sw('aceita_financiamento', 'Aceita financiamento')}
                    {Sw('aceita_permuta', 'Aceita permuta')}
                    {Sw('na_planta', 'Na planta')}
                    {Sw('permite_animais', 'Permite animais')}
                    {Sel('placa_faixa', 'Placa / Faixa', PLACA_FAIXA)}
                    {T('cib', 'CIB')}
                  </div>
                </TabsContent>

                <TabsContent value="areas" className="border rounded-md bg-white px-4 py-4">
                  <div className="grid md:grid-cols-3 gap-4 pt-2">
                    {T('area', 'Área interna (m²)', 'number')}
                    {T('area_externa', 'Área externa (m²)', 'number')}
                    {T('area_total', 'Área lote/terreno', 'number')}
                    {Sel('tipo_medida', 'Tipo medida', TIPO_MEDIDA)}
                    {T('m_frente', 'M. frente', 'number')}
                    {T('m_fundo', 'M. fundo', 'number')}
                    {T('m_direito', 'M. direito', 'number')}
                    {T('m_esquerdo', 'M. esquerdo', 'number')}
                    {T('confront_frente', 'Confrontação frente')}
                    {T('confront_fundo', 'Confrontação fundo')}
                    {T('confront_dir', 'Confrontação lado direito')}
                    {T('confront_esq', 'Confrontação lado esquerdo')}
                    {T('zona_uso', 'Zona de uso')}
                    {T('coef_aproveitamento', 'Coeficiente de aproveitamento', 'number')}
                  </div>
                </TabsContent>

                <TabsContent value="textos" className="border rounded-md bg-white px-4 py-4">
                  <div className="grid md:grid-cols-2 gap-4 pt-2">
                    {T('ponto_referencia', 'Ponto de referência')}
                    {T('melhor_acesso', 'Melhor acesso')}
                    {T('titulo_anuncio', 'Título para anúncio')}
                    {T('construtora', 'Construtora')}
                    {T('ano_construcao', 'Ano construção', 'number')}
                    {T('venc_autorizacao_venda', 'Vencimento autorização de venda', 'date')}
                  </div>
                  <FormField control={form.control} name="descricao" render={({ field }) => (
                    <FormItem className="mt-4"><FormLabel>Descrição</FormLabel><FormControl><Textarea rows={5} {...field} value={field.value ?? ''} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="meta_description" render={({ field }) => (
                    <FormItem className="mt-4"><FormLabel>Meta description (SEO)</FormLabel><FormControl><Textarea rows={3} {...field} value={field.value ?? ''} /></FormControl></FormItem>
                  )} />
                </TabsContent>

                <TabsContent value="cartorio" className="border rounded-md bg-white px-4 py-4">
                  <div className="grid md:grid-cols-2 gap-4 pt-2">
                    {T('cartorio', 'Cartório')}
                    {T('matricula', 'Matrícula')}
                    {T('livro_cartorio', 'Livro cartório')}
                    {T('folha_cartorio', 'Folha cartório')}
                  </div>
                </TabsContent>

                <TabsContent value="internas" className="border rounded-md bg-white px-4 py-4">
                  <div className="grid md:grid-cols-4 gap-4 pt-2">
                    {T('andar', 'Andar')}
                    {T('banheiros', 'Banheiros', 'number')}
                    {T('piso_acabamento', 'Piso / acabamento')}
                    {Sel('posicao_imovel', 'Posição imóvel', POSICAO_IMOVEL)}
                    {T('quartos', 'Quartos', 'number')}
                    {T('salas', 'Salas', 'number')}
                    {T('suites', 'Suítes', 'number')}
                    {T('varandas', 'Varandas', 'number')}
                  </div>
                  <div className="mt-4">
                    <CaracteristicasToggleGrid
                      items={CARACT_INTERNAS}
                      prefix="interna"
                      value={caracteristicas}
                      onChange={setCaracteristicas}
                      columns={3}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="externas" className="border rounded-md bg-white px-4 py-4">
                  <div className="grid md:grid-cols-4 gap-4 pt-2">
                    {T('vagas', 'Vagas de garagem', 'number')}
                    {Sel('tipo_vaga', 'Tipo de vaga', TIPO_VAGA)}
                    {T('elevadores', 'Elevadores', 'number')}
                    {T('num_torres', 'Nº torres / blocos', 'number')}
                    {T('num_andares', 'Nº andares', 'number')}
                    {T('unidades_por_andar', 'Unidades por andar', 'number')}
                    {T('total_unidades', 'Total unidades', 'number')}
                  </div>
                  <div className="mt-4">
                    <CaracteristicasToggleGrid
                      items={CARACT_EXTERNAS}
                      prefix="externa"
                      value={caracteristicas}
                      onChange={setCaracteristicas}
                      columns={3}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="lazer" className="border rounded-md bg-white px-4 py-4">
                  <div className="pt-2">
                    <CaracteristicasToggleGrid
                      items={LAZER}
                      prefix="lazer"
                      value={caracteristicas}
                      onChange={setCaracteristicas}
                      columns={3}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* RELACIONAMENTOS */}
            <TabsContent value="relacionamentos" className="space-y-4">
              <Card className="p-6 space-y-4">
                <h2 className="font-semibold">Relacionamentos</h2>
                {isManager && (
                  <div>
                    <Label>Corretor responsável</Label>
                    <Select value={corretorId || 'nenhum'} onValueChange={(v) => setCorretorId(v === 'nenhum' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nenhum">Nenhum</SelectItem>
                        {corretores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Label>Destaque</Label>
                  <FormField control={form.control} name="destaque" render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Ativo</Label>
                  <FormField control={form.control} name="ativo" render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )} />
                </div>
              </Card>

              <ProprietariosSection imovelId={currentId ?? null} onPendingChange={setPendingProprietarios} />
            </TabsContent>

            {/* ANOTAÇÕES */}
            <TabsContent value="anotacoes" className="space-y-4">
              <Card className="p-6 space-y-4">
                <h2 className="font-semibold">Anotações</h2>
                <FormField control={form.control} name="observacoes_internas" render={({ field }) => (
                  <FormItem><FormLabel>Observações internas</FormLabel><FormControl><Textarea rows={4} {...field} value={field.value ?? ''} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="notas_privadas" render={({ field }) => (
                  <FormItem><FormLabel>Notas privadas</FormLabel><FormControl><Textarea rows={4} {...field} value={field.value ?? ''} /></FormControl></FormItem>
                )} />
                <div className="grid md:grid-cols-2 gap-4">
                  {T('video_url', 'URL do vídeo')}
                  {T('tour_360_url', 'URL do tour 360')}
                </div>
              </Card>
            </TabsContent>

            {/* FOTOS */}
            <TabsContent value="fotos" className="space-y-4">
              <Card className="p-6 space-y-4">
                <h2 className="font-semibold">Fotos</h2>
                <div>
                  <Label htmlFor="fotos" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-md border bg-secondary hover:bg-secondary/80">
                    <Upload className="h-4 w-4" /> {uploading ? 'Enviando...' : 'Adicionar fotos'}
                  </Label>
                  <input id="fotos" type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
                </div>
                {fotos.length > 0 && (
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    {fotos.map((url, idx) => (
                      <div
                        key={url}
                        draggable
                        onDragStart={() => setDragIndex(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragIndex !== null) reorderFotos(dragIndex, idx);
                          setDragIndex(null);
                        }}
                        onDragEnd={() => setDragIndex(null)}
                        className={`relative aspect-square cursor-move transition-opacity ${dragIndex === idx ? 'opacity-40' : ''}`}
                      >
                        <img src={url} className="w-full h-full object-cover rounded-md pointer-events-none" />
                        {idx === 0 && (
                          <span className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground">Capa</span>
                        )}
                        <button type="button" onClick={() => removeFoto(url)} className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>

          {/* Navegação entre etapas */}
          <div className="flex items-center justify-between gap-2 rounded-lg border border-[#E8E4D9] bg-white px-4 py-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => goToTab(-1)}
              disabled={isFirstTab}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <span className="text-xs text-[#7A7A80] hidden sm:block">
              Etapa {tabIndex + 1} de {TABS.length} · {TABS[tabIndex]?.label}
            </span>
            {isLastTab ? (
              <Button type="submit" disabled={saving || (!!currentId && !canEditThisRecord)} className="gap-1">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando…</> : <><Check className="h-4 w-4" /> Finalizar e salvar</>}
              </Button>
            ) : (
              <Button type="button" onClick={() => goToTab(1)} className="gap-1">
                Próximo: {TABS[tabIndex + 1]?.label} <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
            {currentId && canDeleteThisRecord ? (
              <Button type="button" variant="destructive" onClick={handleDelete}><Trash2 className="h-4 w-4 mr-2" />Excluir</Button>
            ) : <div />}
            <div className="flex flex-col sm:flex-row gap-2">
              {currentId && canEditThisRecord && (
                loadedRecord?.ativo && loadedRecord?.status !== 'inativo' ? (
                  <Button type="button" variant="outline" onClick={handleToggleAtivo}>
                    <EyeOff className="h-4 w-4 mr-2" />Desativar (ocultar do site)
                  </Button>
                ) : (
                  <Button type="button" variant="outline" onClick={handleToggleAtivo}>
                    <Eye className="h-4 w-4 mr-2" />Reativar no site
                  </Button>
                )
              )}
              <Button type="button" variant="outline" onClick={() => navigate('/crm/imoveis')}>Cancelar</Button>
              <Button type="submit" disabled={saving || (!!currentId && !canEditThisRecord)}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </div>

        </form>
      </Form>
    </CrmLayout>
  );
}
