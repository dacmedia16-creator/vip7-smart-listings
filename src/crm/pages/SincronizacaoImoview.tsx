import { useEffect, useState } from 'react';
import { CrmLayout } from '../components/CrmLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useRoles } from '../hooks/useRole';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Download, RotateCw, Users, Home, Archive, Upload, FileSpreadsheet } from 'lucide-react';
import { triggerSyncClientes, triggerSyncProprietarios } from '../lib/clientes';

// Extrai códigos de imóveis a partir do .xls exportado pela Imoview
// (na verdade um HTML com <table>). Cada linha tem <td> e o código está na 1ª coluna.
async function parseImoviewXls(file: File): Promise<number[]> {
  const buf = await file.arrayBuffer();
  // Imoview exporta como latin-1 / windows-1252
  const text = new TextDecoder('windows-1252').decode(buf);
  const rows = text.match(/<tr>[\s\S]*?<\/tr>/gi) || [];
  const codes = new Set<number>();
  for (const r of rows) {
    if (!/<td/i.test(r)) continue;
    const firstTd = r.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
    if (!firstTd) continue;
    const raw = firstTd[1].replace(/<[^>]+>/g, '').trim();
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) codes.add(n);
  }
  return Array.from(codes).sort((a, b) => a - b);
}

type SyncLog = {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'ok' | 'partial' | 'error';
  mode: string;
  total: number;
  inserted: number;
  updated: number;
  unchanged: number;
  removed: number;
  photos_uploaded: number;
  errors_count: number;
};

