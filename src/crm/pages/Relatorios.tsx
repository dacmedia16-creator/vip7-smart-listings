import { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CrmLayout } from '../components/CrmLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LEAD_STATUS, LEAD_ORIGEM, fmtMoney } from '../lib/leads';

function toCSV(rows: any[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n;]/.test(s) ? `"${s}"` : s;
  };
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
}

function download(filename: string, content: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function Relatorios() {
  const [summary, setSummary] = useState({ leads: 0, imoveis: 0, fechamento: 0, valor: 0 });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('leads').select('status_funil, orcamento_max');
      const { count: imCount } = await supabase.from('imoveis_proprios').select('id', { count: 'exact', head: true });
      const all = data ?? [];
      setSummary({
        leads: all.length,
        imoveis: imCount ?? 0,
        fechamento: all.filter((x) => x.status_funil === 'fechamento').length,
        valor: all.filter((x) => x.status_funil !== 'perdido').reduce((s, x) => s + Number(x.orcamento_max || 0), 0),
      });
    })();
  }, []);

  const exportLeads = async () => {
    const { data } = await supabase.from('leads').select('nome, telefone, email, origem, status_funil, tipo_imovel, finalidade, cidade_interesse, bairro_interesse, orcamento_min, orcamento_max, observacoes, created_at');
    download(`leads-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(data ?? []));
  };

  const exportImoveis = async () => {
    const { data } = await supabase.from('imoveis_proprios').select('codigo_interno, titulo, tipo, finalidade, status, preco, area, quartos, banheiros, vagas, cidade, bairro, created_at');
    download(`imoveis-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(data ?? []));
  };

  const exportTarefas = async () => {
    const { data } = await supabase.from('tarefas').select('titulo, tipo, prioridade, status, data_hora, descricao, created_at');
    download(`tarefas-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(data ?? []));
  };

  return (
    <CrmLayout>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><FileText className="h-6 w-6" />Relatórios</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4"><p className="text-sm text-muted-foreground">Total de Leads</p><p className="text-2xl font-bold">{summary.leads}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground">Imóveis</p><p className="text-2xl font-bold">{summary.imoveis}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground">Em fechamento</p><p className="text-2xl font-bold">{summary.fechamento}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground">Pipeline</p><p className="text-xl font-bold text-primary">{fmtMoney(summary.valor)}</p></Card>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold mb-4">Exportar dados (CSV)</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <Button onClick={exportLeads} variant="outline"><Download className="h-4 w-4 mr-2" />Leads</Button>
          <Button onClick={exportImoveis} variant="outline"><Download className="h-4 w-4 mr-2" />Imóveis</Button>
          <Button onClick={exportTarefas} variant="outline"><Download className="h-4 w-4 mr-2" />Tarefas</Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">Exportações em PDF e Excel avançado estão previstas para a Fase 3.</p>
      </Card>
    </CrmLayout>
  );
}
