import { useMemo, useState } from 'react';
import { CrmLayout } from '../components/CrmLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useRoles } from '../hooks/useRole';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload, FileSpreadsheet, Download, ArrowLeft } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

type Row = Record<string, unknown>;

const CRM_FIELDS: { key: string; label: string; aliases: string[]; required?: boolean }[] = [
  { key: 'nome', label: 'Nome', required: true, aliases: ['nome', 'nome completo', 'razão social', 'razao social', 'cliente'] },
  { key: 'tipo_pessoa', label: 'Tipo (física/jurídica)', aliases: ['tipo', 'pessoa', 'tipo pessoa', 'tipo de pessoa'] },
  { key: 'cpf_cnpj', label: 'CPF / CNPJ', aliases: ['cpf', 'cnpj', 'cpf/cnpj', 'cpf cnpj', 'documento'] },
  { key: 'rg', label: 'RG', aliases: ['rg', 'identidade'] },
  { key: 'email', label: 'E-mail', aliases: ['email', 'e-mail', 'e mail'] },
  { key: 'telefone', label: 'Telefone', aliases: ['telefone', 'celular', 'telefone 1', 'fone'] },
  { key: 'telefone_secundario', label: 'Telefone 2', aliases: ['telefone 2', 'telefone secundário', 'telefone secundario', 'fone 2'] },
  { key: 'data_nascimento', label: 'Nascimento', aliases: ['nascimento', 'data de nascimento', 'data nascimento'] },
  { key: 'endereco', label: 'Endereço', aliases: ['endereço', 'endereco', 'logradouro', 'rua'] },
  { key: 'numero', label: 'Número', aliases: ['número', 'numero', 'nº', 'n°'] },
  { key: 'complemento', label: 'Complemento', aliases: ['complemento'] },
  { key: 'bairro', label: 'Bairro', aliases: ['bairro'] },
  { key: 'cidade', label: 'Cidade', aliases: ['cidade', 'município', 'municipio'] },
  { key: 'estado', label: 'Estado (UF)', aliases: ['estado', 'uf'] },
  { key: 'cep', label: 'CEP', aliases: ['cep'] },
  { key: 'categorias', label: 'Categorias', aliases: ['categoria', 'categorias', 'tipo de cliente', 'perfil'] },
  { key: 'codigo_imoview', label: 'Código Imoview', aliases: ['código', 'codigo', 'código imoview', 'codigo imoview', 'id', 'código do cliente'] },
  { key: 'observacoes', label: 'Observações', aliases: ['observações', 'observacoes', 'obs', 'notas'] },
  // Atendimento → vira lead se houver código de atendimento
  { key: 'finalidade', label: 'Finalidade (venda/locação)', aliases: ['finalidade'] },
  { key: 'codigo_atendimento', label: 'Código atendimento', aliases: ['codigo atendimento', 'código atendimento', 'cod atendimento', 'atendimento'] },
  { key: 'codigo_imovel', label: 'Código do imóvel (interesse)', aliases: ['codigo imovel', 'código imóvel', 'cod imovel', 'cod. imovel', 'imovel', 'imóvel', 'codigo do imovel', 'código do imóvel'] },
  { key: 'situacao', label: 'Situação', aliases: ['situacao', 'situação', 'status'] },
  { key: 'fase_atendimento', label: 'Fase atendimento', aliases: ['fase', 'fase atendimento', 'fase do atendimento', 'etapa'] },
  { key: 'corretor_nome', label: 'Corretor', aliases: ['corretor', 'responsavel', 'responsável', 'consultor'] },
];

const normHeader = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^\ufeff/, '').trim();

function autoMap(headers: string[]): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  const normToOriginal = new Map(headers.map((h) => [normHeader(h), h]));
  for (const f of CRM_FIELDS) {
    let found: string | null = null;
    for (const alias of f.aliases) {
      const m = normToOriginal.get(normHeader(alias));
      if (m) { found = m; break; }
    }
    if (!found) {
      for (const [n, orig] of normToOriginal) {
        if (f.aliases.some((a) => n.includes(normHeader(a)))) { found = orig; break; }
      }
    }
    result[f.key] = found;
  }
  return result;
}

type ResultAgg = {
  inseridos: number;
  atualizados: number;
  ignorados: number;
  leads_inseridos: number;
  leads_atualizados: number;
  vinculos_criados: number;
  vinculos_ignorados_sem_imovel: number;
  codigos_imoveis_nao_encontrados: number[];
  corretores_nao_encontrados: string[];
  erros: { linha: number; motivo: string }[];
};

const BATCH_SIZE = 300;

