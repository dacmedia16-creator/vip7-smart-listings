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
import { Loader2, Upload, FileSpreadsheet, Download, ArrowLeft, Users } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

type Row = Record<string, unknown>;

// Slots de proprietário (até 3 por linha)
const SLOTS = [1, 2, 3] as const;

type FieldDef = { key: string; label: string; aliases: string[]; required?: boolean };

const IMOVEL_FIELD: FieldDef = {
  key: 'codigo_imovel',
  label: 'Código do imóvel (Imoview)',
  required: true,
  aliases: ['codigo', 'código', 'codigo imovel', 'código imóvel', 'cod imovel', 'cod. imovel', 'cod. imóvel', 'id', 'id imovel', 'id imóvel', 'codigo do imovel', 'código do imóvel', 'codigo imoview', 'código imoview'],
};

const PROP_FIELDS_BASE: FieldDef[] = [
  { key: 'nome', label: 'Nome do proprietário', required: true, aliases: ['nome do proprietario', 'nome do proprietário', 'proprietario', 'proprietário', 'nome proprietario', 'nome proprietário', 'cliente', 'razao social', 'razão social'] },
  { key: 'tipo_pessoa', label: 'Tipo pessoa (PF/PJ)', aliases: ['tipo pessoa', 'tipo de pessoa', 'pj pf', 'pf pj', 'tipo'] },
  { key: 'cpf_cnpj', label: 'CPF/CNPJ', aliases: ['cpf', 'cnpj', 'cpf cnpj', 'cpf/cnpj', 'cpf do proprietario', 'cnpj do proprietario', 'documento'] },
  { key: 'rg', label: 'RG', aliases: ['rg', 'identidade'] },
  { key: 'email', label: 'E-mail', aliases: ['email', 'e-mail', 'email do proprietario', 'email proprietario'] },
  { key: 'telefone', label: 'Telefone', aliases: ['telefone', 'celular', 'fone', 'telefone do proprietario', 'telefone proprietario', 'whatsapp'] },
  { key: 'telefone_secundario', label: 'Telefone 2', aliases: ['telefone 2', 'telefone secundario', 'telefone secundário', 'fone 2', 'celular 2'] },
  { key: 'data_nascimento', label: 'Nascimento', aliases: ['nascimento', 'data nascimento', 'data de nascimento'] },
  { key: 'cep', label: 'CEP', aliases: ['cep'] },
  { key: 'endereco', label: 'Endereço', aliases: ['endereco', 'endereço', 'logradouro', 'rua'] },
  { key: 'numero', label: 'Número', aliases: ['numero', 'número', 'nº', 'n°'] },
  { key: 'complemento', label: 'Complemento', aliases: ['complemento'] },
  { key: 'bairro', label: 'Bairro', aliases: ['bairro'] },
  { key: 'cidade', label: 'Cidade', aliases: ['cidade', 'municipio', 'município'] },
  { key: 'estado', label: 'Estado (UF)', aliases: ['estado', 'uf'] },
  { key: 'codigo_imoview', label: 'Código Imoview do proprietário', aliases: ['codigo cliente', 'código cliente', 'codigo imoview do cliente', 'codigo do proprietario imoview'] },
  { key: 'percentual', label: '% participação', aliases: ['percentual', 'participacao', 'participação', 'percentual de participacao', 'percentual proprietario'] },
  { key: 'observacoes', label: 'Observações', aliases: ['observacoes', 'observações', 'obs', 'notas'] },
];

// Para slot N: prefixos esperados nos cabeçalhos
function aliasesForSlot(base: string[], slot: number): string[] {
  if (slot === 1) return base;
  return base.flatMap((a) => [`${a} ${slot}`, `${a}${slot}`, `proprietario ${slot} ${a}`, `proprietário ${slot} ${a}`]);
}

