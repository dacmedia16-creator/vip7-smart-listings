import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CrmLayout } from '../components/CrmLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Edit, Loader2, Trash2, Shuffle } from 'lucide-react';
import { statusMeta, origemLabel, fmtPhone, fmtMoney, LEAD_STATUS } from '../lib/leads';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../hooks/useAuth';
import { useRoles } from '../hooks/useRole';
import { InteracaoForm, InteracaoTimeline } from '../components/InteracaoTimeline';
import { notifyUser, crmUrl } from '../lib/notify';

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isManager } = useRoles();
  const [lead, setLead] = useState<any>(null);
  const [interacoes, setInteracoes] = useState<any[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, { nome?: string; email?: string }>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: l }, { data: ints }, { data: profs }] = await Promise.all([
      supabase.from('leads').select('*').eq('id', id!).maybeSingle(),
      supabase.from('lead_interacoes').select('*').eq('lead_id', id!).order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, nome, email'),
    ]);
    setLead(l);
    setInteracoes(ints ?? []);
    const map: Record<string, any> = {};
    (profs ?? []).forEach((p: any) => { map[p.id] = { nome: p.nome, email: p.email }; });
    setProfilesMap(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const changeStatus = async (newStatus: string) => {
    const prev = lead?.status_funil;
    const { error } = await supabase.from('leads').update({ status_funil: newStatus as any }).eq('id', id!);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Status atualizado' });
    if (lead?.corretor_id && prev !== newStatus) {
      notifyUser({
        recipientUserId: lead.corretor_id,
        tipo: 'mudanca_etapa',
        data: {
          lead_nome: lead.nome,
          from: statusMeta(prev).label,
          to: statusMeta(newStatus).label,
          url: crmUrl(`/crm/leads/${id}`),
        },
      });
    }
    load();
  };

  const onDelete = async () => {
    const { error } = await supabase.from('leads').delete().eq('id', id!);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Lead excluído' });
    navigate('/crm/leads');
  };

  if (loading || !lead) {
    return (
      <CrmLayout title="Lead">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </CrmLayout>
    );
  }

  const meta = statusMeta(lead.status_funil);

  return (
    <CrmLayout title={lead.nome}>
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/crm/leads')} className="text-slate-600">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/crm/leads/${id}/editar`)}>
              <Edit className="h-4 w-4 mr-1" /> Editar
            </Button>
            {isManager && (
              <Button variant="outline" onClick={async () => {
                const { data, error } = await supabase.rpc('distribuir_lead', { _lead_id: id! });
                if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
                if (data) {
                  notifyUser({
                    recipientUserId: data as string,
                    tipo: 'lead_atribuido',
                    data: {
                      lead_nome: lead.nome,
                      lead_telefone: fmtPhone(lead.telefone),
                      origem: origemLabel(lead.origem),
                      url: crmUrl(`/crm/leads/${id}`),
                    },
                  });
                }
                toast({ title: 'Lead distribuído', description: 'Corretor atribuído automaticamente.' });
                load();
              }}>
                <Shuffle className="h-4 w-4 mr-1" /> Distribuir
              </Button>
            )}
            {isManager && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-red-600 hover:bg-red-50 border-red-200">
                    <Trash2 className="h-4 w-4 mr-1" /> Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
                    <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">{lead.nome}</h2>
                <p className="text-sm text-slate-600 mt-1">Cadastrado {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: ptBR })}</p>
                {lead.corretor_id && profilesMap[lead.corretor_id] && (
                  <p className="text-xs text-slate-500 mt-1">Corretor: <span className="font-medium text-slate-700">{profilesMap[lead.corretor_id].nome}</span></p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded border ${meta.color}`}>{meta.label}</span>
                <Select value={lead.status_funil} onValueChange={changeStatus}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
              <Info label="Telefone" value={fmtPhone(lead.telefone)} />
              <Info label="Email" value={lead.email || '—'} />
              <Info label="Origem" value={origemLabel(lead.origem)} />
              <Info label="Orçamento" value={`${fmtMoney(lead.orcamento_min)} – ${fmtMoney(lead.orcamento_max)}`} />
              <Info label="Tipo" value={lead.tipo_imovel || '—'} />
              <Info label="Finalidade" value={lead.finalidade || '—'} />
              <Info label="Cidade" value={lead.cidade_interesse || '—'} />
              <Info label="Bairro" value={lead.bairro_interesse || '—'} />
            </div>
            {lead.perfil_busca && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Perfil de busca</p>
                <p className="text-sm text-slate-700">{lead.perfil_busca}</p>
              </div>
            )}
            {lead.observacoes && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Observações</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{lead.observacoes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="historico">
          <TabsList>
            <TabsTrigger value="historico">Histórico ({interacoes.length})</TabsTrigger>
            <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
          </TabsList>

          <TabsContent value="historico" className="space-y-4">
            <InteracaoForm
              leadId={id!}
              authorId={user?.id}
              leadTelefone={lead.telefone}
              onAdded={load}
            />
            <InteracaoTimeline interacoes={interacoes} profilesMap={profilesMap} onChanged={load} />
          </TabsContent>

          <TabsContent value="tarefas">
            <Card className="border-slate-200">
              <CardContent className="py-10 text-center text-sm text-slate-500">
                Gestão de tarefas será habilitada na Entrega 3.
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </CrmLayout>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-slate-900 mt-0.5">{value}</p>
    </div>
  );
}
