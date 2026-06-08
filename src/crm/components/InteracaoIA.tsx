import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bot, User, Loader2, MessageCircle, UserCheck, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRoles } from '../hooks/useRole';

interface Props {
  leadId: string;
}

interface Conversa {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  imovel_codigo: number | null;
  created_at: string;
}

interface LeadIA {
  ia_handoff: boolean;
  ia_handoff_at: string | null;
  ia_handoff_motivo: string | null;
}

export function InteracaoIA({ leadId }: Props) {
  const { toast } = useToast();
  const { isAdmin, isGestor } = useRoles();
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [lead, setLead] = useState<LeadIA | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [conv, ld] = await Promise.all([
      supabase
        .from('ia_conversas')
        .select('id, role, content, imovel_codigo, created_at')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true }),
      supabase
        .from('leads')
        .select('ia_handoff, ia_handoff_at, ia_handoff_motivo')
        .eq('id', leadId)
        .maybeSingle(),
    ]);
    if (conv.data) setConversas(conv.data as Conversa[]);
    if (ld.data) setLead(ld.data as LeadIA);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  const assumir = async () => {
    setBusy(true);
    const { error } = await supabase
      .from('leads')
      .update({
        ia_handoff: true,
        ia_handoff_at: new Date().toISOString(),
        ia_handoff_motivo: 'Corretor assumiu manualmente',
      })
      .eq('id', leadId);
    setBusy(false);
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    toast({ title: 'Conversa assumida — IA não responde mais nesse lead' });
    load();
  };

  const reativar = async () => {
    setBusy(true);
    const { error } = await supabase
      .from('leads')
      .update({ ia_handoff: false, ia_handoff_at: null, ia_handoff_motivo: null })
      .eq('id', leadId);
    setBusy(false);
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    toast({ title: 'IA reativada para esse lead' });
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const visiveis = conversas.filter((c) => c.role === 'user' || c.role === 'assistant');

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <h3 className="font-semibold">Conversa IA — WhatsApp</h3>
          {lead?.ia_handoff ? (
            <Badge variant="secondary" className="gap-1">
              <UserCheck className="h-3 w-3" /> Em handoff
            </Badge>
          ) : (
            <Badge className="gap-1 bg-emerald-100 text-emerald-700 border-emerald-200">
              <Bot className="h-3 w-3" /> IA atendendo
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {!lead?.ia_handoff && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" disabled={busy}>
                  Assumir conversa
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Assumir esta conversa?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A IA não responderá mais a esse lead. Você continua manualmente pelo WhatsApp.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={assumir}>Sim, assumir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {lead?.ia_handoff && (isAdmin || isGestor) && (
            <Button size="sm" variant="outline" onClick={reativar} disabled={busy} className="gap-1">
              <RotateCcw className="h-3 w-3" /> Reativar IA
            </Button>
          )}
        </div>
      </div>

      {lead?.ia_handoff && (
        <div className="text-xs text-muted-foreground px-3 py-2 rounded-md bg-amber-50 border border-amber-200">
          Handoff em {lead.ia_handoff_at ? format(new Date(lead.ia_handoff_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—'}
          {lead.ia_handoff_motivo ? ` — ${lead.ia_handoff_motivo}` : ''}
        </div>
      )}

      {visiveis.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">
          Ainda não houve troca de mensagens com a IA.
        </div>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {visiveis.map((c) => {
            const isUser = c.role === 'user';
            return (
              <div key={c.id} className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    isUser ? 'bg-primary text-primary-foreground' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    isUser
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-muted rounded-tl-sm'
                  }`}
                >
                  {c.content}
                  <div className={`text-[10px] mt-1 ${isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {format(new Date(c.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                    {c.imovel_codigo ? ` · imóvel #${c.imovel_codigo}` : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