export default function SincronizacaoImoview() {
  const { roles, loading: rolesLoading } = useRoles();
  const isAdmin = roles.includes('admin') || roles.includes('gestor');

  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [codigoSingle, setCodigoSingle] = useState('');
  const [inativosFile, setInativosFile] = useState<File | null>(null);
  const [inativosCodes, setInativosCodes] = useState<number[]>([]);
  const [inativosExistentes, setInativosExistentes] = useState<number | null>(null);
  const [parsing, setParsing] = useState(false);

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('imoview_sync_log')
      .select('id, started_at, finished_at, status, mode, total, inserted, updated, unchanged, removed, photos_uploaded, errors_count')
      .order('started_at', { ascending: false })
      .limit(20);
    setLogs((data as SyncLog[]) || []);
  };

  useEffect(() => {
    fetchLogs();
    const id = setInterval(fetchLogs, 3000);
    return () => clearInterval(id);
  }, []);

  if (rolesLoading) return null;
  if (!isAdmin) return <Navigate to="/crm" replace />;

  const trigger = async (mode: 'full' | 'incremental' | 'single' | 'desativados', codigo?: number) => {
    if (mode === 'full' && !confirm('Sincronização completa pode levar vários minutos e consumir bastante da API Imoview. Continuar?')) return;
    if (mode === 'desativados' && !confirm('Importar imóveis desativados/inativos do Imoview? Eles entrarão com status Inativo (não aparecem no site público).')) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('imoview-sync', {
        body: { mode, codigo },
      });
      if (error) throw error;
      toast.success(mode === 'single' ? 'Imóvel sincronizado' : `Sincronização iniciada: ${(data as { sync_id?: string })?.sync_id?.slice(0, 8)}`);
      fetchLogs();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (file: File | null) => {
    setInativosFile(file);
    setInativosCodes([]);
    setInativosExistentes(null);
    if (!file) return;
    setParsing(true);
    try {
      const codes = await parseImoviewXls(file);
      if (codes.length === 0) {
        toast.error('Nenhum código encontrado na planilha. Confirme que é a exportação .xls da Imoview.');
        return;
      }
      setInativosCodes(codes);
      // checar quantos já existem
      const { count } = await supabase
        .from('imoveis_proprios')
        .select('id', { count: 'exact', head: true })
        .in('codigo_imoview', codes);
      setInativosExistentes(count ?? 0);
      toast.success(`${codes.length} códigos detectados (${count ?? 0} já no banco)`);
    } catch (e) {
      toast.error('Erro lendo planilha: ' + (e as Error).message);
    } finally {
      setParsing(false);
    }
  };

  const importarInativos = async () => {
    if (inativosCodes.length === 0) return;
    if (!confirm(`Importar ${inativosCodes.length} imóveis como inativos? Pode levar 15–25 min em background. Pode fechar a aba — a importação continua.`)) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('imoview-sync', {
        body: { mode: 'inativos_por_codigos', codigos: inativosCodes },
      });
      if (error) throw error;
      toast.success(`Importação iniciada: ${(data as { sync_id?: string })?.sync_id?.slice(0, 8)}`);
      setInativosFile(null);
      setInativosCodes([]);
      setInativosExistentes(null);
      fetchLogs();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const running = logs.find((l) => l.status === 'running');

  return (
    <CrmLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F0F12]">Sincronização Imoview</h1>
          <p className="text-sm text-[#4A4A52]">Importa imóveis do Imoview para o banco local e faz mirror das fotos.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Disparar sincronização</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => trigger('full')}
                disabled={loading || !!running}
                className="bg-[#C9A24C] text-[#0F0F12] hover:bg-[#B08F3D]"
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Sincronização completa
              </Button>
              <Button
                variant="outline"
                onClick={() => trigger('incremental')}
                disabled={loading || !!running}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Incremental (últimos 7 dias)
              </Button>
            </div>
            <div className="flex gap-2 max-w-md">
              <Input
                placeholder="Código do imóvel"
                value={codigoSingle}
                onChange={(e) => setCodigoSingle(e.target.value)}
                disabled={loading}
              />
              <Button
                variant="outline"
                disabled={loading || !codigoSingle}
                onClick={() => trigger('single', Number(codigoSingle))}
              >
                <RotateCw className="h-4 w-4 mr-2" /> Re-sincronizar
              </Button>
            </div>
            {running && (
              <div className="text-sm text-[#7A5A14] bg-[#FBF3DC] border border-[#E8D9A8] rounded p-3">
                Sincronização em andamento — {running.total} lidos · {running.inserted} novos · {running.updated} atualizados · {running.unchanged} inalterados · {running.photos_uploaded} fotos · {running.errors_count} erros
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Archive className="h-4 w-4" /> Imóveis desativados / inativos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-[#4A4A52]">
              Importa do Imoview todos os imóveis marcados como inativos/desativados/suspensos. Eles entram com <strong>status Inativo</strong> e <strong>não aparecem no site público</strong> — ficam visíveis só no CRM filtrando por Status = Inativo.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => trigger('desativados')}
                disabled={loading || !!running}
                variant="outline"
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Reconciliar via API (marca sumiços)
              </Button>
            </div>

            <div className="border-t border-[#E8E4D9] pt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-[#1A1A1F]">
                <FileSpreadsheet className="h-4 w-4" /> Importar por planilha (.xls da Imoview)
              </div>
              <p className="text-xs text-[#4A4A52]">
                Exporte a lista de desativados no Imoview (Relatórios → Imóveis → filtrar Situação = Desativado → Exportar XLS) e suba aqui. Vou buscar os detalhes e as fotos de cada código e marcar como inativo no CRM.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  type="file"
                  accept=".xls,.html,.htm,.csv,.xlsx"
                  disabled={parsing || loading || !!running}
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  className="max-w-sm"
                />
                {parsing && <Loader2 className="h-4 w-4 animate-spin text-[#C9A24C]" />}
                {inativosCodes.length > 0 && (
                  <Badge className="bg-[#FBF3DC] text-[#7A5A14] border border-[#E8D9A8]">
                    {inativosCodes.length} códigos · {inativosExistentes ?? 0} já no banco · {inativosCodes.length - (inativosExistentes ?? 0)} novos
                  </Badge>
                )}
              </div>
              <Button
                onClick={importarInativos}
                disabled={loading || !!running || inativosCodes.length === 0}
                className="bg-[#C9A24C] text-[#0F0F12] hover:bg-[#B08F3D]"
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Importar {inativosCodes.length > 0 ? `${inativosCodes.length} inativos` : 'inativos'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Sincronização de Clientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#4A4A52]">Importa proprietários, compradores, locatários e interessados do Imoview, com os vínculos a imóveis.</p>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={async () => {
                  if (!confirm('Sincronizar TODOS os clientes do Imoview? Pode levar vários minutos.')) return;
                  setLoading(true);
                  try { await triggerSyncClientes('full'); toast.success('Sincronização de clientes iniciada'); fetchLogs(); }
                  catch (e) { toast.error((e as Error).message); }
                  finally { setLoading(false); }
                }}
                disabled={loading || !!running}
                className="bg-[#C9A24C] text-[#0F0F12] hover:bg-[#B08F3D]"
              >
                <Download className="h-4 w-4 mr-2" /> Sincronização completa de clientes
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  setLoading(true);
                  try { await triggerSyncClientes('incremental'); toast.success('Incremental de clientes iniciada'); fetchLogs(); }
                  catch (e) { toast.error((e as Error).message); }
                  finally { setLoading(false); }
                }}
                disabled={loading || !!running}
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Incremental clientes
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Home className="h-4 w-4" /> Sincronização de Proprietários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#4A4A52]">Busca no Imoview os proprietários de cada imóvel já importado e cria os vínculos em "Pessoas vinculadas".</p>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={async () => {
                  if (!confirm('Buscar proprietários de TODOS os imóveis com código Imoview? Pode levar vários minutos.')) return;
                  setLoading(true);
                  try { await triggerSyncProprietarios('full'); toast.success('Sincronização de proprietários iniciada'); fetchLogs(); }
                  catch (e) { toast.error((e as Error).message); }
                  finally { setLoading(false); }
                }}
                disabled={loading || !!running}
                className="bg-[#C9A24C] text-[#0F0F12] hover:bg-[#B08F3D]"
              >
                <Download className="h-4 w-4 mr-2" /> Sincronização completa de proprietários
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  setLoading(true);
                  try { await triggerSyncProprietarios('incremental', { hours: 24 }); toast.success('Incremental de proprietários iniciada'); fetchLogs(); }
                  catch (e) { toast.error((e as Error).message); }
                  finally { setLoading(false); }
                }}
                disabled={loading || !!running}
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Incremental proprietários (24h)
              </Button>
            </div>
          </CardContent>
        </Card>





        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[#4A4A52] border-b border-[#E8E4D9]">
                    <th className="py-2 pr-3">Início</th>
                    <th className="py-2 pr-3">Modo</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Lidos</th>
                    <th className="py-2 pr-3">Novos</th>
                    <th className="py-2 pr-3">Atual.</th>
                    <th className="py-2 pr-3">Inalt.</th>
                    <th className="py-2 pr-3">Removidos</th>
                    <th className="py-2 pr-3">Fotos</th>
                    <th className="py-2 pr-3">Erros</th>
                    <th className="py-2 pr-3">Duração</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => {
                    const duration = l.finished_at
                      ? Math.round((new Date(l.finished_at).getTime() - new Date(l.started_at).getTime()) / 1000)
                      : null;
                    const statusColor = l.status === 'ok' ? 'bg-green-100 text-green-800' : l.status === 'partial' ? 'bg-amber-100 text-amber-800' : l.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-[#FBF3DC] text-[#7A5A14]';
                    return (
                      <tr key={l.id} className="border-b border-[#F0E9D6]">
                        <td className="py-2 pr-3 text-[#1A1A1F]">{new Date(l.started_at).toLocaleString('pt-BR')}</td>
                        <td className="py-2 pr-3 text-[#2A2A30]">{l.mode}</td>
                        <td className="py-2 pr-3"><Badge className={statusColor + ' border-0'}>{l.status}</Badge></td>
                        <td className="py-2 pr-3">{l.total}</td>
                        <td className="py-2 pr-3">{l.inserted}</td>
                        <td className="py-2 pr-3">{l.updated}</td>
                        <td className="py-2 pr-3">{l.unchanged}</td>
                        <td className="py-2 pr-3">{l.removed}</td>
                        <td className="py-2 pr-3">{l.photos_uploaded}</td>
                        <td className="py-2 pr-3 text-red-600">{l.errors_count || ''}</td>
                        <td className="py-2 pr-3">{duration !== null ? `${duration}s` : '—'}</td>
                      </tr>
                    );
                  })}
                  {logs.length === 0 && (
                    <tr><td colSpan={11} className="py-6 text-center text-[#7A7A80]">Nenhuma sincronização ainda</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </CrmLayout>
  );
}
