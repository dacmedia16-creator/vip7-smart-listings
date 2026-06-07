import { useMemo, useState } from 'react';
import { CrmLayout } from '../components/CrmLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
];

const normHeader = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

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
      // fallback: contains
      for (const [n, orig] of normToOriginal) {
        if (f.aliases.some((a) => n.includes(normHeader(a)))) { found = orig; break; }
      }
    }
    result[f.key] = found;
  }
  return result;
}

export default function ImportarClientes() {
  const { roles, loading: rolesLoading } = useRoles();
  const isAdmin = roles.includes('admin') || roles.includes('gestor');

  const [fileName, setFileName] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inseridos: number; atualizados: number; ignorados: number; erros: { linha: number; motivo: string }[] } | null>(null);

  const preview = useMemo(() => rows.slice(0, 10), [rows]);

  if (rolesLoading) return null;
  if (!isAdmin) return <Navigate to="/crm" replace />;

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setResult(null);
    const ext = file.name.toLowerCase().split('.').pop();
    try {
      if (ext === 'csv' || ext === 'txt') {
        const text = await file.text();
        const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
        const data = parsed.data.filter((r) => Object.values(r).some((v) => String(v ?? '').trim() !== ''));
        const hdrs = parsed.meta.fields ?? [];
        setHeaders(hdrs);
        setRows(data);
        setMapping(autoMap(hdrs));
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: false });
        const hdrs = json.length ? Object.keys(json[0]) : [];
        setHeaders(hdrs);
        setRows(json);
        setMapping(autoMap(hdrs));
      } else {
        toast.error('Formato não suportado. Use CSV ou XLSX.');
        return;
      }
      toast.success(`${file.name}: ${rows.length || '...'} linhas`);
    } catch (e) {
      toast.error('Falha ao ler arquivo: ' + (e as Error).message);
    }
  };

  const updateMap = (field: string, col: string) => {
    setMapping((m) => ({ ...m, [field]: col === '__none__' ? null : col }));
  };

  const startImport = async () => {
    if (!mapping.nome) { toast.error('Mapeie ao menos o campo Nome'); return; }
    if (!rows.length) { toast.error('Nenhuma linha para importar'); return; }
    setImporting(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('imoview-import-csv', {
        body: { rows, mapping },
      });
      if (error) throw error;
      const r = data as { inseridos: number; atualizados: number; ignorados: number; erros: { linha: number; motivo: string }[] };
      setResult(r);
      toast.success(`Importação concluída: ${r.inseridos} novos, ${r.atualizados} atualizados, ${r.ignorados} ignorados`);
    } catch (e) {
      toast.error((e as Error).message);
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
          <p className="text-sm text-[#4A4A52]">Suba uma planilha exportada do Imoview. Os clientes serão inseridos ou atualizados (por código Imoview ou CPF/CNPJ).</p>
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

            <div className="flex items-center gap-3">
              <Button
                onClick={startImport}
                disabled={importing || !mapping.nome}
                className="bg-[#C9A24C] text-[#0F0F12] hover:bg-[#B08F3D]"
              >
                {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Importar {rows.length} clientes
              </Button>
              {result && result.erros.length > 0 && (
                <Button variant="outline" onClick={downloadErrors}>
                  <Download className="h-4 w-4 mr-2" /> Baixar relatório de erros ({result.erros.length})
                </Button>
              )}
            </div>

            {result && (
              <Card>
                <CardHeader><CardTitle className="text-base">Resultado</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex gap-4 flex-wrap">
                    <Badge className="bg-green-100 text-green-800 border-0">Inseridos: {result.inseridos}</Badge>
                    <Badge className="bg-blue-100 text-blue-800 border-0">Atualizados: {result.atualizados}</Badge>
                    <Badge className="bg-amber-100 text-amber-800 border-0">Ignorados: {result.ignorados}</Badge>
                  </div>
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
