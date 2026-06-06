import { useEffect, useState } from 'react';
import { CrmLayout } from '../components/CrmLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, Building2, CheckSquare, TrendingUp } from 'lucide-react';
import { useRoles } from '../hooks/useRole';

export default function CrmDashboard() {
  const { isManager } = useRoles();
  const [stats, setStats] = useState({ leads: 0, imoveis: 0, tarefas: 0, fechamentos: 0 });

  useEffect(() => {
    (async () => {
      const [l, i, t, f] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }),
        supabase.from('imoveis_proprios').select('id', { count: 'exact', head: true }),
        supabase.from('tarefas').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status_funil', 'fechamento'),
      ]);
      setStats({
        leads: l.count ?? 0,
        imoveis: i.count ?? 0,
        tarefas: t.count ?? 0,
        fechamentos: f.count ?? 0,
      });
    })();
  }, []);

  const cards = [
    { label: 'Leads totais', value: stats.leads, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Imóveis cadastrados', value: stats.imoveis, icon: Building2, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Tarefas pendentes', value: stats.tarefas, icon: CheckSquare, color: 'bg-amber-50 text-amber-600' },
    { label: 'Em fechamento', value: stats.fechamentos, icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
  ];

  return (
    <CrmLayout title="Dashboard">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">
            {isManager ? 'Visão geral' : 'Meu painel'}
          </h2>
          <p className="text-sm text-slate-600 mt-1">Resumo do CRM em tempo real</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Card key={c.label} className="border-slate-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-600">{c.label}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{c.value}</p>
                  </div>
                  <div className={`p-2.5 rounded-lg ${c.color}`}>
                    <c.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900 text-base">Bem-vindo ao CRM</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <p>Use o menu lateral para navegar entre Leads, Funil, Imóveis, Tarefas e Relatórios.</p>
            <p>Gráficos detalhados, distribuição automática e exportações virão na próxima entrega.</p>
          </CardContent>
        </Card>
      </div>
    </CrmLayout>
  );
}
