import { useEffect, useState } from 'react';
import { format, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CrmLayout } from '../components/CrmLayout';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function Agenda() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [tarefas, setTarefas] = useState<any[]>([]);

  useEffect(() => {
    const ref = date ?? new Date();
    (async () => {
      const { data } = await supabase
        .from('tarefas')
        .select('*, leads(nome)')
        .gte('data_hora', startOfMonth(ref).toISOString())
        .lte('data_hora', endOfMonth(ref).toISOString())
        .order('data_hora');
      setTarefas(data ?? []);
    })();
  }, [date]);

  const dayTasks = tarefas.filter((t) => date && isSameDay(new Date(t.data_hora), date));
  const markedDays = tarefas.map((t) => new Date(t.data_hora));

  return (
    <CrmLayout>
      <h1 className="text-2xl font-bold mb-6">Agenda</h1>
      <div className="grid lg:grid-cols-[auto_1fr] gap-6">
        <Card className="p-4">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            locale={ptBR}
            modifiers={{ marked: markedDays }}
            modifiersClassNames={{ marked: 'bg-primary/15 font-bold text-primary' }}
            className={cn('pointer-events-auto')}
          />
        </Card>

        <div>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <CalIcon className="h-4 w-4" />
            {date ? format(date, "EEEE, dd 'de' MMMM", { locale: ptBR }) : 'Selecione uma data'}
          </h2>
          {dayTasks.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">Nenhuma tarefa neste dia.</Card>
          ) : (
            <div className="space-y-2">
              {dayTasks.map((t) => (
                <Card key={t.id} className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium">{t.titulo}</h3>
                    <Badge variant="outline">{format(new Date(t.data_hora), 'HH:mm')}</Badge>
                  </div>
                  {t.descricao && <p className="text-sm text-muted-foreground">{t.descricao}</p>}
                  {t.leads?.nome && <p className="text-xs text-muted-foreground mt-1">Lead: {t.leads.nome}</p>}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </CrmLayout>
  );
}
