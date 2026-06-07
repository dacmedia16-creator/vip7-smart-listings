import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { CLIENTE_PAPEIS, listVinculosByImovel } from '../lib/clientes';

type Row = {
  id: string;
  papel: string;
  percentual: number | null;
  clientes: { id: string; nome: string; email: string | null; telefone: string | null } | null;
};

export function PessoasVinculadasCard({ imovelId }: { imovelId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listVinculosByImovel(imovelId)
      .then((d) => setRows(d as unknown as Row[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [imovelId]);

  const papelLabel = (p: string) => CLIENTE_PAPEIS.find((x) => x.value === p)?.label || p;

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4" /> Pessoas vinculadas</h3>
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum cliente vinculado.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => r.clientes && (
            <div key={r.id} className="flex items-center justify-between text-sm border-b border-[#F0E9D6] pb-2 last:border-0">
              <div className="min-w-0">
                <Link to={`/crm/clientes/${r.clientes.id}`} className="font-medium text-[#0F0F12] hover:underline truncate block">{r.clientes.nome}</Link>
                <div className="text-xs text-[#7A7A80]">{r.clientes.telefone || r.clientes.email || ''}</div>
              </div>
              <Badge variant="outline" className="text-xs ml-2 shrink-0">
                {papelLabel(r.papel)}{r.percentual ? ` ${r.percentual}%` : ''}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
