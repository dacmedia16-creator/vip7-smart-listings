import { useMemo, useState } from 'react';
import { CrmLayout } from '../components/CrmLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRoles } from '../hooks/useRole';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload, FileSpreadsheet, ArrowLeft, Info, Users } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import * as XLSX from 'xlsx';

type Row = Record<string, string>;

const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '');
const str = (v: unknown) => { const s = String(v ?? '').trim().replace(/\u00a0/g, ' '); return s ? s : null; };
const num = (v: unknown) => {
  const s = String(v ?? '').replace(/\u00a0/g, '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
};
const intOrNull = (v: unknown) => {
  const n = num(v);
  return n == null ? null : Math.trunc(n);
};
const boolFlag = (v: unknown) => {
  const s = String(v ?? '').trim().toLowerCase();
  return s === 'sim' || s === 's' || s === 'true' || s === '1' || s === 'x';
};

function mapFinalidade(v: string): string {
  const s = (v || '').toLowerCase();
  if (s.includes('loca') || s.includes('alug')) return 'aluguel';
  if (s.includes('venda') && (s.includes('loca') || s.includes('alug'))) return 'venda_aluguel';
  return 'venda';
}

// Booleanos do Imoview → chaves usadas em src/crm/lib/imoveis.ts (caracteristicas[])
const CARACT_MAP: Array<[string, string]> = [
  ['ArCondicionado', 'ar_condicionado'],
  ['AreaServico', 'area_servico'],
  ['ArmarioCozinha', 'armario_cozinha'],
  ['ArmarioBanheiro', 'armario_banheiro'],
  ['ArmarioQuarto', 'armario_quarto'],
  ['BoxBanheiro', 'box_banheiro'],
  ['Closet', 'closet'],
  ['Dce', 'dce'],
  ['Despensa', 'despensa'],
  ['Escritorio', 'escritorio'],
  ['Lavabo', 'lavabo'],
  ['Mobiliado', 'mobiliado'],
  ['Rouparia', 'rouparia'],
  ['SolManha', 'sol_manha'],
  ['VistaMar', 'vista_mar'],
  ['AreaPrivativa', 'area_privativa'],
  ['AguaIndividual', 'agua_individual'],
  ['Alarme', 'alarme'],
  ['AquecimentoEletrico', 'aquec_eletrico'],
  ['AquecimentoGas', 'aquec_gas'],
  ['AquecimentoSolar', 'aquec_solar'],
  ['BoxDespejo', 'box_despejo'],
  ['CercaEletrica', 'cerca_eletrica'],
  ['CircuitoTv', 'circuito_tv'],
  ['GasCanalizado', 'gas_canalizado'],
  ['Interfone', 'interfone'],
  ['Jardim', 'jardim'],
  ['Lavanderia', 'lavanderia'],
  ['Portaria24h', 'portaria_24h'],
  ['PortaoEletronico', 'portao_eletronico'],
  ['Quintal', 'quintal'],
  ['Seguranca24h', 'seguranca_24h'],
  ['Gramado', 'gramado'],
  ['Academia', 'academia'],
  ['Churrasqueira', 'churrasqueira'],
  ['Hidromassagem', 'hidromassagem'],
  ['HomeCinema', 'home_cinema'],
  ['Piscina', 'piscina'],
  ['Playground', 'playground'],
  ['QuadraPoliesportiva', 'quadra_poliesportiva'],
  ['QuadraTenis', 'quadra_tenis'],
  ['SalaMassagem', 'sala_massagem'],
  ['SalaoFestas', 'salao_festas'],
  ['SalaoJogos', 'salao_jogos'],
  ['Sauna', 'sauna'],
  ['Wifi', 'wifi'],
  ['EspacoGourmet', 'espaco_gourmet'],
];

type Payload = {
  codigo_imoview: number;
  titulo: string;
  tipo: string;
  finalidade: string;
  status: 'inativo';
  ativo: false;
  origem: string;
  preco: number;
  valor_anterior: number | null;
  condominio: number | null;
  iptu: number | null;
  iptu_anual: number | null;
  rentabilidade_pct: number | null;
  comissao_venda_pct: number | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  segundo_bairro: string | null;
  cidade: string | null;
  estado: string;
  regiao: string | null;
  ponto_referencia: string | null;
  area: number | null;
  area_total: number | null;
  area_externa: number | null;
  quartos: number | null;
  suites: number | null;
  banheiros: number | null;
  vagas: number | null;
  salas: number | null;
  varandas: number | null;
  edificio: string | null;
  condominio_nome: string | null;
  andar: string | null;
  num_andares: number | null;
  num_torres: number | null;
  total_unidades: number | null;
  unidades_por_andar: number | null;
  elevadores: number | null;
  construtora: string | null;
  ano_construcao: number | null;
  tipo_vaga: string | null;
  piso_acabamento: string | null;
  posicao_imovel: string | null;
  caracteristicas: string[];
  observacoes_internas: string | null;
  local_chaves: string | null;
  identificador_chaves: string | null;
  num_chaves: number | null;
  num_controles: number | null;
  horario_visita: string | null;
  na_planta: boolean;
  exclusivo: boolean;
  placa_faixa: string | null;
  destinacao: string | null;
  segundo_tipo: string | null;
  codigo_auxiliar: string | null;
  identificador_imovel: string | null;
};

function rowToImovel(r: Row): Payload | { skip: string } {
  const codigo = intOrNull(r['Codigo']);
  if (!codigo) return { skip: 'sem código' };
  const preco = num(r['Valor']) ?? 0;

  const tipo = str(r['Tipo']) ?? 'Outros';
  const bairro = str(r['Bairro']);
  const cidade = str(r['Cidade']);
  const empreend = str(r['Empreendimento']);
  const titulo = empreend
    || `${tipo}${bairro ? ` em ${bairro}` : ''}${cidade ? `, ${cidade}` : ''}`.trim()
    || `Imóvel ${codigo}`;

  const carac: string[] = [];
  for (const [col, key] of CARACT_MAP) {
    if (boolFlag(r[col])) carac.push(key);
  }

  const motivo = str(r['MotivoDesativacao']);
  const situacao = str(r['Situacao']);
  const obsLinhas: string[] = [];
  if (situacao) obsLinhas.push(`Situação Imoview: ${situacao}`);
  if (motivo) obsLinhas.push(`Motivo desativação: ${motivo}`);

  const idade = intOrNull(r['Idade']);
  const ano_construcao = idade && idade > 0 && idade < 200 ? new Date().getFullYear() - idade : null;

  return {
    codigo_imoview: codigo,
    titulo,
    tipo,
    finalidade: mapFinalidade(r['Finalidade'] ?? ''),
    status: 'inativo',
    ativo: false,
    origem: 'imoview_desativado',
    preco,
    valor_anterior: num(r['ValorAnterior']),
    condominio: num(r['ValorCondominio']),
    iptu: num(r['ValorIptu']),
    iptu_anual: num(r['ValorIptuAnual']),
    rentabilidade_pct: num(r['Rentabilidade']),
    comissao_venda_pct: num(r['ComissaoVenda']),
    cep: digits(r['Cep']) || null,
    endereco: str(r['Endereco']),
    numero: str(r['EnderecoNumero']),
    complemento: str(r['Complemento']) ?? str(r['Bloco']),
    bairro,
    segundo_bairro: str(r['Bairro2']),
    cidade,
    estado: (str(r['Estado']) ?? 'SP').toUpperCase().slice(0, 2),
    regiao: str(r['Regiao']),
    ponto_referencia: str(r['PontoReferencia']),
    area: num(r['AreaInterna']),
    area_total: num(r['AreaLote']),
    area_externa: num(r['AreaExterna']),
    quartos: intOrNull(r['NumeroQuarto']),
    suites: intOrNull(r['NumeroSuite']),
    banheiros: intOrNull(r['NumeroBanheiro']),
    vagas: intOrNull(r['NumeroVaga']),
    salas: intOrNull(r['NumeroSala']),
    varandas: intOrNull(r['NumeroVaranda']),
    edificio: empreend,
    condominio_nome: str(r['Condominio']),
    andar: str(r['Andar']),
    num_andares: intOrNull(r['NumeroAndar']),
    num_torres: intOrNull(r['NumeroTorres']),
    total_unidades: intOrNull(r['TotalUnidades']),
    unidades_por_andar: intOrNull(r['NumeroUnidadesAndar']),
    elevadores: intOrNull(r['NumeroElevador']),
    construtora: str(r['Construtora']),
    ano_construcao,
    tipo_vaga: str(r['TipoVaga']),
    piso_acabamento: str(r['PisoAcabamento']),
    posicao_imovel: str(r['PosicaoImovel']),
    caracteristicas: carac,
    observacoes_internas: obsLinhas.length ? obsLinhas.join(' | ') : null,
    local_chaves: str(r['LocalChave']),
    identificador_chaves: str(r['IdenticadorChave']) ?? str(r['NumeroChave']),
    num_chaves: intOrNull(r['NumeroChave']),
    num_controles: intOrNull(r['NumeroControle']),
    horario_visita: str(r['HorarioVisita']),
    na_planta: boolFlag(r['NaPlanta']),
    exclusivo: boolFlag(r['Exclusivo']),
    placa_faixa: str(r['Placa']),
    destinacao: str(r['Destinacao']),
    segundo_tipo: str(r['Tipo2']),
    codigo_auxiliar: str(r['CodigoAuxiliar']),
    identificador_imovel: str(r['IdenticadorImovel']),
  };
}

async function parseFile(file: File): Promise<{ headers: string[]; rows: Row[] } | null> {
  const buf = await file.arrayBuffer();
  const head = new TextDecoder('utf-8').decode(new Uint8Array(buf, 0, Math.min(buf.byteLength, 256))).trimStart().toLowerCase();
  const looksHtml = head.startsWith('<!doctype') || head.startsWith('<html') || head.startsWith('<table') || head.startsWith('<div') || head.startsWith('<?xml');
  if (looksHtml) {
    const text = new TextDecoder('utf-8').decode(new Uint8Array(buf));
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const table = doc.querySelector('table');
    if (!table) return null;
    const trs = Array.from(table.querySelectorAll('tr'));
    if (!trs.length) return null;
    const headerCells = Array.from(trs[0].querySelectorAll('th,td')).map((c) => (c.textContent ?? '').trim());
    const headers = headerCells.map((h, i) => h || `Coluna ${i + 1}`);
    const rows: Row[] = [];
    for (let i = 1; i < trs.length; i++) {
      const cells = Array.from(trs[i].querySelectorAll('th,td'));
      if (!cells.length) continue;
      const row: Row = {};
      let hasAny = false;
      for (let j = 0; j < headers.length; j++) {
        const val = ((cells[j]?.textContent) ?? '').replace(/\u00a0/g, ' ').trim();
        row[headers[j]] = val;
        if (val) hasAny = true;
      }
      if (hasAny) rows.push(row);
    }
    return { headers, rows };
  }
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Row>(ws, { defval: '', raw: false });
  const hdrSet = new Set<string>();
  for (let i = 0; i < Math.min(rows.length, 50); i++) for (const k of Object.keys(rows[i] || {})) hdrSet.add(k);
  return { headers: Array.from(hdrSet), rows };
}

type Result = {
  inseridos: number;
  ignoradosDup: number;
  ignoradosErro: number;
  erros: { codigo: number | string; motivo: string }[];
  codigosInseridos: number[];
};

type PropSync = {
  phase: 'idle' | 'starting' | 'running' | 'done' | 'error';
  syncId?: string;
  total?: number;
  processed?: number;
  vinculos?: number;
  comProp?: number;
  semProp?: number;
  errors?: number;
  errMsg?: string;
};

const BATCH = 100;

export default function ImportarImoveisDesativados() {
  const { roles, loading: rolesLoading } = useRoles();
  const isAdmin = roles.includes('admin') || roles.includes('gestor');

  const [fileName, setFileName] = useState<string>('');
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<Result | null>(null);
  const [syncProprietarios, setSyncProprietarios] = useState(true);
  const [propSync, setPropSync] = useState<PropSync>({ phase: 'idle' });

  const preview = useMemo(() => rows.slice(0, 5), [rows]);

  const handleFile = async (file: File) => {
    setResult(null);
    setRows([]);
    setHeaders([]);
    setFileName(file.name);
    try {
      const parsed = await parseFile(file);
      if (!parsed) { toast.error('Formato não reconhecido'); return; }
      if (!parsed.rows.length) { toast.error('Planilha vazia'); return; }
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      toast.success(`${parsed.rows.length} linhas detectadas`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const startImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    setResult(null);
    setProgress({ done: 0, total: rows.length });

    const agg: Result = { inseridos: 0, ignoradosDup: 0, ignoradosErro: 0, erros: [] };

    try {
      // Pré-carrega códigos existentes em batches (in-clause limitado)
      const todosCodigos = rows.map((r) => intOrNull(r['Codigo'])).filter((n): n is number => !!n);
      const existentes = new Set<number>();
      for (let i = 0; i < todosCodigos.length; i += 500) {
        const chunk = todosCodigos.slice(i, i + 500);
        const { data, error } = await supabase
          .from('imoveis_proprios')
          .select('codigo_imoview')
          .in('codigo_imoview', chunk);
        if (error) throw error;
        for (const r of data ?? []) {
          if (r.codigo_imoview != null) existentes.add(r.codigo_imoview as number);
        }
      }

      const toInsert: Payload[] = [];
      for (const r of rows) {
        const built = rowToImovel(r);
        if ('skip' in built) { agg.ignoradosErro++; continue; }
        if (existentes.has(built.codigo_imoview)) { agg.ignoradosDup++; continue; }
        toInsert.push(built);
        existentes.add(built.codigo_imoview); // evita duplicado dentro do próprio arquivo
      }

      for (let i = 0; i < toInsert.length; i += BATCH) {
        const batch = toInsert.slice(i, i + BATCH);
        const { error } = await supabase.from('imoveis_proprios').insert(batch as never);
        if (error) {
          // tenta um-a-um para isolar erros
          for (const item of batch) {
            const { error: e1 } = await supabase.from('imoveis_proprios').insert(item as never);
            if (e1) agg.erros.push({ codigo: item.codigo_imoview, motivo: e1.message });
            else agg.inseridos++;
          }
        } else {
          agg.inseridos += batch.length;
        }
        setProgress({ done: Math.min(i + batch.length, toInsert.length) + agg.ignoradosDup + agg.ignoradosErro, total: rows.length });
        setResult({ ...agg });
      }

      setProgress({ done: rows.length, total: rows.length });
      setResult(agg);
      toast.success(`Importação concluída: ${agg.inseridos} inseridos`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  if (rolesLoading) return <CrmLayout><div className="p-6">Carregando…</div></CrmLayout>;
  if (!isAdmin) return <Navigate to="/crm/sem-acesso" replace />;

  return (
    <CrmLayout>
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/crm/imoveis"><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Link>
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6" />
            Importar imóveis desativados
          </h1>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Importa imóveis da planilha do Imoview já marcando como <strong>inativos</strong> (status = inativo, ativo = false).
            Eles ficam visíveis somente no CRM (filtro Status = Inativo) e não aparecem no site público.
            Códigos que já existem no banco são <strong>ignorados</strong> para não sobrescrever imóveis ativos.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Selecione o arquivo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-3 border-2 border-dashed rounded-md p-6 cursor-pointer hover:bg-muted/50 transition">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">
                {fileName ? <><strong>{fileName}</strong> — {rows.length} linhas</> : 'Clique para selecionar (.xls, .xlsx, .html)'}
              </span>
              <input
                type="file"
                accept=".xls,.xlsx,.html,.htm"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                disabled={importing}
              />
            </label>
            {headers.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {headers.length} colunas detectadas. Esperado: <code className="bg-muted px-1 rounded">Codigo, Tipo, Finalidade, Valor, Cep, Endereco, Bairro, Cidade, Estado, Empreendimento, NumeroQuarto, NumeroSuite, NumeroBanheiro, NumeroVaga, AreaInterna, AreaLote, MotivoDesativacao, …</code>
              </p>
            )}
          </CardContent>
        </Card>

        {preview.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">2. Pré-visualização (5 primeiras linhas)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto text-xs">
                <table className="border-collapse">
                  <thead>
                    <tr>
                      {['Codigo','Tipo','Finalidade','Valor','Cidade','Bairro','MotivoDesativacao'].map((h) => (
                        <th key={h} className="border px-2 py-1 text-left bg-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i}>
                        {['Codigo','Tipo','Finalidade','Valor','Cidade','Bairro','MotivoDesativacao'].map((h) => (
                          <td key={h} className="border px-2 py-1 max-w-[200px] truncate">{r[h] ?? ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {rows.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">3. Importar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={startImport} disabled={importing} size="lg">
                {importing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importando…</> : <>Importar {rows.length} imóveis como inativos</>}
              </Button>
              {importing && (
                <div className="space-y-1">
                  <Progress value={(progress.done / Math.max(1, progress.total)) * 100} />
                  <p className="text-xs text-muted-foreground">{progress.done} / {progress.total}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resultado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>✅ Inseridos: <strong>{result.inseridos}</strong></p>
              <p>⏭️ Ignorados (já existiam): <strong>{result.ignoradosDup}</strong></p>
              <p>⚠️ Ignorados (sem código): <strong>{result.ignoradosErro}</strong></p>
              {result.erros.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-destructive">❌ Erros: {result.erros.length}</summary>
                  <ul className="mt-2 max-h-60 overflow-y-auto text-xs space-y-1">
                    {result.erros.slice(0, 50).map((e, i) => (
                      <li key={i}><code>#{e.codigo}</code>: {e.motivo}</li>
                    ))}
                  </ul>
                </details>
              )}
              <div className="pt-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/crm/imoveis">Ver imóveis</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </CrmLayout>
  );
}
