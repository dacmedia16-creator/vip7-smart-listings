import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, ExternalLink } from 'lucide-react';
import { fmtMoney } from '../lib/leads';

type ImovelRow = {
  id: string;
  codigo_imoview: number | null;
  titulo: string;
  cidade: string | null;
  bairro: string | null;
  preco: number | null;
  fotos: string[] | null;
};

type Props = {
  carrinho?: string[] | null;
  visita?: string[] | null;
  proposta?: string[] | null;
};

function uniqInts(arrs: (string[] | null | undefined)[]): number[] {
  const set = new Set<number>();
  arrs.forEach((a) => (a || []).forEach((c) => {
    const n = parseInt(String(c), 10);
    if (Number.isFinite(n) && n > 0) set.add(n);
  }));
  return Array.from(set);
}

function Section({ titulo, codigos, byCodigo }: { titulo: string; codigos: string[]; byCodigo: Map<number, ImovelRow> }) {
  if (!codigos.length) return null;
  return (
    <div>
      <p className="text-xs text-[#4A4A52] uppercase tracking-wide mb-2">{titulo} ({codigos.length})</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {codigos.map((c) => {
          const n = parseInt(c, 10);
          const im = byCodigo.get(n);
          if (!im) {
            return (
              <div key={c} className="flex items-center gap-2 p-2 rounded border border-[#E8E4D9] bg-[#F8F5EE] text-sm text-[#4A4A52]">
                <Building2 className="h-4 w-4 shrink-0" />
                <span>#{c}</span>
                <span className="text-xs">— não cadastrado</span>
              </div>
            );
          }
          return (
            <Link
              key={c}
              to={`/crm/imoveis/${im.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-2 rounded border border-[#E8E4D9] hover:bg-[#FBF3DC] transition-colors group"
            >
              {im.fotos?.[0] ? (
                <img src={im.fotos[0]} alt="" className="h-12 w-16 object-cover rounded shrink-0" loading="lazy" />
              ) : (
                <div className="h-12 w-16 bg-[#F0E9D6] rounded flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-[#4A4A52]" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-[#0F0F12] truncate">
                  #{im.codigo_imoview} · {im.titulo}
                </div>
                <div className="text-xs text-[#4A4A52] truncate">
                  {[im.bairro, im.cidade].filter(Boolean).join(' · ')} {im.preco ? `· ${fmtMoney(im.preco)}` : ''}
                </div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-[#4A4A52] opacity-0 group-hover:opacity-100 shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function LeadImoveisInteresseCard({ carrinho, visita, proposta }: Props) {
  const [byCodigo, setByCodigo] = useState<Map<number, ImovelRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const carrinhoArr = carrinho || [];
  const visitaArr = visita || [];
  const propostaArr = proposta || [];

  useEffect(() => {
    const codigos = uniqInts([carrinhoArr, visitaArr, propostaArr]);
    if (!codigos.length) { setByCodigo(new Map()); setLoading(false); return; }
    setLoading(true);
    supabase
      .from('imoveis_proprios')
      .select('id, codigo_imoview, titulo, cidade, bairro, preco, fotos')
      .in('codigo_imoview', codigos)
      .then(({ data }) => {
        const m = new Map<number, ImovelRow>();
        (data || []).forEach((r: any) => { if (r.codigo_imoview != null) m.set(r.codigo_imoview, r); });
        setByCodigo(m);
        setLoading(false);
      });
  }, [carrinhoArr.join(','), visitaArr.join(','), propostaArr.join(',')]);

  const total = carrinhoArr.length + visitaArr.length + propostaArr.length;
  if (total === 0) return null;

  return (
    <Card className="border-[#E8E4D9]">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[#0F0F12]">Imóveis de interesse</h3>
          {loading && <span className="text-xs text-[#4A4A52]">carregando…</span>}
        </div>
        <Section titulo="Carrinho" codigos={carrinhoArr} byCodigo={byCodigo} />
        <Section titulo="Visitas" codigos={visitaArr} byCodigo={byCodigo} />
        <Section titulo="Propostas" codigos={propostaArr} byCodigo={byCodigo} />
      </CardContent>
    </Card>
  );
}
