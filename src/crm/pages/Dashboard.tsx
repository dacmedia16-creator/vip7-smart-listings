import { useEffect, useState } from 'react';
import { CrmLayout } from '../components/CrmLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, Building2, CheckSquare, TrendingUp } from 'lucide-react';
import { useRoles } from '../hooks/useRole';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { LEAD_STATUS, LEAD_ORIGEM, fmtMoney } from '../lib/leads';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#a855f7', '#6366f1', '#10b981', '#94a3b8'];

export default function CrmDashboard() {
  const { isManager } = useRoles();
  const [stats, setStats] = useState({ leads: 0, imoveis: 0, tarefas: 0, fechamentos: 0, valorPipeline: 0 });
  const [funilData, setFunilData] = useState<any[]>([]);
  const [origemData, setOrigemData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [l, i, t, leadsAll] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }),
        supabase.from('imoveis_proprios').select('id', { count: 'exact', head: true }),
        supabase.from('tarefas').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
        supabase.from('leads').select('id, status_funil, origem, orcamento_max, created_at'),
      ]);

      const all = leadsAll.data ?? [];
      const fechamentos = all.filter((x) => x.status_funil === 'fechamento').length;
      const valorPipeline = all
        .filter((x) => !['perdido'].includes(x.status_funil))
        .reduce((sum, x) => sum + Number(x.orcamento_max || 0), 0);

      setStats({
        leads: l.count ?? 0, imoveis: i.count ?? 0, tarefas: t.count ?? 0, fechamentos, valorPipeline,
      });

      setFunilData(LEAD_STATUS.map((s) => ({
        name: s.label,
        value: all.filter((x) => x.status_funil === s.value).length,
      })));

      setOrigemData(LEAD_ORIGEM.map((o) => ({
        name: o.label,
        value: all.filter((x) => x.origem === o.value).length,
      })).filter((x) => x.value > 0));

      // 30-day trend
      const days = Array.from({ length: 30 }, (_, idx) => {
        const d = startOfDay(subDays(new Date(), 29 - idx));
        return { date: d, label: format(d, 'dd/MM', { locale: ptBR }), count: 0 };
      });
      all.forEach((lead) => {
        const d = startOfDay(new Date(lead.created_at));
        const found = days.find((day) => day.date.getTime() === d.getTime());
        if (found) found.count++;
      });
      setTrendData(days.map(({ label, count }) => ({ label, leads: count })));
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
          <h2 className="text-2xl font-semibold">{isManager ? 'Visão geral' : 'Meu painel'}</h2>
          <p className="text-sm text-muted-foreground mt-1">Resumo do CRM em tempo real</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Card key={c.label}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{c.label}</p>
                    <p className="text-3xl font-bold mt-1">{c.value}</p>
                  </div>
                  <div className={`p-2.5 rounded-lg ${c.color}`}><c.icon className="h-5 w-5" /></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Pipeline (valor potencial)</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{fmtMoney(stats.valorPipeline)}</p>
            <p className="text-xs text-muted-foreground mt-1">Soma dos orçamentos máximos dos leads em aberto.</p>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Leads por etapa</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={funilData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Leads por origem</CardTitle></CardHeader>
            <CardContent>
              {origemData.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados.</p> : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={origemData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                      {origemData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Novos leads (últimos 30 dias)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={3} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="leads" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </CrmLayout>
  );
}
