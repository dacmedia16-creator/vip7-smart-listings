import { useMemo, useState } from 'react';
import { CrmLayout } from '../components/CrmLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useRoles } from '../hooks/useRole';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, FileSpreadsheet, ArrowLeft, Download, CheckCircle2, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

type Row = Record<string, unknown>;

const BATCH_SIZE = 100;

// Parser para o "XLS" que na verdade é HTML exportado pelo Imoview.
function parseImoviewHtml(text: string): { headers: string[]; rows: Row[] } {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const rows: Row[] = [];
  let headers: string[] = [];
  const table = doc.querySelector('table');
  if (!table) return { headers, rows };
  const trs = Array.from(table.querySelectorAll('tr'));
  for (let i = 0; i < trs.length; i++) {
    const tr = trs[i];
    const ths = Array.from(tr.querySelectorAll('th')).map((el) => (el.textContent ?? '').trim());
    if (ths.length && !headers.length) {
      headers = ths;
      continue;
    }
    const tds = Array.from(tr.querySelectorAll('td')).map((el) => (el.textContent ?? '').trim());
    if (tds.length) {
      const row: Row = {};
      for (let j = 0; j < headers.length; j++) row[headers[j]] = tds[j] ?? '';
      rows.push(row);
    }
  }
  return { headers, rows };
}

type DryRunResp = {
  ok: boolean;
  total: number;
  atualizariam: number;
  nao_encontrados: number;
  nao_encontrados_amostra: number[];
  erros: { linha: number; motivo: string }[];
};

type RunResp = {
  ok: boolean;
  total: number;
  atualizados: number;
  nao_encontrados: number;
  nao_encontrados_amostra: number[];
  erros: { linha: number; motivo: string }[];
};

