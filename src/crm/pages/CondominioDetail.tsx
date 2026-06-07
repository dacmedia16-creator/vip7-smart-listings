import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CrmLayout } from '@/crm/components/CrmLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Building, MapPin } from 'lucide-react';
import { imovelStatusMeta } from '@/crm/lib/imoveis';

export default function CondominioDetail() {
  const { codigo } = useParams<{ codigo: string }>();
  const cod = Number(codigo);

  const { data: condo, isLoading: lc } = useQuery({
    queryKey: ['condominio', cod],
    enabled: Number.isFinite(cod),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('condominios_cache')
        .select('codigo, nome, cidade, updated_at')
        .eq('codigo', cod)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: imoveis = [], isLoading: li } = useQuery({
    queryKey: ['condominio-imoveis', cod],
    enabled: Number.isFinite(cod),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('imoveis_proprios')
        .select('id, codigo_interno, titulo, tipo, finalidade, preco, bairro, cidade, quartos, suites, vagas, area, status, fotos')
        .eq('codigo_condominio_imoview', cod)
        .eq('ativo', true)
        .order('preco', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const fmtMoney = (v: number | null) => v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  return (
    <CrmLayout>
      <div className="space-y-6">
        <div>
          <Link to="/crm/condominios">
            <Button variant="ghost" size="sm" className="text-[#4A4A52]">
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para Condomínios
            </Button>
          </Link>
        </div>

        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-xl bg-[#FBF3DC] flex items-center justify-center">
            <Building className="h-7 w-7 text-[#C9A24C]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#0F0F12]">
              {lc ? 'Carregando…' : (condo?.nome ?? 'Condomínio não encontrado')}
            </h1>
            {condo?.cidade && (
              <p className="text-sm text-[#4A4A52] mt-1 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {condo.cidade} • Código Imoview: {condo.codigo}
              </p>
            )}
          </div>
        </div>

        <Card className="bg-white border-[#E8E4D9] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E8E4D9] flex items-center justify-between bg-white">
            <h2 className="font-semibold text-[#0F0F12]">Imóveis vinculados</h2>
            <Badge variant="secondary" className="bg-[#FBF3DC] text-[#7A5A14]">{imoveis.length}</Badge>
          </div>
          <Table>
            <TableHeader className="bg-[#FAF8F3]">
              <TableRow className="border-b border-[#E8E4D9] hover:bg-transparent">
                <TableHead className="text-[#4A4A52]">Imóvel</TableHead>
                <TableHead className="text-[#4A4A52]">Finalidade</TableHead>
                <TableHead className="text-[#4A4A52]">Quartos/Suítes/Vagas</TableHead>
                <TableHead className="text-[#4A4A52]">Área</TableHead>
                <TableHead className="text-right text-[#4A4A52]">Preço</TableHead>
                <TableHead className="text-[#4A4A52]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {li ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-[#4A4A52]">Carregando…</TableCell></TableRow>
              ) : imoveis.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-[#4A4A52]">Nenhum imóvel vinculado</TableCell></TableRow>
              ) : imoveis.map((im) => {
                const sm = imovelStatusMeta(im.status as string);
                return (
                  <TableRow key={im.id} className="border-b border-[#E8E4D9] hover:bg-[#FAF8F3] even:bg-[#FBFAF5]">
                    <TableCell>
                      <Link to={`/crm/imoveis/${im.id}`} className="text-[#0F0F12] hover:text-[#7A5A14] font-medium">
                        {im.titulo}
                      </Link>
                      <div className="text-xs text-[#4A4A52]">{im.tipo} • {im.bairro}, {im.cidade}</div>
                    </TableCell>
                    <TableCell className="capitalize text-sm text-[#2A2A30] font-medium">{im.finalidade}</TableCell>
                    <TableCell className="text-sm text-[#2A2A30] font-medium">{im.quartos ?? 0}/{im.suites ?? 0}/{im.vagas ?? 0}</TableCell>
                    <TableCell className="text-sm text-[#2A2A30] font-medium">{im.area ? `${im.area} m²` : '—'}</TableCell>
                    <TableCell className="text-right font-semibold text-[#0F0F12]">{fmtMoney(im.preco as number)}</TableCell>
                    <TableCell><Badge className={`${sm.color} border border-current/20`}>{sm.label}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>
    </CrmLayout>
  );
}
