import { useEffect, useState } from 'react';
import { CrmLayout } from '../components/CrmLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { FUNIL_STATUS, statusMeta, fmtPhone, fmtMoney } from '../lib/leads';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { differenceInDays } from 'date-fns';

type Lead = {
  id: string;
  nome: string;
  telefone: string;
  status_funil: string;
  orcamento_max: number | null;
  bairro_interesse: string | null;
  created_at: string;
  updated_at: string;
};

export default function Funil() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('leads')
      .select('id, nome, telefone, status_funil, orcamento_max, bairro_interesse, created_at, updated_at')
      .in('status_funil', FUNIL_STATUS as any)
      .order('updated_at', { ascending: false })
      .limit(500);
    setLeads((data ?? []) as Lead[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const leadId = String(e.active.id);
    const newStatus = e.over?.id ? String(e.over.id) : null;
    if (!newStatus) return;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status_funil === newStatus) return;
    // optimistic
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status_funil: newStatus, updated_at: new Date().toISOString() } : l)));
    const { error } = await supabase.from('leads').update({ status_funil: newStatus as any }).eq('id', leadId);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      load();
    }
  };

  const activeLead = leads.find((l) => l.id === activeId);

  return (
    <CrmLayout title="Funil de Vendas">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Funil de Vendas</h2>
            <p className="text-sm text-slate-600">Arraste cards entre as colunas para alterar status</p>
          </div>
          <Button onClick={() => navigate('/crm/leads/novo')} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-1" /> Novo lead
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
        ) : (
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
              {FUNIL_STATUS.map((status) => {
                const colLeads = leads.filter((l) => l.status_funil === status);
                const total = colLeads.reduce((s, l) => s + (l.orcamento_max ?? 0), 0);
                return (
                  <Column key={status} status={status} count={colLeads.length} total={total}>
                    {colLeads.map((l) => (
                      <LeadCard key={l.id} lead={l} onOpen={() => navigate(`/crm/leads/${l.id}`)} />
                    ))}
                  </Column>
                );
              })}
            </div>
            <DragOverlay>
              {activeLead ? <div className="rotate-3 opacity-90"><CardInner lead={activeLead} /></div> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </CrmLayout>
  );
}

function Column({ status, count, total, children }: { status: string; count: number; total: number; children: React.ReactNode }) {
  const meta = statusMeta(status);
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className="flex flex-col min-h-[200px]">
      <div className={`rounded-t-lg px-3 py-2 border ${meta.color}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{meta.label}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-white/60">{count}</span>
        </div>
        <p className="text-[11px] mt-0.5 opacity-80">{fmtMoney(total)}</p>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 p-2 bg-slate-100/60 border border-t-0 border-slate-200 rounded-b-lg space-y-2 min-h-[100px] transition-colors ${isOver ? 'bg-blue-50' : ''}`}
      >
        {children}
        {count === 0 && <p className="text-xs text-slate-400 text-center py-8">Vazio</p>}
      </div>
    </div>
  );
}

function LeadCard({ lead, onOpen }: { lead: Lead; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        // only open if not dragging
        if (!isDragging) onOpen();
      }}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className="cursor-grab active:cursor-grabbing"
    >
      <CardInner lead={lead} />
    </div>
  );
}

function CardInner({ lead }: { lead: Lead }) {
  const daysIdle = differenceInDays(new Date(), new Date(lead.updated_at));
  const isNew = differenceInDays(new Date(), new Date(lead.created_at)) < 1;
  const isStale = daysIdle > 5;
  return (
    <Card className="border-slate-200 p-3 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-900 truncate">{lead.nome}</p>
        {isNew && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">NOVO</span>}
        {!isNew && isStale && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">{daysIdle}d</span>}
      </div>
      <p className="text-xs text-slate-600 mt-1">{fmtPhone(lead.telefone)}</p>
      {lead.bairro_interesse && <p className="text-xs text-slate-500 mt-0.5 truncate">{lead.bairro_interesse}</p>}
      {lead.orcamento_max && <p className="text-xs text-slate-700 mt-1 font-medium">{fmtMoney(lead.orcamento_max)}</p>}
    </Card>
  );
}
