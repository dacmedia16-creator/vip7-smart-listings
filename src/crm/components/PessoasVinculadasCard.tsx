import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Phone, Mail } from 'lucide-react';
import { CLIENTE_PAPEIS, listVinculosByImovel } from '../lib/clientes';
import { AddInteressadoDialog } from './AddInteressadoDialog';

type Row = {
  id: string;
  papel: string;
  percentual: number | null;
  clientes: { id: string; nome: string; email: string | null; telefone: string | null } | null;
};

function waLink(tel: string) {
  const digits = tel.replace(/\D/g, '');
  const withDDI = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${withDDI}`;
}

export function PessoasVinculadasCard({ imovelId }: { imovelId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    listVinculosByImovel(imovelId)
      .then((d) => setRows(d as unknown as Row[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [imovelId]);

  useEffect(() => { load(); }, [load]);

  const papelLabel = (p: string) => CLIENTE_PAPEIS.find((x) => x.value === p)?.label || p;

  const proprietarios = rows.filter((r) => r.clientes && r.papel === 'proprietario');
  const interessados = rows.filter((r) => r.clientes && r.papel === 'interessado');
  const outros = rows.filter((r) => r.clientes && r.papel !== 'proprietario' && r.papel !== 'interessado');

  const renderRow = (r: Row) => r.clientes && (
    <div key={r.id} className="flex items-center justify-between text-sm border-b border-[#F0E9D6] pb-2 last:border-0">
      <div className="min-w-0">
        <Link to={`/crm/clientes/${r.clientes.id}`} className="font-medium text-[#0F0F12] hover:underline truncate block">{r.clientes.nome}</Link>
        <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-[#4A4A52]">
          {r.clientes.telefone && (
            <a href={waLink(r.clientes.telefone)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[#25D366]">
              <Phone className="h-3 w-3" /> {r.clientes.telefone}
            </a>
          )}
          {r.clientes.email && (
            <a href={`mailto:${r.clientes.email}`} className="flex items-center gap-1 hover:text-primary">
              <Mail className="h-3 w-3" /> {r.clientes.email}
            </a>
          )}
        </div>
      </div>
      <Badge variant="outline" className="text-xs ml-2 shrink-0">
        {papelLabel(r.papel)}{r.percentual ? ` ${r.percentual}%` : ''}
      </Badge>
    </div>
  );

  const secao = (titulo: string, itens: Row[]) => itens.length > 0 && (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
        {titulo} <span className="text-muted-foreground/70">({itens.length})</span>
      </p>
      <div className="space-y-2">{itens.map(renderRow)}</div>
    </div>
  );

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4" /> Pessoas vinculadas</h3>
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum cliente vinculado.</p>
      ) : (
        <div className="space-y-4">
          {secao('Proprietários', proprietarios)}
          {secao('Interessados', interessados)}
          {secao('Outros', outros)}
        </div>
      )}
      <div className="mt-3"><AddInteressadoDialog imovelId={imovelId} onAdded={load} /></div>
    </Card>
  );
}