function allFields(): FieldDef[] {
  const fields: FieldDef[] = [IMOVEL_FIELD];
  for (const slot of SLOTS) {
    for (const f of PROP_FIELDS_BASE) {
      fields.push({
        key: `p${slot}_${f.key}`,
        label: `${slot === 1 ? 'Proprietário' : `Proprietário ${slot}`} — ${f.label}`,
        required: slot === 1 && f.required,
        aliases: aliasesForSlot(f.aliases, slot),
      });
    }
  }
  return fields;
}

const FIELDS = allFields();

const normHeader = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^\ufeff/, '').trim().replace(/\s+/g, ' ');

function autoMap(headers: string[]): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  const normToOriginal = new Map(headers.map((h) => [normHeader(h), h]));
  for (const f of FIELDS) {
    let found: string | null = null;
    for (const alias of f.aliases) {
      const m = normToOriginal.get(normHeader(alias));
      if (m) { found = m; break; }
    }
    if (!found) {
      for (const [n, orig] of normToOriginal) {
        if (f.aliases.some((a) => n === normHeader(a))) { found = orig; break; }
      }
    }
    result[f.key] = found;
  }
  return result;
}

type Result = {
  imoveis_processados: number;
  imoveis_ausentes: number[];
  clientes_novos: number;
  clientes_atualizados: number;
  vinculos_criados: number;
  vinculos_ja_existiam: number;
  erros: { linha: number; motivo: string }[];
};

const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '');
const str = (v: unknown) => { const s = String(v ?? '').trim(); return s || null; };

