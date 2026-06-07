import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Phone, Mail, ExternalLink, RefreshCw, UserPlus, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  listProprietariosByImovel,
  triggerSyncProprietarios,
  type ProprietarioVinculo,
} from '../lib/clientes';

function waLink(tel: string) {
  const digits = tel.replace(/\D/g, '');
  const withDDI = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${withDDI}`;
}

interface Props {
  imovelId: string | null;
  codigoImoview: number | null;
  onVincularClick?: () => void;
}

export function ProprietariosCard({ imovelId, codigoImoview, onVincularClick }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<ProprietarioVinculo[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const refresh = async () => {
    if (!imovelId) return;
    setLoading(true);
    try { setItems(await listProprietariosByImovel(imovelId)); }
    catch (e) { toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [imovelId]);

  const handleSyncFromImoview = async () => {
    if (!codigoImoview) {
      toast({ title: 'Sem código Imoview', description: 'Este imóvel não tem código Imoview vinculado.', variant: 'destructive' });
      return;
    }
    setSyncing(true);
    try {
      const res = await triggerSyncProprietarios('single', { codigoImovel: codigoImoview });
      const v = (res as { stats?: { vinculos?: number } })?.stats?.vinculos ?? 0;
      toast({ title: v > 0 ? `${v} proprietário(s) vinculado(s)` : 'Nenhum proprietário retornado pelo Imoview' });
      await refresh();
    } catch (e) {
      toast({ title: 'Erro na sync', description: (e as Error).message, variant: 'destructive' });
    } finally { setSyncing(false); }
  };

  if (!imovelId) return null;

  return (
    <Card className="p-4 mb-4 bg-[#FBF9F4] border-[#E8E0C9]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-[#7A5A14]" />
          <h3 className="font-semibold text-sm text-[#1A1A1F]">
            Proprietário{items.length !== 1 ? 's' : ''} {items.length > 0 && <span className="text-[#7A7A80] font-normal">({items.length})</span>}
          </h3>
        </div>
        <div className="flex gap-2">
          {codigoImoview && (
            <Button type="button" size="sm" variant="outline" onClick={handleSyncFromImoview} disabled={syncing}>
              {syncing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Buscar no Imoview
            </Button>
          )}
          {onVincularClick && (
            <Button type="button" size="sm" variant="outline" onClick={onVincularClick}>
              <UserPlus className="h-3 w-3 mr-1" />
              Vincular
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-[#7A7A80]">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="text-xs text-[#7A7A80]">
          Nenhum proprietário vinculado.{' '}
          {codigoImoview ? 'Clique em "Buscar no Imoview" para importar.' : 'Vincule manualmente na aba Relacionamentos.'}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-2">
          {items.map((v) => {
            const c = v.cliente;
            if (!c) return null;
            return (
              <div key={v.id} className="rounded-md border border-[#E8E0C9] bg-white p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="font-medium text-sm text-[#0F0F12]">{c.nome}</div>
                  {v.percentual != null && (
                    <Badge variant="outline" className="text-[10px]">{v.percentual}%</Badge>
                  )}
                </div>
                {c.cpf_cnpj && <div className="text-[11px] text-[#7A7A80] mb-1">{c.cpf_cnpj}</div>}
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {c.telefone && (
                    <a href={waLink(c.telefone)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-700 hover:underline">
                      <Phone className="h-3 w-3" /> {c.telefone}
                    </a>
                  )}
                  {c.telefone_secundario && (
                    <a href={waLink(c.telefone_secundario)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-700 hover:underline">
                      <Phone className="h-3 w-3" /> {c.telefone_secundario}
                    </a>
                  )}
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 text-blue-700 hover:underline">
                      <Mail className="h-3 w-3" /> {c.email}
                    </a>
                  )}
                  <Link to={`/crm/clientes/${c.id}`} className="inline-flex items-center gap-1 text-[#7A5A14] hover:underline ml-auto">
                    Ver cliente <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
