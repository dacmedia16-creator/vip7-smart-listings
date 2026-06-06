import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CrmLayout } from '../components/CrmLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { LEAD_ORIGEM, LEAD_STATUS, TIPO_IMOVEL } from '../lib/leads';
import { useAuth } from '../hooks/useAuth';
import { useRoles } from '../hooks/useRole';
import { notifyUser, crmUrl } from '../lib/notify';

type Profile = { id: string; nome: string };

export default function LeadForm() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id && id !== 'novo');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isManager } = useRoles();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [corretores, setCorretores] = useState<Profile[]>([]);

  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    email: '',
    origem: 'manual',
    status_funil: 'novo',
    tipo_imovel: '',
    finalidade: 'venda',
    cidade_interesse: '',
    bairro_interesse: '',
    orcamento_min: '',
    orcamento_max: '',
    perfil_busca: '',
    observacoes: '',
    corretor_id: '',
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('user_id, profiles!inner(id, nome)')
        .in('role', ['corretor', 'gestor', 'admin']);
      const list: Profile[] = [];
      const seen = new Set<string>();
      (data ?? []).forEach((r: any) => {
        const p = r.profiles;
        if (p && !seen.has(p.id)) {
          seen.add(p.id);
          list.push({ id: p.id, nome: p.nome });
        }
      });
      setCorretores(list);
    })();
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const { data, error } = await supabase.from('leads').select('*').eq('id', id!).maybeSingle();
      if (error || !data) {
        toast({ title: 'Lead não encontrado', variant: 'destructive' });
        navigate('/crm/leads');
        return;
      }
      setForm({
        nome: data.nome ?? '',
        telefone: data.telefone ?? '',
        email: data.email ?? '',
        origem: data.origem ?? 'manual',
        status_funil: data.status_funil ?? 'novo',
        tipo_imovel: data.tipo_imovel ?? '',
        finalidade: data.finalidade ?? 'venda',
        cidade_interesse: data.cidade_interesse ?? '',
        bairro_interesse: data.bairro_interesse ?? '',
        orcamento_min: data.orcamento_min?.toString() ?? '',
        orcamento_max: data.orcamento_max?.toString() ?? '',
        perfil_busca: data.perfil_busca ?? '',
        observacoes: data.observacoes ?? '',
        corretor_id: data.corretor_id ?? '',
      });
      setLoading(false);
    })();
  }, [id, isEdit, navigate, toast]);

  // duplicate detection on telefone/email change (only on create)
  useEffect(() => {
    if (isEdit) return;
    const t = setTimeout(async () => {
      if (!form.telefone && !form.email) {
        setDuplicateId(null);
        return;
      }
      const { data } = await supabase.rpc('find_duplicate_lead', {
        _telefone: form.telefone || '',
        _email: form.email || '',
      });
      setDuplicateId((data as string) || null);
    }, 500);
    return () => clearTimeout(t);
  }, [form.telefone, form.email, isEdit]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.telefone.trim()) {
      toast({ title: 'Preencha nome e telefone', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload: any = {
      nome: form.nome.trim(),
      telefone: form.telefone.trim(),
      email: form.email.trim() || null,
      origem: form.origem,
      status_funil: form.status_funil,
      tipo_imovel: form.tipo_imovel || null,
      finalidade: form.finalidade || null,
      cidade_interesse: form.cidade_interesse || null,
      bairro_interesse: form.bairro_interesse || null,
      orcamento_min: form.orcamento_min ? Number(form.orcamento_min) : null,
      orcamento_max: form.orcamento_max ? Number(form.orcamento_max) : null,
      perfil_busca: form.perfil_busca || null,
      observacoes: form.observacoes || null,
      corretor_id: form.corretor_id || null,
    };

    let prevCorretor: string | null = null;
    if (isEdit) {
      const { data: prev } = await supabase.from('leads').select('corretor_id').eq('id', id!).maybeSingle();
      prevCorretor = (prev?.corretor_id as string | null) ?? null;
    }

    let result;
    if (isEdit) {
      result = await supabase.from('leads').update(payload).eq('id', id!).select().maybeSingle();
    } else {
      payload.created_by = user?.id;
      result = await supabase.from('leads').insert(payload).select().maybeSingle();
    }
    setSaving(false);
    if (result.error) {
      toast({ title: 'Erro ao salvar', description: result.error.message, variant: 'destructive' });
      return;
    }
    const saved = result.data!;
    // notify corretor on assignment / change
    if (saved.corretor_id && saved.corretor_id !== prevCorretor && saved.corretor_id !== user?.id) {
      notifyUser({
        recipientUserId: saved.corretor_id,
        tipo: 'lead_atribuido',
        data: {
          lead_nome: saved.nome,
          lead_telefone: saved.telefone,
          origem: saved.origem,
          url: crmUrl(`/crm/leads/${saved.id}`),
        },
      });
    }
    toast({ title: isEdit ? 'Lead atualizado' : 'Lead criado' });
    navigate(`/crm/leads/${saved.id}`);
  };

  if (loading) {
    return (
      <CrmLayout title={isEdit ? 'Editar Lead' : 'Novo Lead'}>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#7A7A80]" />
        </div>
      </CrmLayout>
    );
  }

  return (
    <CrmLayout title={isEdit ? 'Editar Lead' : 'Novo Lead'}>
      <div className="max-w-3xl mx-auto space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="text-[#2A2A30]">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>

        {duplicateId && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Já existe um lead com esse telefone/email nos últimos 30 dias.{' '}
              <button
                type="button"
                onClick={() => navigate(`/crm/leads/${duplicateId}`)}
                className="underline font-medium"
              >
                Abrir lead existente
              </button>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={onSubmit}>
          <Card className="border-[#E8E4D9]">
            <CardHeader>
              <CardTitle className="text-[#0F0F12] text-lg">Dados do lead</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nome completo *</Label>
                  <Input value={form.nome} onChange={(e) => set('nome', e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefone *</Label>
                  <Input value={form.telefone} onChange={(e) => set('telefone', e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Origem</Label>
                  <Select value={form.origem} onValueChange={(v) => set('origem', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEAD_ORIGEM.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de imóvel</Label>
                  <Select value={form.tipo_imovel} onValueChange={(v) => set('tipo_imovel', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {TIPO_IMOVEL.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Finalidade</Label>
                  <Select value={form.finalidade} onValueChange={(v) => set('finalidade', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="venda">Venda</SelectItem>
                      <SelectItem value="aluguel">Aluguel</SelectItem>
                      <SelectItem value="temporada">Temporada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Cidade de interesse</Label>
                  <Input value={form.cidade_interesse} onChange={(e) => set('cidade_interesse', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Bairro de interesse</Label>
                  <Input value={form.bairro_interesse} onChange={(e) => set('bairro_interesse', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Orçamento mín (R$)</Label>
                  <Input type="number" value={form.orcamento_min} onChange={(e) => set('orcamento_min', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Orçamento máx (R$)</Label>
                  <Input type="number" value={form.orcamento_max} onChange={(e) => set('orcamento_max', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Status do funil</Label>
                  <Select value={form.status_funil} onValueChange={(v) => set('status_funil', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEAD_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {isManager && (
                  <div className="space-y-1.5">
                    <Label>Corretor responsável</Label>
                    <Select value={form.corretor_id || 'none'} onValueChange={(v) => set('corretor_id', v === 'none' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Não atribuído" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não atribuído</SelectItem>
                        {corretores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Perfil de busca</Label>
                <Textarea rows={2} value={form.perfil_busca} onChange={(e) => set('perfil_busca', e.target.value)} placeholder="Ex: 3 quartos, perto de escola, varanda gourmet" />
              </div>
              <div className="space-y-1.5">
                <Label>Observações</Label>
                <Textarea rows={3} value={form.observacoes} onChange={(e) => set('observacoes', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-[#C9A24C] hover:bg-[#B08F3D] text-white">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isEdit ? 'Salvar alterações' : 'Criar lead'}
            </Button>
          </div>
        </form>
      </div>
    </CrmLayout>
  );
}
