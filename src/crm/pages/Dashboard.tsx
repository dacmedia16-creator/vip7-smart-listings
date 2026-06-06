import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CrmLayout } from '../components/CrmLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Users, Building2, CheckSquare, TrendingUp, AlertTriangle, Clock, CalendarClock } from 'lucide-react';
import { useRoles } from '../hooks/useRole';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { LEAD_STATUS, fmtMoney, fmtPhone, statusMeta } from '../lib/leads';
import { format, subDays, addDays, startOfDay, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CrmDashboard() {
  const { isManager } = useRoles();
  const [stats, setStats] = useState({ leads: 0, imoveis: 0, tarefasAtrasadas: 0, fechamentos: 0, valorPipeline: 0, conversao: 0, novos7d: 0 });
  const [funilData, setFunilData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [semContato, setSemContato] = useState<any[]>([]);
  const [atrasadosEtapa, setAtrasadosEtapa] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const now = new Date();
      const seteDias = subDays(now, 7).toISOString();
      const tresDias = subDays(now, 3);
      const seteDiasEtapa = subDays(now, 7);

      const [imoveisCount, leadsAll, tarefasAtrasadasCount, profiles] = await Promise.all([
        supabase.from('imoveis_proprios').select('id', { count: 'exact', head: true }),
        supabase.from('leads').select('id, nome, telefone, status_funil, origem, orcamento_max, created_at, updated_at, last_contact_at, corretor_id'),
        supabase.from('tarefas').select('id', { count: 'exact', head: true }).eq('status', 'pendente').lt('data_hora', now.toISOString()),
        supabase.from('profiles').select('id, nome'),
      ]);

      const all = leadsAll.data ?? [];
      const fechamentos = all.filter((x) => x.status_funil === 'fechamento').length;
      const perdidos = all.filter((x) => x.status_funil === 'perdido').length;
      const finalizados = fechamentos + perdidos;
      const conversao = finalizados > 0 ? Math.round((fechamentos / finalizados) * 100) : 0;
      const novos7d = all.filter((x) => x.created_at >= seteDias).length;
      const valorPipeline = all
        .filter((x) => !['perdido', 'fechamento'].includes(x.status_funil))
        .reduce((sum, x) => sum + Number(x.orcamento_max || 0), 0);

      setStats({
        leads: all.length,
        imoveis: imoveisCount.count ?? 0,
        tarefasAtrasadas: tarefasAtrasadasCount.count ?? 0,
        fechamentos,
        valorPipeline,
        conversao,
        novos7d,
      });

      setFunilData(LEAD_STATUS.filter((s) => s.value !== 'perdido').map((s) => ({
        name: s.label,
        value: all.filter((x) => x.status_funil === s.value).length,
      })));

      const days = Array.from({ length: 30 }, (_, idx) => {
        const d = startOfDay(subDays(now, 29 - idx));
        return { date: d, label: format(d, 'dd/MM', { locale: ptBR }), count: 0 };
      });
      all.forEach((lead) => {
        const d = startOfDay(new Date(lead.created_at));
        const found = days.find((day) => day.date.getTime() === d.getTime());
        if (found) found.count++;
      });
      setTrendData(days.map(({ label, count }) => ({ label, leads: count })));

      // Sem contato há +3 dias (não fechado/perdido)
      const sem = all
        .filter((l) => !['fechamento', 'perdido'].includes(l.status_funil))
        .filter((l) => {
          const ref = l.last_contact_at ? new Date(l.last_contact_at) : new Date(l.created_at);
          return ref < tresDias;
        })
        .sort((a, b) => {
          const ra = a.last_contact_at ? new Date(a.last_contact_at).getTime() : new Date(a.created_at).getTime();
          const rb = b.last_contact_at ? new Date(b.last_contact_at).getTime() : new Date(b.created_at).getTime();
          return ra - rb;
        })
        .slice(0, 8);
      setSemContato(sem);

      // Atrasados na etapa (sem mudança há +7 dias)
      const atras = all
        .filter((l) => !['fechamento', 'perdido'].includes(l.status_funil))
        .filter((l) => new Date(l.updated_at) < seteDiasEtapa)
        .sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())
        .slice(0, 8);
      setAtrasadosEtapa(atras);

      // Ranking corretores (leads ativos)
      const counts: Record<string, number> = {};
      all.filter((l) => !['fechamento', 'perdido'].includes(l.status_funil) && l.corretor_id)
        .forEach((l) => { counts[l.corretor_id] = (counts[l.corretor_id] || 0) + 1; });
      const pmap: Record<string, string> = {};
      (profiles.data ?? []).forEach((p: any) => { pmap[p.id] = p.nome; });
      setProfilesMap(pmap);
      const rank = Object.entries(counts)
        .map(([id, c]) => ({ id, nome: pmap[id] ?? 'Sem nome', count: c }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      setRanking(rank);
    })();
  }, []);

  const cards = [
    { label: 'Novos leads (7d)', value: stats.novos7d, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Em negociação', value: stats.leads - stats.fechamentos, icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
    { label: 'Taxa de conversão', value: `${stats.conversao}%`, icon: CheckSquare, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Tarefas atrasadas', value: stats.tarefasAtrasadas, icon: AlertTriangle, color: 'bg-rose-50 text-rose-600' },
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
            <p className="text-xs text-muted-foreground mt-1">Soma dos orçamentos máximos dos leads em aberto · {stats.imoveis} imóveis cadastrados</p>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                Leads sem contato há +3 dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              {semContato.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum lead pendente. 🎉</p>
              ) : (
                <ul className="space-y-2">
                  {semContato.map((l) => {
                    const ref = l.last_contact_at ? new Date(l.last_contact_at) : new Date(l.created_at);
                    const days = differenceInDays(new Date(), ref);
                    return (
                      <li key={l.id}>
                        <Link to={`/crm/leads/${l.id}`} className="flex items-center justify-between gap-2 p-2 rounded hover:bg-slate-50 transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{l.nome}</p>
                            <p className="text-xs text-muted-foreground">{fmtPhone(l.telefone)} · {statusMeta(l.status_funil).label}</p>
                          </div>
                          <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50 shrink-0">{days}d</Badge>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                Atrasados na etapa (+7 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {atrasadosEtapa.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem leads parados.</p>
              ) : (
                <ul className="space-y-2">
                  {atrasadosEtapa.map((l) => {
                    const days = differenceInDays(new Date(), new Date(l.updated_at));
                    return (
                      <li key={l.id}>
                        <Link to={`/crm/leads/${l.id}`} className="flex items-center justify-between gap-2 p-2 rounded hover:bg-slate-50 transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{l.nome}</p>
                            <p className="text-xs text-muted-foreground">{statusMeta(l.status_funil).label}</p>
                          </div>
                          <Badge variant="outline" className="text-rose-700 border-rose-200 bg-rose-50 shrink-0">{days}d parado</Badge>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

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
            <CardHeader><CardTitle className="text-base">Ranking de corretores (leads ativos)</CardTitle></CardHeader>
            <CardContent>
              {ranking.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum corretor com leads ativos.</p>
              ) : (
                <ul className="space-y-2">
                  {ranking.map((r, idx) => (
                    <li key={r.id} className="flex items-center justify-between gap-2 p-2 rounded hover:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 w-5">#{idx + 1}</span>
                        <span className="text-sm font-medium">{r.nome}</span>
                      </div>
                      <Badge variant="secondary">{r.count} leads</Badge>
                    </li>
                  ))}
                </ul>
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
