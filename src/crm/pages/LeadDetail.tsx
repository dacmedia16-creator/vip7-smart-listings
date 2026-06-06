import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { CrmLayout } from '../components/CrmLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Edit, Loader2, Phone, Mail, MessageSquare, Trash2 } from 'lucide-react';
import { statusMeta, origemLabel, fmtPhone, fmtMoney, LEAD_STATUS } from '../lib/leads';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../hooks/useAuth';
import { useRoles } from '../hooks/useRole';

const TIPO_INTERACAO = [
  { value: 'ligacao', label: 'Ligação', icon: Phone },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'visita', label: 'Visita', icon: Edit },
  { value: 'nota', label: 'Nota', icon: Edit },
];

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isManager } = useRoles();
  const [lead, setLead] = useState<any>(null);
  const [interacoes, setInteracoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTipo, setNewTipo] = useState('nota');
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: l }, { data: ints }] = await Promise.all([
      supabase.from('leads').select('*').eq('id', id!).maybeSingle(),
      supabase.from('lead_interacoes').select('*').eq('lead_id', id!).order('created_at', { ascending: false }),
    ]);
    setLead(l);
    setInteracoes(ints ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const addInteracao = async () => {
    if (!newDesc.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('lead_interacoes').insert({
      lead_id: id!,
      tipo: newTipo as any,
      descricao: newDesc.trim(),
      autor_id: user?.id,
    });
    if (!error) {
      await supabase.from('leads').update({ last_contact_at: new Date().toISOString() }).eq('id', id!);
      setNewDesc('');
      load();
    } else {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const changeStatus = async (newStatus: string) => {
    const { error } = await supabase.from('leads').update({ status_funil: newStatus as any }).eq('id', id!);
    if (!error) {
      toast({ title: 'Status atualizado' });
      load();
    } else toast({ title: 'Erro', description: error.message, variant: 'destructive' });
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

          <TabsContent value="historico" className="space-y-3">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base text-slate-900">Registrar contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Select value={newTipo} onValueChange={setNewTipo}>
                    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPO_INTERACAO.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  rows={3}
                  placeholder="Descreva o contato..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
                <Button onClick={addInteracao} disabled={saving || !newDesc.trim()} className="bg-blue-600 hover:bg-blue-700">
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Adicionar
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-2">
              {interacoes.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">Nenhuma interação ainda</p>
              ) : (
                interacoes.map((i) => {
                  const T = TIPO_INTERACAO.find((x) => x.value === i.tipo);
                  const Icon = T?.icon ?? Edit;
                  return (
                    <Card key={i.id} className="border-slate-200">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-slate-900">{T?.label}</span>
                              <span className="text-xs text-slate-500">{format(new Date(i.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                            </div>
                            <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{i.descricao}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
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
