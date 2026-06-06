import { useEffect, useMemo, useState } from 'react';
import { Plus, Calendar as CalendarIcon, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { CrmLayout } from '../components/CrmLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '../hooks/useAuth';
import { notifyUser } from '../lib/notify';
import { format as fmtDate } from 'date-fns';

const TIPOS = [
  { v: 'ligacao', l: 'Ligação' },
  { v: 'visita', l: 'Visita' },
  { v: 'email', l: 'E-mail' },
  { v: 'whatsapp', l: 'WhatsApp' },
  { v: 'reuniao', l: 'Reunião' },
  { v: 'outro', l: 'Outro' },
];

const PRIORIDADES = [
  { v: 'baixa', l: 'Baixa', color: 'bg-[#F0E9D6] text-[#1A1A1F]' },
  { v: 'media', l: 'Média', color: 'bg-[#FBF3DC] text-[#7A5A14]' },
  { v: 'alta', l: 'Alta', color: 'bg-amber-100 text-amber-700' },
  { v: 'urgente', l: 'Urgente', color: 'bg-rose-100 text-rose-700' },
];

const STATUS_TAREFA = [
  { v: 'pendente', l: 'Pendente', icon: Clock, color: 'text-amber-600' },
  { v: 'em_andamento', l: 'Em andamento', icon: AlertCircle, color: 'text-[#7A5A14]' },
  { v: 'concluida', l: 'Concluída', icon: CheckCircle2, color: 'text-emerald-600' },
  { v: 'cancelada', l: 'Cancelada', icon: AlertCircle, color: 'text-[#4A4A52]' },
];

export default function Tarefas() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'todas' | 'pendente' | 'concluida'>('pendente');
  const [form, setForm] = useState({
    titulo: '', descricao: '', tipo: 'outro', prioridade: 'media',
    data_hora: '', lead_id: '',
  });

  const load = async () => {
    const { data } = await supabase.from('tarefas').select('*, leads(nome)').order('data_hora', { ascending: true });
    setRows(data ?? []);
  };

  useEffect(() => {
    load();
    supabase.from('leads').select('id, nome').order('created_at', { ascending: false }).limit(200).then(({ data }) => setLeads(data ?? []));
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'todas') return rows;
    if (filter === 'pendente') return rows.filter((r) => ['pendente', 'em_andamento'].includes(r.status));
    return rows.filter((r) => r.status === 'concluida');
  }, [rows, filter]);

  const handleCreate = async () => {
    if (!form.titulo || !form.data_hora) return toast({ title: 'Preencha título e data', variant: 'destructive' });
    const responsavelId = user!.id;
    const { error } = await supabase.from('tarefas').insert({
      titulo: form.titulo, descricao: form.descricao || null,
      tipo: form.tipo as any, prioridade: form.prioridade as any,
      data_hora: new Date(form.data_hora).toISOString(),
      lead_id: form.lead_id || null,
      responsavel_id: responsavelId, created_by: user!.id,
    });
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    if (responsavelId !== user!.id) {
      notifyUser({
        recipientUserId: responsavelId,
        tipo: 'nova_tarefa',
        data: {
          titulo: form.titulo,
          data_hora: fmtDate(new Date(form.data_hora), "dd/MM/yyyy 'às' HH:mm"),
          prioridade: form.prioridade,
        },
      });
    }
    toast({ title: 'Tarefa criada' });
    setOpen(false);
    setForm({ titulo: '', descricao: '', tipo: 'outro', prioridade: 'media', data_hora: '', lead_id: '' });
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('tarefas').update({ status: status as any }).eq('id', id);
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    load();
  };

  return (
    <CrmLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tarefas</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} tarefas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova Tarefa</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Título *</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Prioridade</Label>
                  <Select value={form.prioridade} onValueChange={(v) => setForm({ ...form, prioridade: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORIDADES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Data e hora *</Label><Input type="datetime-local" value={form.data_hora} onChange={(e) => setForm({ ...form, data_hora: e.target.value })} /></div>
              <div><Label>Lead vinculado (opcional)</Label>
                <Select value={form.lead_id || 'nenhum'} onValueChange={(v) => setForm({ ...form, lead_id: v === 'nenhum' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Nenhum</SelectItem>
                    {leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={handleCreate}>Criar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 mb-4">
        {(['pendente', 'concluida', 'todas'] as const).map((f) => (
          <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>
            {f === 'pendente' ? 'Pendentes' : f === 'concluida' ? 'Concluídas' : 'Todas'}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">Nenhuma tarefa.</Card>
        ) : filtered.map((t) => {
          const prio = PRIORIDADES.find((p) => p.v === t.prioridade)!;
          const st = STATUS_TAREFA.find((s) => s.v === t.status)!;
          const Icon = st.icon;
          const overdue = new Date(t.data_hora) < new Date() && t.status === 'pendente';
          return (
            <Card key={t.id} className="p-4 flex items-start gap-4">
              <button onClick={() => updateStatus(t.id, t.status === 'concluida' ? 'pendente' : 'concluida')} className={`mt-1 ${st.color}`}>
                <Icon className="h-5 w-5" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`font-medium ${t.status === 'concluida' ? 'line-through text-muted-foreground' : ''}`}>{t.titulo}</h3>
                  <Badge className={prio.color}>{prio.l}</Badge>
                  {overdue && <Badge variant="destructive">Atrasada</Badge>}
                </div>
                {t.descricao && <p className="text-sm text-muted-foreground mt-1">{t.descricao}</p>}
                <div className="flex gap-3 text-xs text-muted-foreground mt-2">
                  <span><CalendarIcon className="h-3 w-3 inline mr-1" />{format(new Date(t.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  {t.leads?.nome && <span>Lead: {t.leads.nome}</span>}
                </div>
              </div>
              <Select value={t.status} onValueChange={(v) => updateStatus(t.id, v)}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_TAREFA.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
              </Select>
            </Card>
          );
        })}
      </div>
    </CrmLayout>
  );
}