export default function ImportarImoveisCompleto() {
  const { roles, loading: rolesLoading } = useRoles();
  const isAdmin = roles.includes('admin') || roles.includes('gestor');

  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [dryRun, setDryRun] = useState<DryRunResp | null>(null);
  const [importing, setImporting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<RunResp | null>(null);

  const preview = useMemo(() => rows.slice(0, 5), [rows]);
  const hasCodigo = headers.includes('Codigo');

  if (rolesLoading) return null;
  if (!isAdmin) return <Navigate to="/crm" replace />;

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setDryRun(null);
    setResult(null);
    setRows([]);
    setHeaders([]);
    const ext = file.name.toLowerCase().split('.').pop();
    try {
      if (ext === 'xls') {
        // Imoview exporta HTML com extensão .xls, geralmente em latin-1
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        const head = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 200)).trimStart();
        if (head.startsWith('<')) {
          // Detecta encoding pelo cabeçalho, senão tenta latin-1
          const utf = new TextDecoder('utf-8').decode(bytes);
          const looksBroken = /�/.test(utf.slice(0, 5000));
          const text = looksBroken ? new TextDecoder('latin1').decode(bytes) : utf;
          const parsed = parseImoviewHtml(text);
          if (!parsed.headers.length) throw new Error('Nenhuma tabela encontrada no HTML.');
          setHeaders(parsed.headers);
          setRows(parsed.rows);
          toast.success(`${file.name}: ${parsed.rows.length} linhas`);
          return;
        }
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Row>(ws, { defval: '', raw: false });
        const hdrs = Object.keys(json[0] ?? {});
        setHeaders(hdrs); setRows(json);
        toast.success(`${file.name}: ${json.length} linhas`);
      } else if (ext === 'xlsx') {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Row>(ws, { defval: '', raw: false });
        const hdrs = Object.keys(json[0] ?? {});
        setHeaders(hdrs); setRows(json);
        toast.success(`${file.name}: ${json.length} linhas`);
      } else if (ext === 'csv' || ext === 'txt' || ext === 'html' || ext === 'htm') {
        const text = await file.text();
        if (text.trimStart().startsWith('<')) {
          const parsed = parseImoviewHtml(text);
          setHeaders(parsed.headers); setRows(parsed.rows);
          toast.success(`${file.name}: ${parsed.rows.length} linhas`);
        } else {
          toast.error('Para CSV, use a página de importar clientes. Esta espera o XLS/HTML do Imoview.');
        }
      } else {
        toast.error('Formato não suportado. Use .xls (HTML Imoview) ou .xlsx.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Falha ao ler arquivo: ' + (e as Error).message);
    }
  };

  const verify = async () => {
    if (!rows.length) return;
    setVerifying(true);
    setDryRun(null);
    try {
      // Envia em 1 lote pequeno para dry-run — mas a função aceita até 200/lote.
      // Para verificar tudo, roda em lotes e agrega.
      const agg: DryRunResp = { ok: true, total: 0, atualizariam: 0, nao_encontrados: 0, nao_encontrados_amostra: [], erros: [] };
      for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
        const slice = rows.slice(offset, offset + BATCH_SIZE);
        const { data, error } = await supabase.functions.invoke('import-imoveis-completo', {
          body: { rows: slice, dryRun: true },
        });
        if (error) throw new Error(error.message);
        const r = data as DryRunResp;
        agg.total += r.total;
        agg.atualizariam += r.atualizariam;
        agg.nao_encontrados += r.nao_encontrados;
        if (agg.nao_encontrados_amostra.length < 50 && r.nao_encontrados_amostra?.length) {
          agg.nao_encontrados_amostra.push(...r.nao_encontrados_amostra.slice(0, 50 - agg.nao_encontrados_amostra.length));
        }
        agg.erros.push(...(r.erros ?? []));
      }
      setDryRun(agg);
      toast.success(`${agg.atualizariam} imóveis serão atualizados, ${agg.nao_encontrados} não encontrados`);
    } catch (e) {
      toast.error('Falha na verificação: ' + (e as Error).message);
    } finally {
      setVerifying(false);
    }
  };

  const startImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    setResult(null);
    setProgress({ done: 0, total: rows.length });
    const agg: RunResp = { ok: true, total: 0, atualizados: 0, nao_encontrados: 0, nao_encontrados_amostra: [], erros: [] };
    try {
      for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
        const slice = rows.slice(offset, offset + BATCH_SIZE);
        const { data, error } = await supabase.functions.invoke('import-imoveis-completo', {
          body: { rows: slice },
        });
        if (error) throw new Error(error.message);
        const r = data as RunResp;
        agg.total += r.total;
        agg.atualizados += r.atualizados;
        agg.nao_encontrados += r.nao_encontrados;
        if (r.nao_encontrados_amostra?.length && agg.nao_encontrados_amostra.length < 100) {
          agg.nao_encontrados_amostra.push(...r.nao_encontrados_amostra.slice(0, 100 - agg.nao_encontrados_amostra.length));
        }
        agg.erros.push(...(r.erros ?? []));
        setProgress({ done: Math.min(offset + slice.length, rows.length), total: rows.length });
      }
      setResult(agg);
      toast.success(`Importação concluída: ${agg.atualizados} imóveis atualizados`);
    } catch (e) {
      toast.error('Falha: ' + (e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const downloadNaoEncontrados = () => {
    const codes = result?.nao_encontrados_amostra ?? dryRun?.nao_encontrados_amostra ?? [];
    if (!codes.length) return;
    const csv = 'codigo_imoview\n' + codes.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `nao-encontrados-${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <CrmLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/crm/imoveis" className="text-sm text-[#4A4A52] hover:text-[#1A1A1F] inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Imóveis
          </Link>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-[#0F0F12]">Importar dados completos (planilha Imoview)</h1>
          <p className="text-sm text-[#4A4A52]">
            Suba o arquivo <code>imoveis-Ativos_*.xls</code> exportado do Imoview. Cada linha atualiza o imóvel correspondente
            pelo código Imoview. Nada é criado do zero — apenas complementamos campos (descrição, anotações, áreas detalhadas,
            síndico, administradora, IPTU anual, características, cartório, etc).
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" /> 1. Selecione o arquivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="file"
              accept=".xls,.xlsx,.html,.htm"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {fileName && (
              <div className="text-sm text-[#4A4A52]">
                <Badge variant="outline" className="mr-2">{fileName}</Badge>
                {rows.length} linhas · {headers.length} colunas
                {!hasCodigo && rows.length > 0 && (
                  <span className="ml-2 text-red-600 inline-flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Coluna "Codigo" não encontrada
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {rows.length > 0 && hasCodigo && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">2. Pré-visualização (primeiras 5 linhas)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#E8E4D9] text-left">
                        {['Codigo', 'Tipo', 'Bairro', 'Cidade', 'Valor', 'Descricao'].map((h) => (
                          <th key={h} className="py-2 pr-3 font-medium text-[#4A4A52]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((r, i) => (
                        <tr key={i} className="border-b border-[#F0EBDE]">
                          {['Codigo', 'Tipo', 'Bairro', 'Cidade', 'Valor', 'Descricao'].map((h) => (
                            <td key={h} className="py-2 pr-3 max-w-[220px] truncate">{String(r[h] ?? '')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">3. Verificar antes de importar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={verify} disabled={verifying || importing} variant="outline">
                  {verifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Verificar correspondências
                </Button>
                {dryRun && (
                  <div className="text-sm space-y-2 border border-[#E8E4D9] rounded p-3 bg-[#FBF9F4]">
                    <div><b>{dryRun.atualizariam}</b> imóveis serão atualizados.</div>
                    <div><b>{dryRun.nao_encontrados}</b> códigos da planilha não existem no banco (serão ignorados).</div>
                    {dryRun.nao_encontrados_amostra.length > 0 && (
                      <details>
                        <summary className="cursor-pointer text-[#4A4A52]">Ver amostra dos códigos ignorados</summary>
                        <div className="font-mono text-xs mt-2 break-all">{dryRun.nao_encontrados_amostra.join(', ')}</div>
                        <Button size="sm" variant="ghost" onClick={downloadNaoEncontrados} className="mt-2">
                          <Download className="h-3 w-3 mr-1" /> CSV
                        </Button>
                      </details>
                    )}
                    {dryRun.erros.length > 0 && (
                      <div className="text-red-600">{dryRun.erros.length} linhas com erro de parse.</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">4. Importar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={startImport}
                  disabled={importing || verifying || !dryRun}
                  className="bg-[#C9A24C] text-[#0F0F12] hover:bg-[#B08F3D]"
                >
                  {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Importar {rows.length} imóveis
                </Button>
                {!dryRun && <p className="text-xs text-[#7A7A80]">Rode a verificação antes.</p>}
                {importing && (
                  <div className="space-y-1">
                    <Progress value={pct} />
                    <div className="text-xs text-[#4A4A52]">{progress.done} / {progress.total} ({pct}%)</div>
                  </div>
                )}
                {result && (
                  <div className="text-sm space-y-2 border border-[#E8E4D9] rounded p-3 bg-[#F3F9F3]">
                    <div className="inline-flex items-center gap-2 text-green-700">
                      <CheckCircle2 className="h-4 w-4" /> Concluído
                    </div>
                    <div><b>{result.atualizados}</b> imóveis atualizados</div>
                    <div><b>{result.nao_encontrados}</b> códigos ignorados</div>
                    {result.erros.length > 0 && (
                      <div className="text-red-600">
                        {result.erros.length} erros:
                        <pre className="text-xs mt-1 whitespace-pre-wrap">{result.erros.slice(0, 20).map((e) => e.motivo).join('\n')}</pre>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </CrmLayout>
  );
}
