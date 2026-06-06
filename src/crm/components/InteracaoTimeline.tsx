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
  { value: 'ligacao', label: 'Ligação', icon: Phone, color: 'bg-[#FBF3DC] text-[#7A5A14]' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'bg-emerald-50 text-emerald-600' },
  { value: 'email', label: 'Email', icon: Mail, color: 'bg-amber-50 text-amber-600' },
  { value: 'visita', label: 'Visita', icon: MapPin, color: 'bg-purple-50 text-purple-600' },
  { value: 'nota', label: 'Nota', icon: FileText, color: 'bg-[#F0E9D6] text-[#2A2A30]' },
] as const;

export const RESULTADO_INTERACAO = [
  { value: 'sem_resposta', label: 'Sem resposta', color: 'bg-[#F0E9D6] text-[#2A2A30]' },
  { value: 'interessado', label: 'Interessado', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'agendado', label: 'Agendado', color: 'bg-[#FBF3DC] text-[#7A5A14]' },
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
    <Card className="border-[#E8E4D9]">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="font-medium text-[#0F0F12]">Registrar contato</h3>
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

        <Button onClick={save} disabled={saving} className="bg-[#C9A24C] hover:bg-[#B08F3D] text-white">
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
  onChanged?: () => void;
}

export function InteracaoTimeline({ interacoes, profilesMap, onChanged }: TimelineProps) {
  const { isManager } = useRoles();
  const { toast } = useToast();
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterAutor, setFilterAutor] = useState<string>('todos');
  const [editing, setEditing] = useState<any | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editDescricao, setEditDescricao] = useState('');
  const [editTipo, setEditTipo] = useState('');
  const [editResultado, setEditResultado] = useState('');
  const [editDuracao, setEditDuracao] = useState('');
  const [editNotas, setEditNotas] = useState('');

  const openEdit = (i: any) => {
    setEditing(i);
    setEditDescricao(i.descricao ?? '');
    setEditTipo(i.tipo ?? 'nota');
    setEditResultado(i.resultado ?? '');
    setEditDuracao(i.duracao_minutos != null ? String(i.duracao_minutos) : '');
    setEditNotas(i.notas_internas ?? '');
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSavingEdit(true);
    const { error } = await supabase.from('lead_interacoes').update({
      descricao: editDescricao.trim(),
      tipo: editTipo as any,
      resultado: editResultado || null,
      duracao_minutos: editDuracao ? parseInt(editDuracao, 10) : null,
      notas_internas: editNotas.trim() || null,
    } as any).eq('id', editing.id);
    setSavingEdit(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Interação atualizada' });
    setEditing(null);
    onChanged?.();
  };

  const deleteInteracao = async (id: string) => {
    const { error } = await supabase.from('lead_interacoes').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Interação excluída' });
    onChanged?.();
  };

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
        <Filter className="h-4 w-4 text-[#7A7A80]" />
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
        <span className="text-xs text-[#4A4A52] ml-auto">{filtered.length} {filtered.length === 1 ? 'interação' : 'interações'}</span>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-[#4A4A52] text-center py-8">Nenhuma interação encontrada</p>
      )}

      {grouped.map((g) => (
        <div key={g.day.toISOString()}>
          <div className="text-xs font-medium text-[#4A4A52] uppercase tracking-wide mb-2">
            {format(g.day, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </div>
          <div className="space-y-2 border-l-2 border-[#F0E9D6] pl-4 ml-2">
            {g.items.map((i) => {
              const T = TIPO_INTERACAO.find((x) => x.value === i.tipo) ?? TIPO_INTERACAO[4];
              const R = RESULTADO_INTERACAO.find((x) => x.value === i.resultado);
              const Icon = T.icon;
              const autor = profilesMap[i.autor_id]?.nome ?? 'Usuário';
              return (
                <Card key={i.id} className="border-[#E8E4D9] relative">
                  <div className={`absolute -left-[26px] top-4 h-6 w-6 rounded-full ${T.color} flex items-center justify-center border-2 border-white`}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#0F0F12]">{T.label}</span>
                        {R && <Badge variant="secondary" className={R.color}>{R.label}</Badge>}
                        {i.duracao_minutos != null && (
                          <Badge variant="outline" className="text-xs">{i.duracao_minutos} min</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-[#4A4A52]">
                          {format(new Date(i.created_at), "HH:mm", { locale: ptBR })} · {autor}
                        </span>
                        {isManager && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(i)}>
                                <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                              </DropdownMenuItem>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-600">
                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir interação?</AlertDialogTitle>
                                    <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteInteracao(i.id)} className="bg-rose-600 hover:bg-rose-700">Excluir</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-[#1A1A1F] mt-1.5 whitespace-pre-wrap">{i.descricao}</p>
                    {i.notas_internas && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-100 rounded text-xs text-amber-900">
                        <span className="font-semibold">Nota interna:</span> {i.notas_internas}
                      </div>
                    )}
                    {i.proxima_acao_em && (
                      <p className="text-xs text-[#7A5A14] mt-1">
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

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar interação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={editTipo} onValueChange={setEditTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPO_INTERACAO.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Resultado</Label>
                <Select value={editResultado} onValueChange={setEditResultado}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {RESULTADO_INTERACAO.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Duração (min)</Label>
                <Input type="number" min="0" value={editDuracao} onChange={(e) => setEditDuracao(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Textarea rows={3} value={editDescricao} onChange={(e) => setEditDescricao(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Notas internas</Label>
              <Textarea rows={2} value={editNotas} onChange={(e) => setEditNotas(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={savingEdit || !editDescricao.trim()} className="bg-[#C9A24C] hover:bg-[#B08F3D] text-white">
              {savingEdit && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