export default function ImportarClientes() {
  const { roles, loading: rolesLoading } = useRoles();
  const isAdmin = roles.includes('admin') || roles.includes('gestor');

  const [fileName, setFileName] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [result, setResult] = useState<ResultAgg | null>(null);

  const preview = useMemo(() => rows.slice(0, 10), [rows]);

  if (rolesLoading) return null;
  if (!isAdmin) return <Navigate to="/crm" replace />;

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setResult(null);
    setRows([]);
    setHeaders([]);
    const ext = file.name.toLowerCase().split('.').pop();
    try {
      if (ext === 'csv' || ext === 'txt') {
        let text = await file.text();
        if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
        // detecta separador
        const firstLine = text.split(/\r?\n/)[0] ?? '';
        const delim = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
        const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true, delimiter: delim });
        const data = parsed.data.filter((r) => Object.values(r).some((v) => String(v ?? '').trim() !== ''));
        const hdrs = (parsed.meta.fields ?? []).map((h) => h.replace(/^\ufeff/, ''));
        setHeaders(hdrs);
        setRows(data);
        setMapping(autoMap(hdrs));
        toast.success(`${file.name}: ${data.length} linhas`);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        // união dos cabeçalhos olhando todas as linhas
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: false });
        const hdrSet = new Set<string>();
        for (let i = 0; i < Math.min(json.length, 50); i++) {
          for (const k of Object.keys(json[i] || {})) hdrSet.add(k);
        }
        const hdrs = Array.from(hdrSet);
        setHeaders(hdrs);
        setRows(json);
        setMapping(autoMap(hdrs));
        toast.success(`${file.name}: ${json.length} linhas`);
      } else {
        toast.error('Formato não suportado. Use CSV ou XLSX.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Falha ao ler arquivo: ' + (e as Error).message);
    }
  };

  const updateMap = (field: string, col: string) => {
    setMapping((m) => ({ ...m, [field]: col === '__none__' ? null : col }));
  };

  // Reduz cada linha apenas às colunas usadas no mapping
  const compactRow = (row: Row, usedCols: string[]): Row => {
    const out: Row = {};
    for (const c of usedCols) out[c] = row[c];
    return out;
  };

  const startImport = async () => {
    if (!mapping.nome) { toast.error('Mapeie ao menos o campo Nome'); return; }
    if (!rows.length) { toast.error('Nenhuma linha para importar'); return; }

    setImporting(true);
    setResult(null);

    const usedCols = Array.from(new Set(Object.values(mapping).filter((v): v is string => !!v)));
    const total = rows.length;
    setProgress({ done: 0, total });

    const agg: ResultAgg = {
      inseridos: 0, atualizados: 0, ignorados: 0,
      leads_inseridos: 0, leads_atualizados: 0,
      vinculos_criados: 0, vinculos_ignorados_sem_imovel: 0,
      codigos_imoveis_nao_encontrados: [],
      corretores_nao_encontrados: [], erros: [],
    };
    const corretoresSet = new Set<string>();
    const codigosImoveisNaoEncSet = new Set<number>();

    try {
      for (let offset = 0; offset < total; offset += BATCH_SIZE) {
        const slice = rows.slice(offset, offset + BATCH_SIZE).map((r) => compactRow(r, usedCols));
        const { data, error } = await supabase.functions.invoke('imoview-import-csv', {
          body: { rows: slice, mapping, rowOffset: offset },
        });
        if (error) {
          // tenta extrair mensagem detalhada
          const ctx = (error as { context?: Response }).context;
          let detail = error.message;
          try { if (ctx) detail = await ctx.text(); } catch { /* ignore */ }
          throw new Error(detail || 'Erro no edge function');
        }
        const r = data as ResultAgg;
        agg.inseridos += r.inseridos || 0;
        agg.atualizados += r.atualizados || 0;
        agg.ignorados += r.ignorados || 0;
        agg.leads_inseridos += r.leads_inseridos || 0;
        agg.leads_atualizados += r.leads_atualizados || 0;
        agg.vinculos_criados += r.vinculos_criados || 0;
        agg.vinculos_ignorados_sem_imovel += r.vinculos_ignorados_sem_imovel || 0;
        for (const n of r.corretores_nao_encontrados || []) corretoresSet.add(n);
        for (const c of r.codigos_imoveis_nao_encontrados || []) codigosImoveisNaoEncSet.add(c);
        if (r.erros?.length) agg.erros.push(...r.erros);
        setProgress({ done: Math.min(offset + slice.length, total), total });
      }
      agg.corretores_nao_encontrados = Array.from(corretoresSet);
      agg.codigos_imoveis_nao_encontrados = Array.from(codigosImoveisNaoEncSet).slice(0, 100);
      setResult(agg);
      toast.success(`OK: ${agg.inseridos} novos, ${agg.atualizados} atualizados, ${agg.vinculos_criados} vínculos, ${agg.leads_inseridos + agg.leads_atualizados} leads`);
    } catch (e) {
      console.error(e);
      toast.error('Falha: ' + (e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const downloadErrors = () => {
    if (!result?.erros?.length) return;
    const csv = 'linha,motivo\n' + result.erros.map((e) => `${e.linha},"${e.motivo.replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `erros-importacao-${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <CrmLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/crm/clientes" className="text-sm text-[#4A4A52] hover:text-[#1A1A1F] inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Clientes
          </Link>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-[#0F0F12]">Importar clientes (CSV/Excel)</h1>
          <p className="text-sm text-[#4A4A52]">Suba uma planilha exportada do Imoview. Clientes são inseridos/atualizados; se houver código de atendimento, um lead é criado/atualizado.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" /> 1. Selecione o arquivo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {fileName && (
              <div className="text-sm text-[#4A4A52]">
                <Badge variant="outline" className="mr-2">{fileName}</Badge>
                {rows.length} linhas · {headers.length} colunas
              </div>
            )}
          </CardContent>
        </Card>

        {headers.length > 0 && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">2. Mapeamento de colunas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {CRM_FIELDS.map((f) => (
                    <div key={f.key} className="space-y-1">
                      <Label className="text-xs">
                        {f.label} {f.required && <span className="text-red-600">*</span>}
                      </Label>
                      <Select value={mapping[f.key] ?? '__none__'} onValueChange={(v) => updateMap(f.key, v)}>
                        <SelectTrigger><SelectValue placeholder="— não importar —" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— não importar —</SelectItem>
                          {headers.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">3. Pré-visualização (primeiras 10 linhas)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#E8E4D9] text-left">
                        {headers.map((h) => (
                          <th key={h} className="py-2 pr-3 font-medium text-[#4A4A52] whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((r, i) => (
                        <tr key={i} className="border-b border-[#F0E9D6]">
                          {headers.map((h) => (
                            <td key={h} className="py-1.5 pr-3 text-[#1A1A1F] whitespace-nowrap max-w-[200px] truncate">{String(r[h] ?? '')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Button
                  onClick={startImport}
                  disabled={importing || !mapping.nome}
                  className="bg-[#C9A24C] text-[#0F0F12] hover:bg-[#B08F3D]"
                >
                  {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Importar {rows.length} linhas
                </Button>
                {result && result.erros.length > 0 && (
                  <Button variant="outline" onClick={downloadErrors}>
                    <Download className="h-4 w-4 mr-2" /> Baixar erros ({result.erros.length})
                  </Button>
                )}
              </div>
              {importing && (
                <div className="space-y-1">
                  <Progress value={pct} />
                  <div className="text-xs text-[#4A4A52]">{progress.done} / {progress.total} ({pct}%)</div>
                </div>
              )}
            </div>

            {result && (
              <Card>
                <CardHeader><CardTitle className="text-base">Resultado</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex gap-2 flex-wrap">
                    <Badge className="bg-green-100 text-green-800 border-0">Clientes novos: {result.inseridos}</Badge>
                    <Badge className="bg-blue-100 text-blue-800 border-0">Clientes atualizados: {result.atualizados}</Badge>
                    <Badge className="bg-amber-100 text-amber-800 border-0">Ignorados: {result.ignorados}</Badge>
                    <Badge className="bg-emerald-100 text-emerald-800 border-0">Leads novos: {result.leads_inseridos}</Badge>
                    <Badge className="bg-cyan-100 text-cyan-800 border-0">Leads atualizados: {result.leads_atualizados}</Badge>
                    <Badge className="bg-violet-100 text-violet-800 border-0">Vínculos imóvel⇄cliente: {result.vinculos_criados}</Badge>
                    {result.vinculos_ignorados_sem_imovel > 0 && (
                      <Badge className="bg-orange-100 text-orange-800 border-0">Imóveis não encontrados: {result.vinculos_ignorados_sem_imovel}</Badge>
                    )}
                  </div>
                  {result.corretores_nao_encontrados.length > 0 && (
                    <div className="text-xs text-[#4A4A52]">
                      <span className="font-medium">Corretores não encontrados:</span> {result.corretores_nao_encontrados.join(', ')}
                    </div>
                  )}
                  {result.codigos_imoveis_nao_encontrados.length > 0 && (
                    <div className="text-xs text-[#4A4A52]">
                      <span className="font-medium">Códigos de imóvel ausentes do CRM (rode a sync de imóveis):</span>{' '}
                      {result.codigos_imoveis_nao_encontrados.join(', ')}
                    </div>
                  )}
                  {result.erros.length > 0 && (
                    <div className="max-h-64 overflow-y-auto border border-[#E8E4D9] rounded p-2 text-xs">
                      {result.erros.slice(0, 50).map((e, i) => (
                        <div key={i} className="border-b border-[#F0E9D6] py-1">
                          <span className="font-mono text-[#4A4A52]">Linha {e.linha}:</span> {e.motivo}
                        </div>
                      ))}
                      {result.erros.length > 50 && <div className="pt-2 text-[#7A7A80]">+ {result.erros.length - 50} erros — baixe o relatório completo</div>}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </CrmLayout>
  );
}
