import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CrmLayout } from '../components/CrmLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Loader2 } from 'lucide-react';
import { LEAD_STATUS, statusMeta, origemLabel, fmtPhone, fmtMoney } from '../lib/leads';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Lead = {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  origem: string;
  status_funil: string;
  cidade_interesse: string | null;
  bairro_interesse: string | null;
  orcamento_max: number | null;
  corretor_id: string | null;
  created_at: string;
};

export default function LeadsList() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [origemFilter, setOrigemFilter] = useState<string>('all');
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    let q = supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(200);
    if (statusFilter !== 'all') q = q.eq('status_funil', statusFilter as any);
    if (origemFilter !== 'all') q = q.eq('origem', origemFilter as any);
    if (search.trim()) {
      const s = `%${search.trim()}%`;
      q = q.or(`nome.ilike.${s},telefone.ilike.${s},email.ilike.${s}`);
    }
    const { data, error } = await q;
    if (!error) setLeads((data ?? []) as Lead[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, origemFilter]);

  return (
    <CrmLayout title="Leads">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Leads</h2>
            <p className="text-sm text-slate-600">{leads.length} resultado(s)</p>
          </div>
          <Button onClick={() => navigate('/crm/leads/novo')} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-1" /> Novo lead
          </Button>
        </div>

        <Card className="border-slate-200">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap gap-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  load();
                }}
                className="flex-1 min-w-[240px] relative"
              >
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Buscar por nome, telefone, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </form>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {LEAD_STATUS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={origemFilter} onValueChange={setOrigemFilter}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Origem" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as origens</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="site_avaliacao">Site - Avaliação</SelectItem>
                  <SelectItem value="site_contato">Site - Contato</SelectItem>
                  <SelectItem value="site_whatsapp">Site - WhatsApp</SelectItem>
                  <SelectItem value="portal">Portal</SelectItem>
                  <SelectItem value="rede_social">Rede Social</SelectItem>
                  <SelectItem value="indicacao">Indicação</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={load}>Aplicar</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Interesse</TableHead>
                <TableHead>Orçamento</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                    Nenhum lead encontrado
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((l) => {
                  const meta = statusMeta(l.status_funil);
                  return (
                    <TableRow key={l.id} className="cursor-pointer" onClick={() => navigate(`/crm/leads/${l.id}`)}>
                      <TableCell className="font-medium text-slate-900">{l.nome}</TableCell>
                      <TableCell className="text-slate-600">{fmtPhone(l.telefone)}</TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {[l.bairro_interesse, l.cidade_interesse].filter(Boolean).join(' / ') || '—'}
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">{fmtMoney(l.orcamento_max)}</TableCell>
                      <TableCell className="text-slate-600 text-sm">{origemLabel(l.origem)}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded border ${meta.color}`}>{meta.label}</span>
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs">
                        {formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </CrmLayout>
  );
}