export default function ImportarProprietarios() {
  const { roles, loading: rolesLoading } = useRoles();
  const isAdmin = roles.includes('admin') || roles.includes('gestor');

  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<Result | null>(null);

  const preview = useMemo(() => rows.slice(0, 10), [rows]);


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
        const firstLine = text.split(/\r?\n/)[0] ?? '';
        const delim = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
        const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true, delimiter: delim });
        const data = parsed.data.filter((r) => Object.values(r).some((v) => String(v ?? '').trim() !== ''));
        const hdrs = (parsed.meta.fields ?? []).map((h) => h.replace(/^\ufeff/, ''));
        setHeaders(hdrs); setRows(data); setMapping(autoMap(hdrs));
        toast.success(`${file.name}: ${data.length} linhas`);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: false });
        const hdrSet = new Set<string>();
        for (let i = 0; i < Math.min(json.length, 50); i++) for (const k of Object.keys(json[i] || {})) hdrSet.add(k);
        const hdrs = Array.from(hdrSet);
        setHeaders(hdrs); setRows(json); setMapping(autoMap(hdrs));
        toast.success(`${file.name}: ${json.length} linhas`);
      } else { toast.error('Use CSV ou XLSX.'); }
    } catch (e) { toast.error('Falha: ' + (e as Error).message); }
  };

  const updateMap = (field: string, col: string) => setMapping((m) => ({ ...m, [field]: col === '__none__' ? null : col }));

  // Pré-contagem
  const codigosNaPlanilha = useMemo(() => {
    const col = mapping[IMOVEL_FIELD.key];
    if (!col) return [];
    const out: number[] = [];
    for (const r of rows) {
      const n = Number(String(r[col] ?? '').replace(/\D/g, ''));
      if (Number.isFinite(n) && n > 0) out.push(n);
    }
    return out;
  }, [rows, mapping]);

  const startImport = async () => {
    if (!mapping[IMOVEL_FIELD.key]) { toast.error('Mapeie o Código do imóvel'); return; }
    if (!mapping['p1_nome']) { toast.error('Mapeie o Nome do Proprietário 1'); return; }
    if (!rows.length) { toast.error('Nenhuma linha para importar'); return; }

    setImporting(true);
    setResult(null);
    setProgress({ done: 0, total: rows.length });

    const agg: Result = {
      imoveis_processados: 0, imoveis_ausentes: [], clientes_novos: 0,
      clientes_atualizados: 0, vinculos_criados: 0, vinculos_ja_existiam: 0, erros: [],
    };
    const ausentesSet = new Set<number>();

    try {
      // 1) Carrega todos os imóveis (id + codigo_imoview) — paginado
      const imovelByCodigo = new Map<number, string>();
      {
        let from = 0; const pageSize = 1000;
        while (true) {
          const { data, error } = await supabase
            .from('imoveis_proprios')
            .select('id, codigo_imoview')
            .not('codigo_imoview', 'is', null)
            .range(from, from + pageSize - 1);
          if (error) throw error;
          const chunk = (data || []) as { id: string; codigo_imoview: number }[];
          for (const r of chunk) imovelByCodigo.set(r.codigo_imoview, r.id);
          if (chunk.length < pageSize) break;
          from += pageSize;
        }
      }

      // 2) Processa linha a linha
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const linhaNum = i + 2; // +cabeçalho

        try {
          const codigoStr = String(row[mapping[IMOVEL_FIELD.key]!] ?? '').replace(/\D/g, '');
          const codigoImovel = Number(codigoStr);
          if (!codigoImovel) { agg.erros.push({ linha: linhaNum, motivo: 'Código do imóvel ausente/inválido' }); continue; }

          const imovelId = imovelByCodigo.get(codigoImovel);
          if (!imovelId) { ausentesSet.add(codigoImovel); continue; }

          agg.imoveis_processados++;

          // Processa cada slot
          for (const slot of SLOTS) {
            const get = (key: string) => {
              const col = mapping[`p${slot}_${key}`];
              return col ? row[col] : undefined;
            };
            const nome = str(get('nome'));
            if (!nome) continue; // slot vazio

            const cpfCnpj = str(get('cpf_cnpj'));
            const cpfDigits = cpfCnpj ? digits(cpfCnpj) : '';
            const isJuridica = (cpfDigits.length > 11) || /^pj$|juridica|jurídica/i.test(String(get('tipo_pessoa') ?? ''));
            const telefone = str(get('telefone'));
            const codigoImoviewCli = Number(digits(get('codigo_imoview'))) || null;

            const clientePayload: Record<string, unknown> = {
              nome,
              tipo_pessoa: isJuridica ? 'juridica' : 'fisica',
              cpf_cnpj: cpfCnpj,
              rg: str(get('rg')),
              email: str(get('email'))?.toLowerCase() ?? null,
              telefone,
              telefone_secundario: str(get('telefone_secundario')),
              data_nascimento: str(get('data_nascimento')),
              cep: str(get('cep')),
              endereco: str(get('endereco')),
              numero: str(get('numero')),
              complemento: str(get('complemento')),
              bairro: str(get('bairro')),
              cidade: str(get('cidade')),
              estado: str(get('estado')),
              observacoes: str(get('observacoes')),
              ativo: true,
            };

            // Dedup: codigo_imoview → cpf → telefone+nome
            let existing: { id: string; categorias: string[] | null } | null = null;
            if (codigoImoviewCli) {
              const { data } = await supabase.from('clientes').select('id, categorias').eq('codigo_imoview', codigoImoviewCli).maybeSingle();
              if (data) existing = data as { id: string; categorias: string[] | null };
            }
            if (!existing && cpfDigits) {
              const { data } = await supabase.from('clientes').select('id, categorias').eq('cpf_cnpj', cpfCnpj).maybeSingle();
              if (data) existing = data as { id: string; categorias: string[] | null };
            }
            if (!existing && telefone) {
              const { data } = await supabase.from('clientes').select('id, categorias').eq('telefone', telefone).ilike('nome', nome).maybeSingle();
              if (data) existing = data as { id: string; categorias: string[] | null };
            }

            let clienteId: string;
            if (existing) {
              const cats = new Set<string>(existing.categorias || []);
              cats.add('proprietario');
              // Atualiza só campos que vieram preenchidos
              const update: Record<string, unknown> = { categorias: Array.from(cats) };
              for (const [k, v] of Object.entries(clientePayload)) {
                if (v != null && v !== '') update[k] = v;
              }
              if (codigoImoviewCli) update.codigo_imoview = codigoImoviewCli;
              const { error } = await supabase.from('clientes').update(update).eq('id', existing.id);
              if (error) throw error;
              clienteId = existing.id;
              agg.clientes_atualizados++;
            } else {
              const insertPayload: Record<string, unknown> = {
                ...clientePayload,
                origem: 'imoview_csv',
                categorias: ['proprietario'],
              };
              if (codigoImoviewCli) insertPayload.codigo_imoview = codigoImoviewCli;
              const { data, error } = await supabase.from('clientes').insert(insertPayload as never).select('id').single();
              if (error) throw error;
              clienteId = (data as { id: string }).id;
              agg.clientes_novos++;
            }

            // Vínculo
            const pctRaw = get('percentual');
            const pct = pctRaw != null && pctRaw !== '' ? Number(String(pctRaw).replace(',', '.').replace(/[^\d.]/g, '')) : null;
            const { data: existingLink } = await supabase
              .from('cliente_imoveis')
              .select('id')
              .eq('cliente_id', clienteId)
              .eq('imovel_id', imovelId)
              .eq('papel', 'proprietario')
              .maybeSingle();

            if (existingLink) {
              agg.vinculos_ja_existiam++;
              if (pct != null && Number.isFinite(pct)) {
                await supabase.from('cliente_imoveis').update({ percentual: pct }).eq('id', (existingLink as { id: string }).id);
              }
            } else {
              const { error } = await supabase.from('cliente_imoveis').insert({
                cliente_id: clienteId, imovel_id: imovelId, papel: 'proprietario',
                percentual: pct != null && Number.isFinite(pct) ? pct : null,
              } as never);
              if (error) throw error;
              agg.vinculos_criados++;
            }
          }
        } catch (e) {
          agg.erros.push({ linha: linhaNum, motivo: (e as Error).message });
        }

        if (i % 10 === 0) setProgress({ done: i + 1, total: rows.length });
      }

      agg.imoveis_ausentes = Array.from(ausentesSet);
      setProgress({ done: rows.length, total: rows.length });
      setResult(agg);
      toast.success(`OK: ${agg.clientes_novos} novos, ${agg.clientes_atualizados} atualizados, ${agg.vinculos_criados} vínculos`);
    } catch (e) {
      toast.error('Falha: ' + (e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const downloadCodigos = () => {
    if (!result?.imoveis_ausentes.length) return;
    const csv = 'codigo_imoview\n' + result.imoveis_ausentes.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `imoveis-ausentes-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadErros = () => {
    if (!result?.erros.length) return;
    const csv = 'linha,motivo\n' + result.erros.map((e) => `${e.linha},"${e.motivo.replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `erros-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const ausentesPreview = useMemo(() => {
    if (!codigosNaPlanilha.length) return null;
    // não dá pra calcular antes de carregar imóveis; só mostra contagem total
    return { total: codigosNaPlanilha.length, unicos: new Set(codigosNaPlanilha).size };
  }, [codigosNaPlanilha]);

  return (
    <CrmLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/crm/imoveis" className="text-sm text-[#4A4A52] hover:text-[#1A1A1F] inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Imóveis
          </Link>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-[#0F0F12] flex items-center gap-2">
            <Users className="h-6 w-6 text-[#7A5A14]" /> Importar proprietários (planilha de imóveis)
          </h1>
          <p className="text-sm text-[#4A4A52]">
            Exporte do Imoview uma planilha de Imóveis contendo colunas do proprietário. O match é pelo código Imoview do imóvel.
            Suporta até 3 proprietários por linha (slots Proprietário, Proprietário 2, Proprietário 3).
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" /> 1. Selecione o arquivo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input type="file" accept=".csv,.txt,.xlsx,.xls" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {fileName && (
              <div className="text-sm text-[#4A4A52]">
                <Badge variant="outline" className="mr-2">{fileName}</Badge>
                {rows.length} linhas · {headers.length} colunas
              </div>
            )}
            {ausentesPreview && (
              <div className="text-xs text-[#4A4A52]">
                Códigos de imóvel na planilha: {ausentesPreview.total} ({ausentesPreview.unicos} únicos)
              </div>
            )}
          </CardContent>
        </Card>

        {headers.length > 0 && (
          <>
            <Card>
              <CardHeader><CardTitle className="text-base">2. Mapeamento de colunas</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {FIELDS.map((f) => (
                    <div key={f.key} className="space-y-1">
                      <Label className="text-xs">
                        {f.label} {f.required && <span className="text-red-600">*</span>}
                      </Label>
                      <Select value={mapping[f.key] ?? '__none__'} onValueChange={(v) => updateMap(f.key, v)}>
                        <SelectTrigger><SelectValue placeholder="— não importar —" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— não importar —</SelectItem>
                          {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">3. Pré-visualização (10 primeiras linhas)</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#E8E4D9] text-left">
                        {headers.map((h) => <th key={h} className="py-2 pr-3 font-medium text-[#4A4A52] whitespace-nowrap">{h}</th>)}
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
                  disabled={importing || !mapping[IMOVEL_FIELD.key] || !mapping['p1_nome']}
                  className="bg-[#C9A24C] text-[#0F0F12] hover:bg-[#B08F3D]"
                >
                  {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Importar {rows.length} linhas
                </Button>
                {result && result.erros.length > 0 && (
                  <Button variant="outline" onClick={downloadErros}>
                    <Download className="h-4 w-4 mr-2" /> Baixar erros ({result.erros.length})
                  </Button>
                )}
                {result && result.imoveis_ausentes.length > 0 && (
                  <Button variant="outline" onClick={downloadCodigos}>
                    <Download className="h-4 w-4 mr-2" /> Baixar códigos ausentes ({result.imoveis_ausentes.length})
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
                    <Badge className="bg-blue-100 text-blue-800 border-0">Imóveis processados: {result.imoveis_processados}</Badge>
                    <Badge className="bg-green-100 text-green-800 border-0">Clientes novos: {result.clientes_novos}</Badge>
                    <Badge className="bg-cyan-100 text-cyan-800 border-0">Clientes atualizados: {result.clientes_atualizados}</Badge>
                    <Badge className="bg-violet-100 text-violet-800 border-0">Vínculos criados: {result.vinculos_criados}</Badge>
                    <Badge className="bg-gray-100 text-gray-800 border-0">Vínculos já existiam: {result.vinculos_ja_existiam}</Badge>
                    {result.imoveis_ausentes.length > 0 && (
                      <Badge className="bg-orange-100 text-orange-800 border-0">Imóveis ausentes do CRM: {result.imoveis_ausentes.length}</Badge>
                    )}
                  </div>
                  {result.imoveis_ausentes.length > 0 && (
                    <div className="text-xs text-[#4A4A52]">
                      <span className="font-medium">Primeiros 30 códigos ausentes:</span>{' '}
                      {result.imoveis_ausentes.slice(0, 30).join(', ')}
                      {result.imoveis_ausentes.length > 30 && ' ...'}
                    </div>
                  )}
                  {result.erros.length > 0 && (
                    <div className="max-h-64 overflow-y-auto border border-[#E8E4D9] rounded p-2 text-xs">
                      {result.erros.slice(0, 50).map((e, i) => (
                        <div key={i} className="border-b border-[#F0E9D6] py-1">
                          <span className="font-mono text-[#4A4A52]">Linha {e.linha}:</span> {e.motivo}
                        </div>
                      ))}
                      {result.erros.length > 50 && <div className="pt-2 text-[#7A7A80]">+ {result.erros.length - 50} erros — baixe o CSV completo</div>}
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
