import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Phone, MessageSquare, Mail, MapPin, FileText, Filter, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRoles } from '../hooks/useRole';

export const TIPO_INTERACAO = [
  { value: 'ligacao', label: 'Ligação', icon: Phone, color: 'bg-blue-50 text-blue-600' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'bg-emerald-50 text-emerald-600' },
  { value: 'email', label: 'Email', icon: Mail, color: 'bg-amber-50 text-amber-600' },
  { value: 'visita', label: 'Visita', icon: MapPin, color: 'bg-purple-50 text-purple-600' },
  { value: 'nota', label: 'Nota', icon: FileText, color: 'bg-slate-100 text-slate-600' },
] as const;

export const RESULTADO_INTERACAO = [
  { value: 'sem_resposta', label: 'Sem resposta', color: 'bg-slate-100 text-slate-600' },
  { value: 'interessado', label: 'Interessado', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'agendado', label: 'Agendado', color: 'bg-blue-100 text-blue-700' },
  { value: 'descartado', label: 'Descartado', color: 'bg-rose-100 text-rose-700' },
  { value: 'outro', label: 'Outro', color: 'bg-amber-100 text-amber-700' },
] as const;

interface Props {
  leadId: string;
  authorId?: string;
  leadTelefone?: string | null;
  onAdded?: () => void;
}

export function InteracaoForm({ leadId, authorId, leadTelefone, onAdded }: Props) {
  const { toast } = useToast();
  const [tipo, setTipo] = useState<string>('ligacao');
  const [descricao, setDescricao] = useState('');
  const [resultado, setResultado] = useState<string>('');
  const [duracao, setDuracao] = useState<string>('');
  const [notas, setNotas] = useState('');
  const [proximaAcao, setProximaAcao] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!descricao.trim()) {
      toast({ title: 'Descreva o contato', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('lead_interacoes').insert({
      lead_id: leadId,
      tipo: tipo as any,
      descricao: descricao.trim(),
      autor_id: authorId,
      resultado: resultado || null,
      notas_internas: notas.trim() || null,
      duracao_minutos: duracao ? parseInt(duracao, 10) : null,
      proxima_acao_em: proximaAcao ? new Date(proximaAcao).toISOString() : null,
    } as any);
    setSaving(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    setDescricao(''); setResultado(''); setDuracao(''); setNotas(''); setProximaAcao('');
    toast({ title: 'Interação registrada' });
    onAdded?.();
  };

  const waLink = leadTelefone
    ? `https://wa.me/${leadTelefone.replace(/\D/g, '')}`
    : undefined;
  const telLink = leadTelefone ? `tel:${leadTelefone.replace(/\D/g, '')}` : undefined;

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="font-medium text-slate-900">Registrar contato</h3>
          {leadTelefone && (
            <div className="flex gap-2">
              {telLink && (
                <Button asChild size="sm" variant="outline">
                  <a href={telLink}><Phone className="h-3.5 w-3.5 mr-1" />Ligar</a>
                </Button>
              )}
              {waLink && (
                <Button asChild size="sm" variant="outline" className="text-emerald-700 border-emerald-200">
                  <a href={waLink} target="_blank" rel="noreferrer"><MessageSquare className="h-3.5 w-3.5 mr-1" />WhatsApp</a>
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPO_INTERACAO.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Resultado</Label>
            <Select value={resultado} onValueChange={setResultado}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {RESULTADO_INTERACAO.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Duração (min)</Label>
            <Input type="number" min="0" value={duracao} onChange={(e) => setDuracao(e.target.value)} placeholder="ex: 5" />
          </div>
        </div>

        <div>
          <Label className="text-xs">Descrição</Label>
          <Textarea rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="O que foi conversado..." />
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Notas internas (não visíveis ao lead)</Label>
            <Textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Próxima ação</Label>
            <Input type="datetime-local" value={proximaAcao} onChange={(e) => setProximaAcao(e.target.value)} />
          </div>
        </div>

        <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Adicionar interação
        </Button>
      </CardContent>
    </Card>
  );
}

interface TimelineProps {
  interacoes: any[];
  profilesMap: Record<string, { nome?: string; email?: string }>;
}

export function InteracaoTimeline({ interacoes, profilesMap }: TimelineProps) {
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterAutor, setFilterAutor] = useState<string>('todos');

  const autores = Array.from(new Set(interacoes.map((i) => i.autor_id).filter(Boolean))) as string[];

  const filtered = interacoes.filter((i) => {
    if (filterTipo !== 'todos' && i.tipo !== filterTipo) return false;
    if (filterAutor !== 'todos' && i.autor_id !== filterAutor) return false;
    return true;
  });

  // group by day
  const grouped: { day: Date; items: any[] }[] = [];
  filtered.forEach((i) => {
    const d = new Date(i.created_at);
    const last = grouped[grouped.length - 1];
    if (last && isSameDay(last.day, d)) last.items.push(i);
    else grouped.push({ day: d, items: [i] });
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center flex-wrap">
        <Filter className="h-4 w-4 text-slate-400" />
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-[150px] h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {TIPO_INTERACAO.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAutor} onValueChange={setFilterAutor}>
          <SelectTrigger className="w-[180px] h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os autores</SelectItem>
            {autores.map((a) => (
              <SelectItem key={a} value={a}>{profilesMap[a]?.nome ?? 'Usuário'}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-slate-500 ml-auto">{filtered.length} {filtered.length === 1 ? 'interação' : 'interações'}</span>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-8">Nenhuma interação encontrada</p>
      )}

      {grouped.map((g) => (
        <div key={g.day.toISOString()}>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            {format(g.day, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </div>
          <div className="space-y-2 border-l-2 border-slate-100 pl-4 ml-2">
            {g.items.map((i) => {
              const T = TIPO_INTERACAO.find((x) => x.value === i.tipo) ?? TIPO_INTERACAO[4];
              const R = RESULTADO_INTERACAO.find((x) => x.value === i.resultado);
              const Icon = T.icon;
              const autor = profilesMap[i.autor_id]?.nome ?? 'Usuário';
              return (
                <Card key={i.id} className="border-slate-200 relative">
                  <div className={`absolute -left-[26px] top-4 h-6 w-6 rounded-full ${T.color} flex items-center justify-center border-2 border-white`}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">{T.label}</span>
                        {R && <Badge variant="secondary" className={R.color}>{R.label}</Badge>}
                        {i.duracao_minutos != null && (
                          <Badge variant="outline" className="text-xs">{i.duracao_minutos} min</Badge>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {format(new Date(i.created_at), "HH:mm", { locale: ptBR })} · {autor}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 mt-1.5 whitespace-pre-wrap">{i.descricao}</p>
                    {i.notas_internas && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-100 rounded text-xs text-amber-900">
                        <span className="font-semibold">Nota interna:</span> {i.notas_internas}
                      </div>
                    )}
                    {i.proxima_acao_em && (
                      <p className="text-xs text-blue-600 mt-1">
                        Próxima ação: {format(new Date(i.proxima_acao_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
