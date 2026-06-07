import { useMemo, useState } from 'react';
import { CrmLayout } from '../components/CrmLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useRoles } from '../hooks/useRole';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

type Row = Record<string, string>;

const normHeader = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^\ufeff/, '').trim().replace(/\s+/g, ' ');

const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '');
const str = (v: unknown) => { const s = String(v ?? '').trim(); return s && s !== '\u00a0' ? s : null; };
const num = (v: unknown) => {
  const s = String(v ?? '').replace(/\u00a0/g, '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
};

// Parse "dd/MM/yyyy HH:mm" or "dd/MM/yyyy" → ISO string
function parseBrDate(v: unknown): string | null {
  const s = String(v ?? '').trim();
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (!m) return null;
  const [, dd, mm, yyyy, hh = '00', mi = '00'] = m;
  const iso = `${yyyy}-${mm}-${dd}T${hh}:${mi}:00-03:00`;
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

type LeadStatus = 'novo' | 'em_atendimento' | 'visita_agendada' | 'proposta_enviada' | 'fechamento' | 'perdido';
type LeadOrigem = 'manual' | 'site_avaliacao' | 'site_contato' | 'site_whatsapp' | 'portal' | 'rede_social' | 'indicacao' | 'importado';

function mapStatus(fase: string, situacao: string): LeadStatus {
  const sit = (situacao || '').toLowerCase();
  if (sit.includes('descart')) return 'perdido';
  if (sit.includes('perdido')) return 'perdido';
  if (sit.includes('fechad') || sit.includes('ganho') || sit.includes('venda concluida')) return 'fechamento';

  const f = (fase || '').toLowerCase();
  if (f.includes('proposta')) return 'proposta_enviada';
  if (f.includes('visita')) return 'visita_agendada';
  if (f.includes('negocia') || f.includes('fechamento')) return 'fechamento';
  if (f.includes('qualific') || f.includes('atendimento') || f.includes('contato')) return 'em_atendimento';
  if (f.includes('novo') || f.includes('lead')) return 'em_atendimento';
  return 'novo';
}

function mapOrigem(midia: string): LeadOrigem {
  const m = (midia || '').toLowerCase();
  if (!m) return 'importado';
  if (m.includes('whats')) return 'site_whatsapp';
  if (m.includes('site') || m.includes('avalia')) return 'site_avaliacao';
  if (m.includes('contato') || m.includes('formulario')) return 'site_contato';
  if (m.includes('instagram') || m.includes('facebook') || m.includes('tiktok') || m.includes('rede')) return 'rede_social';
  if (m.includes('indica')) return 'indicacao';
  if (m.match(/clique|viva|zap|olx|imovel|chaves|loft|quintoa|cred|portal/)) return 'portal';
  return 'importado';
}

function mapFinalidade(v: string): string | null {
  const s = (v || '').toLowerCase();
  if (!s) return null;
  if (s.includes('venda') || s.includes('compra')) return 'venda';
  if (s.includes('loca') || s.includes('alug')) return 'aluguel';
  return null;
}

type LeadPayload = {
  nome: string;
  telefone: string;
  email: string | null;
  origem: LeadOrigem;
  origem_url: string | null;
  tipo_imovel: string | null;
  finalidade: string | null;
  cidade_interesse: string | null;
  bairro_interesse: string | null;
  orcamento_min: number | null;
  orcamento_max: number | null;
  perfil_busca: string | null;
  status_funil: LeadStatus;
  tags: string[];
  observacoes: string | null;
  imovel_interesse_codigo: string | null;
  imoveis_carrinho_codigos: string[];
  imoveis_visita_codigos: string[];
  imoveis_proposta_codigos: string[];
  created_at: string | null;
  last_contact_at: string | null;
};

function rowToLead(r: Row, cols: Record<string, string | null>): LeadPayload | { skip: string } {
  const get = (k: string) => (cols[k] ? r[cols[k]!] ?? '' : '');

  const nome = str(get('ClienteNome'));
  const telefoneDig = digits(get('ClienteTelefone'));
  if (!nome) return { skip: 'sem nome' };
  if (!telefoneDig || telefoneDig.length < 8) return { skip: 'telefone inválido' };

  const perfilParts: string[] = [];
  const q = str(get('PerfilQuartos')); if (q) perfilParts.push(`${q} quartos`);
  const b = str(get('PerfilBanhos')); if (b) perfilParts.push(`${b} banhos`);
  const su = str(get('PerfilSuites')); if (su) perfilParts.push(`${su} suítes`);
  const va = str(get('PerfilVagas')); if (va) perfilParts.push(`${va} vagas`);
  const aDe = str(get('PerfilAreaInternaDe'));
  const aAte = str(get('PerfilAreaInternaAte'));
  if (aDe || aAte) perfilParts.push(`Área: ${aDe ?? '?'}–${aAte ?? '?'} m²`);
  const perfil_busca = perfilParts.length ? perfilParts.join(' · ') : null;

  const obsParts: string[] = [];
  const corretor = str(get('Corretor')); if (corretor) obsParts.push(`Corretor original: ${corretor}`);
  const equipe = str(get('Equipe')); if (equipe) obsParts.push(`Equipe: ${equipe}`);
  const term = str(get('Termometro')); if (term && term.toLowerCase() !== 'indefinido') obsParts.push(`Termômetro: ${term}`);
  const tipo = str(get('Tipo')); if (tipo) obsParts.push(`Tipo: ${tipo}`);
  const camp = str(get('Campanha')); if (camp) obsParts.push(`Campanha: ${camp}`);
  const fase = str(get('Fase')); if (fase) obsParts.push(`Fase Imoview: ${fase}`);
  const situacao = str(get('Situacao')); if (situacao) obsParts.push(`Situação: ${situacao}`);
  const descarte = str(get('SituacaoDescarte')); if (descarte) obsParts.push(`Motivo descarte: ${descarte}`);
  const ultima = str(get('UltimaInteracao')); if (ultima) obsParts.push(`Última interação: ${ultima}`);
  const carrinho = str(get('ImoveisCarrinho')); if (carrinho) obsParts.push(`Imóveis carrinho: ${carrinho}`);
  const visita = str(get('ImoveisVisita')); if (visita) obsParts.push(`Imóveis visita: ${visita}`);
  const proposta = str(get('ImoveisProposta')); if (proposta) obsParts.push(`Imóveis proposta: ${proposta}`);
  const valor = str(get('Valor')); if (valor) obsParts.push(`Valor: ${valor}`);
  const indic = str(get('Indicacao')); if (indic) obsParts.push(`Indicação: ${indic}`);

  const etiquetas = str(get('Etiquetas'));
  const tags = etiquetas ? etiquetas.split(/[,;]/).map((s) => s.trim()).filter(Boolean).slice(0, 20) : [];

  const tipos = str(get('PerfilTipos'));
  const tipo_imovel = tipos ? tipos.split(/[,;|/]/)[0].trim() : null;

  const cidades = str(get('PerfilCidades'));
  const cidade_interesse = cidades ? cidades.split(/[,;|/]/)[0].trim() : null;

  const codigoImovel = str(get('Codigo'));

  return {
    nome,
    telefone: telefoneDig,
    email: str(get('ClienteEmail'))?.toLowerCase() ?? null,
    origem: mapOrigem(get('Midia')),
    origem_url: null,
    tipo_imovel,
    finalidade: mapFinalidade(get('Finalidade')),
    cidade_interesse,
    bairro_interesse: str(get('PerfilBairros')),
    orcamento_min: num(get('PerfilValorDe')),
    orcamento_max: num(get('PerfilValorAte')),
    perfil_busca,
    status_funil: mapStatus(get('Fase'), get('Situacao')),
    tags,
    observacoes: obsParts.length ? obsParts.join(' | ') : null,
    imovel_interesse_codigo: codigoImovel,
    imoveis_carrinho_codigos: (str(get('ImoveisCarrinho')) || '').match(/\d+/g) || [],
    imoveis_visita_codigos: (str(get('ImoveisVisita')) || '').match(/\d+/g) || [],
    imoveis_proposta_codigos: (str(get('ImoveisProposta')) || '').match(/\d+/g) || [],
    created_at: parseBrDate(get('DataHoraInclusao')),
    last_contact_at: parseBrDate(get('DataHoraUltimaInteracao')),
  };
}

type Result = {
  inseridos: number;
  duplicados: number;
  ignorados: number;
  clientesNovos: number;
  clientesAtualizados: number;
  erros: { linha: number; motivo: string }[];
};

const EXPECTED_COLS = [
  'Codigo', 'Finalidade', 'ClienteNome', 'ClienteTelefone', 'ClienteEmail',
  'Midia', 'Campanha', 'Tipo', 'Fase', 'Termometro', 'Corretor', 'Equipe',
  'Situacao', 'SituacaoDescarte', 'ImoveisCarrinho', 'ImoveisVisita', 'ImoveisProposta',
  'DataHoraInclusao', 'DataHoraUltimaInteracao', 'UltimaInteracao',
  'PerfilQuartos', 'PerfilBanhos', 'PerfilSuites', 'PerfilVagas',
  'PerfilValorDe', 'PerfilValorAte', 'PerfilAreaInternaDe', 'PerfilAreaInternaAte',
  'PerfilTipos', 'PerfilCidades', 'PerfilBairros', 'PerfilRegioes',
  'Valor', 'Indicacao', 'Etiquetas',
];

function autoMap(headers: string[]): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  const normToOriginal = new Map(headers.map((h) => [normHeader(h), h]));
  for (const key of EXPECTED_COLS) {
    result[key] = normToOriginal.get(normHeader(key)) ?? null;
  }
  return result;
}

type FileInfo = { name: string; rows: number };

async function parseFile(file: File): Promise<{ headers: string[]; rows: Row[] } | null> {
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext === 'csv' || ext === 'txt') {
    let text = await file.text();
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const firstLine = text.split(/\r?\n/)[0] ?? '';
    const delim = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
    const parsed = Papa.parse<Row>(text, { header: true, skipEmptyLines: true, delimiter: delim });
    const data = parsed.data.filter((r) => Object.values(r).some((v) => String(v ?? '').trim() !== ''));
    const headers = (parsed.meta.fields ?? []).map((h) => h.replace(/^\ufeff/, ''));
    return { headers, rows: data };
  }
  if (ext === 'xlsx' || ext === 'xls') {
    const buf = await file.arrayBuffer();
    const head = new TextDecoder('utf-8').decode(new Uint8Array(buf, 0, Math.min(buf.byteLength, 256))).trimStart().toLowerCase();
    const looksLikeHtml = head.startsWith('<!doctype') || head.startsWith('<html') || head.startsWith('<table') || head.startsWith('<div') || head.startsWith('<?xml');
    if (looksLikeHtml) {
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
  return null;
}

export default function ImportarLeads() {
  const { roles, loading: rolesLoading } = useRoles();
  const isAdmin = roles.includes('admin') || roles.includes('gestor');

  const [fileInfos, setFileInfos] = useState<FileInfo[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<Result | null>(null);

  const preview = useMemo(() => rows.slice(0, 8), [rows]);
  const mappedCount = useMemo(() => Object.values(mapping).filter(Boolean).length, [mapping]);
  const canImport = !!mapping.ClienteNome && !!mapping.ClienteTelefone && rows.length > 0;

  const handleFiles = async (files: FileList) => {
    setResult(null);
    setRows([]);
    setHeaders([]);
    setMapping({});
    setFileInfos([]);

    const allRows: Row[] = [];
    const allHeaderSet = new Set<string>();
    const infos: FileInfo[] = [];
    const seen = new Set<string>(); // dedup key inside batch

    for (const file of Array.from(files)) {
      try {
        const parsed = await parseFile(file);
        if (!parsed) { toast.error(`${file.name}: formato não reconhecido`); continue; }
        parsed.headers.forEach((h) => allHeaderSet.add(h));

        // Find tel/email col for batch dedup, using auto-map on this file's headers
        const localMap = autoMap(parsed.headers);
        const telCol = localMap.ClienteTelefone;
        const emCol = localMap.ClienteEmail;

        let added = 0;
        for (const r of parsed.rows) {
          const tel = telCol ? digits(r[telCol]) : '';
          const em = emCol ? String(r[emCol] ?? '').trim().toLowerCase() : '';
          const key = tel || em;
          if (key && seen.has(key)) continue;
          if (key) seen.add(key);
          allRows.push(r);
          added++;
        }
        infos.push({ name: file.name, rows: added });
      } catch (e) {
        toast.error(`${file.name}: ${(e as Error).message}`);
      }
    }

    const hdrs = Array.from(allHeaderSet);
    setHeaders(hdrs);
    setRows(allRows);
    setMapping(autoMap(hdrs));
    setFileInfos(infos);
    toast.success(`${infos.length} arquivo(s): ${allRows.length} linhas únicas`);
  };

  const upsertClienteComprador = async (
    lead: LeadPayload,
  ): Promise<'novo' | 'atualizado' | 'noop' | 'erro'> => {
    try {
      const orParts: string[] = [`telefone.eq.${lead.telefone}`];
      if (lead.email) orParts.push(`email.eq.${lead.email}`);
      const { data: existing } = await supabase
        .from('clientes')
        .select('id, categorias, email, telefone, cidade, observacoes')
        .or(orParts.join(','))
        .limit(1)
        .maybeSingle();

      if (existing) {
        const cats = new Set<string>((existing.categorias as string[] | null) ?? []);
        const before = cats.size;
        cats.add('comprador');
        if (cats.size === before) return 'noop';
        const patch: Record<string, unknown> = { categorias: Array.from(cats) };
        if (!existing.email && lead.email) patch.email = lead.email;
        if (!existing.cidade && lead.cidade_interesse) patch.cidade = lead.cidade_interesse;
        if (!existing.observacoes && lead.observacoes) patch.observacoes = lead.observacoes;
        const { error } = await supabase.from('clientes').update(patch).eq('id', existing.id);
        return error ? 'erro' : 'atualizado';
      }

      const { error } = await supabase.from('clientes').insert({
        nome: lead.nome,
        telefone: lead.telefone,
        email: lead.email,
        tipo_pessoa: 'fisica',
        origem: 'lead_import',
        categorias: ['comprador'],
        cidade: lead.cidade_interesse,
        observacoes: lead.observacoes,
        ativo: true,
      } as never);
      return error ? 'erro' : 'novo';
    } catch {
      return 'erro';
    }
  };

  const startImport = async () => {
    if (!canImport) { toast.error('Mapeie pelo menos Nome e Telefone'); return; }
    setImporting(true);
    setResult(null);
    setProgress({ done: 0, total: rows.length });

    const agg: Result = { inseridos: 0, duplicados: 0, ignorados: 0, clientesNovos: 0, clientesAtualizados: 0, erros: [] };

    try {
      for (let i = 0; i < rows.length; i++) {
        const linhaNum = i + 2;
        try {
          const built = rowToLead(rows[i], mapping);
          if ('skip' in built) { agg.ignorados++; continue; }

          const { data: dup } = await supabase.rpc('find_duplicate_lead', {
            _telefone: built.telefone,
            _email: built.email,
          });
          if (dup) {
            agg.duplicados++;
            // mesmo se duplicado, garante categoria comprador no cliente
            const cliRes = await upsertClienteComprador(built);
            if (cliRes === 'novo') agg.clientesNovos++;
            else if (cliRes === 'atualizado') agg.clientesAtualizados++;
            continue;
          }

          const insertPayload: Record<string, unknown> = {
            nome: built.nome,
            telefone: built.telefone,
            email: built.email,
            origem: built.origem,
            origem_url: built.origem_url,
            tipo_imovel: built.tipo_imovel,
            finalidade: built.finalidade,
            cidade_interesse: built.cidade_interesse,
            bairro_interesse: built.bairro_interesse,
            orcamento_min: built.orcamento_min,
            orcamento_max: built.orcamento_max,
            perfil_busca: built.perfil_busca,
            status_funil: built.status_funil,
            tags: built.tags,
            observacoes: built.observacoes,
            imovel_interesse_codigo: built.imovel_interesse_codigo,
          };
          if (built.last_contact_at) insertPayload.last_contact_at = built.last_contact_at;

          const { error } = await supabase.from('leads').insert(insertPayload as never);
          if (error) {
            agg.erros.push({ linha: linhaNum, motivo: error.message });
          } else {
            agg.inseridos++;
            const cliRes = await upsertClienteComprador(built);
            if (cliRes === 'novo') agg.clientesNovos++;
            else if (cliRes === 'atualizado') agg.clientesAtualizados++;
          }
        } catch (e) {
          agg.erros.push({ linha: linhaNum, motivo: (e as Error).message });
        }
        if ((i & 7) === 0) setProgress({ done: i + 1, total: rows.length });
      }
      setProgress({ done: rows.length, total: rows.length });
      setResult(agg);
      toast.success(`Importação concluída: ${agg.inseridos} leads, ${agg.clientesNovos} clientes novos`);
    } catch (e) {
      toast.error('Erro na importação: ' + (e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  if (rolesLoading) {
    return (
      <CrmLayout title="Importar Leads">
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-[#7A7A80]" /></div>
      </CrmLayout>
    );
  }
  if (!isAdmin) return <Navigate to="/crm/sem-acesso" replace />;

  const summaryLabel = fileInfos.length === 0
    ? 'Clique para escolher arquivos'
    : fileInfos.length === 1
      ? fileInfos[0].name
      : `${fileInfos.length} arquivos selecionados`;

  return (
    <CrmLayout title="Importar Leads">
      <div className="space-y-4 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/crm/leads" className="inline-flex items-center text-sm text-[#7A5A14] hover:text-[#5A4310]">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para Leads
            </Link>
            <h2 className="text-2xl font-semibold text-[#0F0F12] mt-1">Importar planilha de Leads</h2>
            <p className="text-sm text-[#2A2A30]">
              Aceita o export "Atendimentos" do Imoview (.xls HTML), XLSX e CSV. Você pode selecionar várias páginas de uma vez —
              cada lead também é cadastrado em Clientes com a categoria <strong>Comprador</strong>.
            </p>
          </div>
        </div>

        <Card className="border-[#E8E4D9]">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4" /> 1. Selecionar arquivo(s)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex items-center gap-3 border-2 border-dashed border-[#E8D9A8] rounded-lg p-6 cursor-pointer hover:bg-[#FBF3DC]/40 transition-colors">
              <FileSpreadsheet className="h-8 w-8 text-[#C9A24C]" />
              <div className="flex-1">
                <p className="font-medium text-[#0F0F12]">{summaryLabel}</p>
                <p className="text-xs text-[#7A7A80]">.xls, .xlsx ou .csv — selecione todas as páginas exportadas</p>
              </div>
              <input
                type="file"
                accept=".csv,.txt,.xls,.xlsx"
                multiple
                className="hidden"
                onChange={(e) => { const fs = e.target.files; if (fs && fs.length) handleFiles(fs); }}
              />
            </label>
            {fileInfos.length > 0 && (
              <ul className="mt-3 text-xs text-[#4A4A52] space-y-0.5">
                {fileInfos.map((f, i) => (
                  <li key={i}>• {f.name} — <strong>{f.rows}</strong> linhas</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {rows.length > 0 && (
          <>
            <Card className="border-[#E8E4D9]">
              <CardHeader>
                <CardTitle className="text-base">2. Conferência</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <Stat label="Linhas únicas" value={rows.length} />
                  <Stat label="Colunas reconhecidas" value={`${mappedCount} / ${EXPECTED_COLS.length}`} />
                  <Stat label="Nome" value={mapping.ClienteNome ? '✓' : '—'} highlight={!mapping.ClienteNome} />
                  <Stat label="Telefone" value={mapping.ClienteTelefone ? '✓' : '—'} highlight={!mapping.ClienteTelefone} />
                </div>
                <p className="text-xs text-[#4A4A52]">
                  Duplicados entre arquivos (mesmo telefone/e-mail) já foram unificados. Duplicados contra a base existente (últimos 30 dias) são ignorados na inserção do lead, mas a categoria <strong>Comprador</strong> é adicionada ao cliente correspondente.
                </p>
              </CardContent>
            </Card>

            <Card className="border-[#E8E4D9]">
              <CardHeader>
                <CardTitle className="text-base">3. Pré-visualização (primeiras 8 linhas)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto max-h-80 border border-[#E8E4D9] rounded">
                  <table className="text-xs w-full">
                    <thead className="bg-[#F5F0E4] sticky top-0">
                      <tr>
                        <th className="text-left px-2 py-1.5 font-medium">Nome</th>
                        <th className="text-left px-2 py-1.5 font-medium">Telefone</th>
                        <th className="text-left px-2 py-1.5 font-medium">E-mail</th>
                        <th className="text-left px-2 py-1.5 font-medium">Fase</th>
                        <th className="text-left px-2 py-1.5 font-medium">Mídia</th>
                        <th className="text-left px-2 py-1.5 font-medium">Cidade</th>
                        <th className="text-left px-2 py-1.5 font-medium">→ Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((r, i) => {
                        const built = rowToLead(r, mapping);
                        const isSkip = 'skip' in built;
                        return (
                          <tr key={i} className="border-t border-[#E8E4D9]">
                            <td className="px-2 py-1">{r[mapping.ClienteNome ?? ''] ?? ''}</td>
                            <td className="px-2 py-1">{r[mapping.ClienteTelefone ?? ''] ?? ''}</td>
                            <td className="px-2 py-1">{r[mapping.ClienteEmail ?? ''] ?? ''}</td>
                            <td className="px-2 py-1">{r[mapping.Fase ?? ''] ?? ''}</td>
                            <td className="px-2 py-1">{r[mapping.Midia ?? ''] ?? ''}</td>
                            <td className="px-2 py-1">{r[mapping.PerfilCidades ?? ''] ?? ''}</td>
                            <td className="px-2 py-1">
                              {isSkip ? (
                                <span className="text-rose-600">ignorar ({built.skip})</span>
                              ) : (
                                <span className="text-emerald-700">{built.status_funil}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#E8E4D9]">
              <CardHeader>
                <CardTitle className="text-base">4. Importar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={startImport}
                  disabled={!canImport || importing}
                  className="bg-[#C9A24C] hover:bg-[#B08F3D] text-white"
                >
                  {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Importar {rows.length} linhas
                </Button>

                {importing && (
                  <div>
                    <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} />
                    <p className="text-xs text-[#4A4A52] mt-1">{progress.done} / {progress.total}</p>
                  </div>
                )}

                {result && (
                  <div className="rounded border border-[#E8E4D9] p-3 bg-[#F5F0E4]/60 text-sm space-y-1">
                    <p><strong className="text-emerald-700">{result.inseridos}</strong> leads inseridos</p>
                    <p><strong className="text-amber-700">{result.duplicados}</strong> leads duplicados (já existiam)</p>
                    <p><strong className="text-[#7A7A80]">{result.ignorados}</strong> ignorados (sem nome ou telefone inválido)</p>
                    <p><strong className="text-emerald-700">{result.clientesNovos}</strong> clientes novos (Comprador)</p>
                    <p><strong className="text-sky-700">{result.clientesAtualizados}</strong> clientes existentes marcados como Comprador</p>
                    {result.erros.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-rose-700"><strong>{result.erros.length}</strong> erros</summary>
                        <ul className="mt-1 max-h-40 overflow-auto text-xs space-y-0.5">
                          {result.erros.slice(0, 50).map((e, i) => (
                            <li key={i}>Linha {e.linha}: {e.motivo}</li>
                          ))}
                          {result.erros.length > 50 && <li>… e mais {result.erros.length - 50}</li>}
                        </ul>
                      </details>
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

function Stat({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`rounded border p-2 ${highlight ? 'border-rose-300 bg-rose-50' : 'border-[#E8E4D9] bg-white'}`}>
      <p className="text-[10px] uppercase tracking-wide text-[#7A7A80]">{label}</p>
      <p className={`text-base font-semibold ${highlight ? 'text-rose-700' : 'text-[#0F0F12]'}`}>{value}</p>
    </div>
  );
}
