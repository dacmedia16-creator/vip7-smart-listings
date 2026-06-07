import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Upload, X, Trash2 } from 'lucide-react';
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
  condominio_nome: str,

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
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const canEditThisRecord = isManager || (isCorretor && (!loadedRecord || loadedRecord.corretor_id === user?.id));
  const canDeleteThisRecord = isManager || (isCorretor && loadedRecord?.corretor_id === user?.id);

  const onSubmit = async (values: FormData) => {
    setSaving(true);
    try {
      const payload: any = { ...values, fotos, caracteristicas };
      Object.keys(payload).forEach((k) => { if (payload[k] === '' || payload[k] === undefined) payload[k] = null; });

      if (isManager) {
        payload.corretor_id = corretorId || null;
      } else if (isCorretor) {
        payload.corretor_id = loadedRecord?.corretor_id ?? user!.id;
      }

      if (id) {
        const { error } = await supabase.from('imoveis_proprios').update(payload).eq('id', id);
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

  const handleDelete = async () => {
    if (!id || !confirm('Excluir este imóvel?')) return;
    const { error } = await supabase.from('imoveis_proprios').delete().eq('id', id);
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    toast({ title: 'Excluído' });
    navigate('/crm/imoveis');
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

  return (
    <CrmLayout>
      <Button variant="ghost" onClick={() => navigate('/crm/imoveis')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />Voltar
      </Button>
      <h1 className="text-2xl font-bold mb-6">{id ? 'Editar' : 'Inclusão de'} Imóvel</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-4 w-full max-w-2xl">
              <TabsTrigger value="endereco">Endereço</TabsTrigger>
              <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
              <TabsTrigger value="relacionamentos">Relacionamentos</TabsTrigger>
              <TabsTrigger value="anotacoes">Anotações</TabsTrigger>
            </TabsList>

            {/* ENDEREÇO */}
            <TabsContent value="endereco">
              <Card className="p-6 space-y-4">
                <h2 className="font-semibold">Endereço</h2>
                <div className="grid md:grid-cols-3 gap-4">
                  {T('cep', 'CEP')}
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

              <Accordion type="multiple" defaultValue={['ident', 'valores', 'areas']} className="space-y-2">
                <AccordionItem value="ident" className="border rounded-md bg-white px-4">
                  <AccordionTrigger>Identificação & Comercial</AccordionTrigger>
                  <AccordionContent>
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
                      {T('condominio_nome', 'Condomínio (nome)')}
                      {T('identificador_imovel', 'Identificador do imóvel')}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="valores" className="border rounded-md bg-white px-4">
                  <AccordionTrigger>Valores</AccordionTrigger>
                  <AccordionContent>
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
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="flags" className="border rounded-md bg-white px-4">
                  <AccordionTrigger>Situação do imóvel</AccordionTrigger>
                  <AccordionContent>
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
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="areas" className="border rounded-md bg-white px-4">
                  <AccordionTrigger>Áreas | Dimensões | Zoneamento</AccordionTrigger>
                  <AccordionContent>
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
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="textos" className="border rounded-md bg-white px-4">
                  <AccordionTrigger>Anúncio & SEO</AccordionTrigger>
                  <AccordionContent>
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
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="cartorio" className="border rounded-md bg-white px-4">
                  <AccordionTrigger>Cartório</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid md:grid-cols-2 gap-4 pt-2">
                      {T('cartorio', 'Cartório')}
                      {T('matricula', 'Matrícula')}
                      {T('livro_cartorio', 'Livro cartório')}
                      {T('folha_cartorio', 'Folha cartório')}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="internas" className="border rounded-md bg-white px-4">
                  <AccordionTrigger>Características internas</AccordionTrigger>
                  <AccordionContent>
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
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="externas" className="border rounded-md bg-white px-4">
                  <AccordionTrigger>Características externas</AccordionTrigger>
                  <AccordionContent>
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
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="lazer" className="border rounded-md bg-white px-4">
                  <AccordionTrigger>Lazer</AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-2">
                      <CaracteristicasToggleGrid
                        items={LAZER}
                        prefix="lazer"
                        value={caracteristicas}
                        onChange={setCaracteristicas}
                        columns={3}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
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

              <ProprietariosSection imovelId={id ?? null} onPendingChange={setPendingProprietarios} />
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
                    {fotos.map((url) => (
                      <div key={url} className="relative aspect-square">
                        <img src={url} className="w-full h-full object-cover rounded-md" />
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

          <div className="flex justify-between">
            {id && canDeleteThisRecord ? (
              <Button type="button" variant="destructive" onClick={handleDelete}><Trash2 className="h-4 w-4 mr-2" />Excluir</Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/crm/imoveis')}>Cancelar</Button>
              <Button type="submit" disabled={saving || (!!id && !canEditThisRecord)}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </div>
        </form>
      </Form>
    </CrmLayout>
  );
}
