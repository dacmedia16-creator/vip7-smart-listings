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
import { useToast } from '@/hooks/use-toast';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useAuth } from '../hooks/useAuth';
import { useRoles } from '../hooks/useRole';
import { IMOVEL_STATUS, TIPO_IMOVEL, FINALIDADE } from '../lib/imoveis';

const schema = z.object({
  titulo: z.string().min(3).max(200),
  codigo_interno: z.string().max(50).optional().or(z.literal('')),
  tipo: z.string().min(1),
  finalidade: z.string().min(1),
  status: z.string().min(1),
  descricao: z.string().max(5000).optional().or(z.literal('')),
  preco: z.coerce.number().positive(),
  condominio: z.coerce.number().optional().nullable(),
  iptu: z.coerce.number().optional().nullable(),
  area: z.coerce.number().optional().nullable(),
  area_total: z.coerce.number().optional().nullable(),
  quartos: z.coerce.number().int().optional().nullable(),
  suites: z.coerce.number().int().optional().nullable(),
  banheiros: z.coerce.number().int().optional().nullable(),
  vagas: z.coerce.number().int().optional().nullable(),
  cep: z.string().max(20).optional().or(z.literal('')),
  endereco: z.string().max(300).optional().or(z.literal('')),
  bairro: z.string().max(120).optional().or(z.literal('')),
  cidade: z.string().max(120).optional().or(z.literal('')),
  estado: z.string().max(2).optional().or(z.literal('')),
  destaque: z.boolean(),
  ativo: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export default function ImovelForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [fotos, setFotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      titulo: '', tipo: 'Apartamento', finalidade: 'venda', status: 'disponivel',
      preco: 0, destaque: false, ativo: true, estado: 'SP',
    },
  });

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from('imoveis_proprios').select('*').eq('id', id).maybeSingle();
      if (data) {
        form.reset({
          ...data,
          codigo_interno: data.codigo_interno ?? '',
          descricao: data.descricao ?? '',
          cep: data.cep ?? '', endereco: data.endereco ?? '', bairro: data.bairro ?? '',
          cidade: data.cidade ?? '', estado: data.estado ?? 'SP',
        } as any);
        setFotos(data.fotos ?? []);
      }
    })();
  }, [id]);

  const onSubmit = async (values: FormData) => {
    setSaving(true);
    try {
      const payload: any = { ...values, fotos };
      Object.keys(payload).forEach((k) => { if (payload[k] === '' || payload[k] === undefined) payload[k] = null; });
      payload.titulo = values.titulo;
      payload.preco = values.preco;
      payload.tipo = values.tipo;
      payload.finalidade = values.finalidade;
      payload.status = values.status;
      payload.ativo = values.ativo;
      payload.destaque = values.destaque;

      if (id) {
        const { error } = await supabase.from('imoveis_proprios').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('imoveis_proprios').insert(payload);
        if (error) throw error;
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

  return (
    <CrmLayout>
      <Button variant="ghost" onClick={() => navigate('/crm/imoveis')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />Voltar
      </Button>
      <h1 className="text-2xl font-bold mb-6">{id ? 'Editar' : 'Novo'} Imóvel</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold">Informações Básicas</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <FormField control={form.control} name="titulo" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel>Título *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="codigo_interno" render={({ field }) => (
                <FormItem><FormLabel>Código Interno</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="tipo" render={({ field }) => (
                <FormItem><FormLabel>Tipo *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{TIPO_IMOVEL.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="finalidade" render={({ field }) => (
                <FormItem><FormLabel>Finalidade *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{FINALIDADE.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{IMOVEL_STATUS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="descricao" render={({ field }) => (
              <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl></FormItem>
            )} />
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="font-semibold">Valores e Medidas</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <FormField control={form.control} name="preco" render={({ field }) => (
                <FormItem><FormLabel>Preço (R$) *</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="condominio" render={({ field }) => (
                <FormItem><FormLabel>Condomínio</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="iptu" render={({ field }) => (
                <FormItem><FormLabel>IPTU</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="area" render={({ field }) => (
                <FormItem><FormLabel>Área útil (m²)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="area_total" render={({ field }) => (
                <FormItem><FormLabel>Área total (m²)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="quartos" render={({ field }) => (
                <FormItem><FormLabel>Quartos</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="suites" render={({ field }) => (
                <FormItem><FormLabel>Suítes</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="banheiros" render={({ field }) => (
                <FormItem><FormLabel>Banheiros</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="vagas" render={({ field }) => (
                <FormItem><FormLabel>Vagas</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl></FormItem>
              )} />
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="font-semibold">Localização</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <FormField control={form.control} name="cep" render={({ field }) => (
                <FormItem><FormLabel>CEP</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="endereco" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel>Endereço</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="bairro" render={({ field }) => (
                <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="cidade" render={({ field }) => (
                <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="estado" render={({ field }) => (
                <FormItem><FormLabel>Estado</FormLabel><FormControl><Input maxLength={2} {...field} /></FormControl></FormItem>
              )} />
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

          <Card className="p-6">
            <div className="flex items-center justify-between mb-3">
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

          <div className="flex justify-between">
            {id ? (
              <Button type="button" variant="destructive" onClick={handleDelete}><Trash2 className="h-4 w-4 mr-2" />Excluir</Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/crm/imoveis')}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </div>
        </form>
      </Form>
    </CrmLayout>
  );
}
