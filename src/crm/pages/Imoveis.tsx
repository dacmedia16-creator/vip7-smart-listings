import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AutocompleteInput } from '@/crm/components/AutocompleteInput';
import { Plus, Search, Building2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CrmLayout } from '../components/CrmLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { IMOVEL_STATUS, imovelStatusMeta } from '../lib/imoveis';
import { fmtMoney } from '../lib/leads';
import { useAuth } from '../hooks/useAuth';
import { useRoles } from '../hooks/useRole';

const PAGE_SIZE = 60;

type Filters = {
  codigos: string;
  finalidade: string;
  status: string;
  ativo: string;
  tipo: string;
  etiqueta: string;
  cidade: string;
  regiao: string;
  sub_regiao: string;
  bairro: string;
  endereco: string;
  numero: string;
  complemento: string;
  local_chaves: string;
  identificador_chaves: string;
  preco_min: string;
  preco_max: string;
  cond_min: string;
  cond_max: string;
  area_min: string;
  area_max: string;
  quartos: string;
  suites: string;
  vagas: string;
  edificio: string;
  tipo_condominio: string;
  imovel_ocupado: string;
};

const EMPTY: Filters = {
  codigos: '', finalidade: 'venda', status: 'disponivel', ativo: 'ativos', tipo: 'todos', etiqueta: 'todos',
  cidade: '', regiao: 'todos', sub_regiao: 'todos', bairro: '',
  endereco: '', numero: '', complemento: '', local_chaves: '', identificador_chaves: '',
  preco_min: '', preco_max: '', cond_min: '', cond_max: '', area_min: '', area_max: '',
  quartos: 'todos', suites: 'todos', vagas: 'todos',
  edificio: '', tipo_condominio: 'todos', imovel_ocupado: 'todos',
};

const splitList = (s: string) => s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
const numOrNull = (s: string) => { const t = (s ?? '').trim(); if (!t) return null; const n = Number(t.replace(',', '.')); return Number.isFinite(n) ? n : null; };

export default function Imoveis() {
  const { user } = useAuth();
  const { isManager, isCorretor } = useRoles();
  const canCreate = isManager || isCorretor;
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [qDebounced, setQDebounced] = useState(q);
  const [pagina, setPagina] = useState(1);
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);

  // Options carregados dinamicamente
  const [opts, setOpts] = useState<{
    tipos: string[]; regioes: string[]; subRegioes: string[];
    tiposCond: string[]; etiquetas: string[];
  }>({ tipos: [], regioes: [], subRegioes: [], tiposCond: [], etiquetas: [] });

  useEffect(() => { setQ(searchParams.get('q') ?? ''); }, [searchParams]);
  useEffect(() => { const t = setTimeout(() => setQDebounced(q), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setPagina(1); }, [qDebounced, applied]);

  // Carrega opções uma vez
  useEffect(() => {
    (async () => {
      const [imoveisRes, condRes] = await Promise.all([
        supabase
          .from('imoveis_proprios')
          .select('tipo,regiao,sub_regiao,edificio,condominio_nome,etiquetas')
          .limit(5000),
        supabase
          .from('condominios_cache')
          .select('nome')
          .order('nome', { ascending: true })
          .limit(10000),
      ]);
      const tipos = new Set<string>(), regioes = new Set<string>(),
        subRegioes = new Set<string>(), tiposCond = new Set<string>(), etiquetas = new Set<string>();
      for (const r of (imoveisRes.data as any[]) ?? []) {
        if (r.tipo) tipos.add(r.tipo);
        if (r.regiao) regioes.add(r.regiao);
        if (r.sub_regiao) subRegioes.add(r.sub_regiao);
        if (r.edificio) tiposCond.add(r.edificio);
        if (r.condominio_nome) tiposCond.add(r.condominio_nome);
        if (Array.isArray(r.etiquetas)) for (const e of r.etiquetas) if (e) etiquetas.add(e);
      }
      for (const c of (condRes.data as any[]) ?? []) {
        if (c.nome) tiposCond.add(String(c.nome).trim());
      }
      setOpts({
        tipos: [...tipos].sort(),
        regioes: [...regioes].sort(),
        subRegioes: [...subRegioes].sort(),
        tiposCond: [...tiposCond].filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR')),
        etiquetas: [...etiquetas].sort(),
      });
    })();
  }, []);

  // Sub-regiões dependentes da região (filtro local)
  const subRegioesFiltradas = useMemo(() => {
    if (filters.regiao === 'todos') return opts.subRegioes;
    return opts.subRegioes; // sem mapeamento na base; mantém todas
  }, [filters.regiao, opts.subRegioes]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const from = (pagina - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('imoveis_proprios')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      const f = applied;

      // Códigos (interno OU imoview)
      const codigos = splitList(f.codigos);
      if (codigos.length) {
        const codNums = codigos.map((c) => Number(c.replace(/\D/g, ''))).filter((n) => Number.isFinite(n) && n > 0);
        const ors: string[] = [];
        ors.push(`codigo_interno.in.(${codigos.map((c) => `"${c}"`).join(',')})`);
        if (codNums.length) ors.push(`codigo_imoview.in.(${codNums.join(',')})`);
        query = query.or(ors.join(','));
      }

      if (f.finalidade !== 'todos') {
        const finalidadeDb = f.finalidade === 'locacao' ? 'aluguel' : f.finalidade;
        query = query.eq('finalidade', finalidadeDb);
      }
      if (f.status !== 'todos') query = query.eq('status', f.status as any);
      if (f.ativo === 'ativos') query = query.eq('ativo', true);
      else if (f.ativo === 'inativos') query = query.eq('ativo', false);
      if (f.tipo !== 'todos') query = query.eq('tipo', f.tipo);
      if (f.etiqueta !== 'todos') query = query.contains('etiquetas', [f.etiqueta]);

      const cidades = splitList(f.cidade);
      if (cidades.length === 1) query = query.ilike('cidade', `%${cidades[0]}%`);
      else if (cidades.length > 1) query = query.in('cidade', cidades);

      if (f.regiao !== 'todos') query = query.eq('regiao', f.regiao);
      if (f.sub_regiao !== 'todos') query = query.eq('sub_regiao', f.sub_regiao);

      const bairros = splitList(f.bairro);
      if (bairros.length === 1) query = query.ilike('bairro', `%${bairros[0]}%`);
      else if (bairros.length > 1) query = query.in('bairro', bairros);

      if (f.endereco) query = query.ilike('endereco', `%${f.endereco}%`);
      if (f.numero) query = query.ilike('numero', `%${f.numero}%`);
      if (f.complemento) query = query.ilike('complemento', `%${f.complemento}%`);
      if (f.local_chaves) query = query.ilike('local_chaves', `%${f.local_chaves}%`);
      if (f.identificador_chaves) query = query.ilike('identificador_chaves', `%${f.identificador_chaves}%`);

      const precoMin = numOrNull(f.preco_min); if (precoMin != null) query = query.gte('preco', precoMin);
      const precoMax = numOrNull(f.preco_max); if (precoMax != null) query = query.lte('preco', precoMax);
      const condMin = numOrNull(f.cond_min); if (condMin != null) query = query.gte('condominio', condMin);
      const condMax = numOrNull(f.cond_max); if (condMax != null) query = query.lte('condominio', condMax);
      const areaMin = numOrNull(f.area_min); if (areaMin != null) query = query.gte('area', areaMin);
      const areaMax = numOrNull(f.area_max); if (areaMax != null) query = query.lte('area', areaMax);

      if (f.quartos !== 'todos') query = query.gte('quartos', parseInt(f.quartos, 10));
      if (f.suites !== 'todos') query = query.gte('suites', parseInt(f.suites, 10));
      if (f.vagas !== 'todos') query = query.gte('vagas', parseInt(f.vagas, 10));

      if (f.edificio) {
        const s = f.edificio.replace(/[,()]/g, ' ').trim();
        query = query.or(`edificio.ilike.%${s}%,condominio_nome.ilike.%${s}%`);
      }
      if (f.tipo_condominio !== 'todos') {
        query = query.or(`edificio.eq.${f.tipo_condominio},condominio_nome.eq.${f.tipo_condominio}`);
      }
      if (f.imovel_ocupado === 'sim') query = query.eq('imovel_ocupado', true);
      else if (f.imovel_ocupado === 'nao') query = query.eq('imovel_ocupado', false);

      if (qDebounced.trim()) {
        const s = qDebounced.trim().replace(/[,()]/g, ' ');
        query = query.or(
          `titulo.ilike.%${s}%,codigo_interno.ilike.%${s}%,bairro.ilike.%${s}%,cidade.ilike.%${s}%`
        );
      }

      const { data, count } = await query;
      setRows(data ?? []);
      setTotal(count ?? 0);
      setLoading(false);
    })();
  }, [pagina, qDebounced, applied]);

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const update = (k: keyof Filters, v: string) => setFilters((s) => {
    const next = { ...s, [k]: v };
    // Quando o usuário escolhe ver inativos/todos, libera a Situação para não esconder os inativos.
    if (k === 'ativo' && v !== 'ativos' && s.status === 'disponivel') next.status = 'todos';
    return next;
  });
  const apply = () => setApplied(filters);
  const clear = () => { setFilters(EMPTY); setApplied(EMPTY); };

  const activeCount = useMemo(() => {
    let n = 0;
    for (const [k, v] of Object.entries(applied) as [keyof Filters, string][]) {
      if (v && v !== 'todos' && v !== EMPTY[k]) n++;
    }
    return n;
  }, [applied]);

  const N = (label: string) => <Label className="text-xs text-muted-foreground">{label}</Label>;

  return (
    <CrmLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Imóveis Próprios</h1>
          <p className="text-sm text-muted-foreground">{total.toLocaleString('pt-BR')} imóveis</p>
        </div>
        <div className="flex gap-2">
          {isManager && (
            <>
              <Button asChild variant="outline">
                <Link to="/crm/imoveis/importar-proprietarios">Importar proprietários</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/crm/imoveis/importar-desativados">Importar desativados</Link>
              </Button>
            </>
          )}
          {canCreate && (
            <Button asChild>
              <Link to="/crm/imoveis/novo"><Plus className="h-4 w-4 mr-2" />Novo Imóvel</Link>
            </Button>
          )}
        </div>
      </div>

      <Card className="p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por título, código, bairro..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
        </div>
        <Button variant="outline" onClick={() => setOpen((o) => !o)}>
          Filtros {activeCount > 0 && <Badge className="ml-2 bg-primary text-primary-foreground">{activeCount}</Badge>}
          {open ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
        </Button>
        {activeCount > 0 && (
          <Button variant="ghost" onClick={clear}><X className="h-4 w-4 mr-1" /> Limpar</Button>
        )}
      </Card>

      {open && (
        <Card className="p-4 mb-6 space-y-6">
          {/* Identificação */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Identificação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>{N('Códigos (separe por vírgula)')}<Input value={filters.codigos} onChange={(e) => update('codigos', e.target.value)} placeholder="Ex.: 996, 3835" /></div>
              <div>{N('Finalidade')}
                <Select value={filters.finalidade} onValueChange={(v) => update('finalidade', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    <SelectItem value="venda">Venda</SelectItem>
                    <SelectItem value="aluguel">Locação</SelectItem>
                    <SelectItem value="temporada">Temporada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>{N('Situação')}
                <Select value={filters.status} onValueChange={(v) => update('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    {IMOVEL_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>{N('Visibilidade')}
                <Select value={filters.ativo} onValueChange={(v) => update('ativo', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativos">Apenas ativos</SelectItem>
                    <SelectItem value="inativos">Apenas inativos / desativados</SelectItem>
                    <SelectItem value="todos">Todos (ativos + inativos)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>{N('Tipo de imóvel')}
                <Select value={filters.tipo} onValueChange={(v) => update('tipo', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {opts.tipos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>{N('Etiquetas')}
                <Select value={filters.etiqueta} onValueChange={(v) => update('etiqueta', v)}>
                  <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    {opts.etiquetas.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Localização */}
          <section className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Localização</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="lg:col-span-2">{N('Cidade(s)')}<Input value={filters.cidade} onChange={(e) => update('cidade', e.target.value)} placeholder="Sorocaba, Itu..." /></div>
              <div>{N('Região')}
                <Select value={filters.regiao} onValueChange={(v) => update('regiao', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    {opts.regioes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>{N('Sub-região')}
                <Select value={filters.sub_regiao} onValueChange={(v) => update('sub_regiao', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    {subRegioesFiltradas.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="lg:col-span-2">{N('Bairro(s)')}<Input value={filters.bairro} onChange={(e) => update('bairro', e.target.value)} placeholder="Centro, Jardim..." /></div>
              <div className="lg:col-span-2">{N('Endereço')}<Input value={filters.endereco} onChange={(e) => update('endereco', e.target.value)} /></div>
              <div>{N('Nº')}<Input value={filters.numero} onChange={(e) => update('numero', e.target.value)} /></div>
              <div>{N('Complemento')}<Input value={filters.complemento} onChange={(e) => update('complemento', e.target.value)} /></div>
              <div>{N('Local chaves')}<Input value={filters.local_chaves} onChange={(e) => update('local_chaves', e.target.value)} /></div>
              <div>{N('Identificador chaves')}<Input value={filters.identificador_chaves} onChange={(e) => update('identificador_chaves', e.target.value)} /></div>
            </div>
          </section>

          {/* Características */}
          <section className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Características</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>{N('Valor imóvel (R$)')}
                <div className="flex gap-2">
                  <Input value={filters.preco_min} onChange={(e) => update('preco_min', e.target.value)} placeholder="De" />
                  <Input value={filters.preco_max} onChange={(e) => update('preco_max', e.target.value)} placeholder="até" />
                </div>
              </div>
              <div>{N('Condomínio (R$)')}
                <div className="flex gap-2">
                  <Input value={filters.cond_min} onChange={(e) => update('cond_min', e.target.value)} placeholder="De" />
                  <Input value={filters.cond_max} onChange={(e) => update('cond_max', e.target.value)} placeholder="até" />
                </div>
              </div>
              <div>{N('Área interna (m²)')}
                <div className="flex gap-2">
                  <Input value={filters.area_min} onChange={(e) => update('area_min', e.target.value)} placeholder="De" />
                  <Input value={filters.area_max} onChange={(e) => update('area_max', e.target.value)} placeholder="até" />
                </div>
              </div>
              <div>{N('Quartos')}
                <Select value={filters.quartos} onValueChange={(v) => update('quartos', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {[1,2,3,4,5].map((n) => <SelectItem key={n} value={String(n)}>{n}+</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>{N('Suítes')}
                <Select value={filters.suites} onValueChange={(v) => update('suites', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    {[1,2,3,4,5].map((n) => <SelectItem key={n} value={String(n)}>{n}+</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>{N('Vagas')}
                <Select value={filters.vagas} onValueChange={(v) => update('vagas', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    {[1,2,3,4,5].map((n) => <SelectItem key={n} value={String(n)}>{n}+</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="lg:col-span-2">{N('Condomínio / Edifício')}
                <AutocompleteInput
                  options={opts.tiposCond}
                  value={filters.edificio}
                  onValueChange={(v) => update('edificio', v)}
                  placeholder="Digite para buscar condomínio..."
                />
              </div>
              <div>{N('Imóvel ocupado')}
                <Select value={filters.imovel_ocupado} onValueChange={(v) => update('imovel_ocupado', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <div className="flex gap-2 pt-2 border-t">
            <Button onClick={apply}>Aplicar filtros</Button>
            <Button variant="outline" onClick={clear}>Limpar</Button>
          </div>
        </Card>
      )}

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum imóvel encontrado.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((im) => {
              const meta = imovelStatusMeta(im.status);
              const foto = im.fotos?.[0];
              const isMine = im.corretor_id && im.corretor_id === user?.id;
              return (
                <Link key={im.id} to={`/crm/imoveis/${im.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-video bg-muted relative">
                      {foto ? <img src={foto} alt={im.titulo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Building2 className="h-12 w-12 text-muted-foreground/40" /></div>}
                      <Badge className={`absolute top-2 right-2 ${meta.color}`}>{meta.label}</Badge>
                      {isMine && <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">Meu</Badge>}
                      {im.ativo === false && <Badge className="absolute bottom-2 left-2 bg-muted text-muted-foreground border">Desativado</Badge>}
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">{im.codigo_interno || '—'} · {im.tipo}</p>
                      <h3 className="font-semibold line-clamp-1">{im.titulo}</h3>
                      {im.descricao && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{im.descricao}</p>
                      )}
                      <p className="text-sm text-muted-foreground mb-2">{im.bairro}{im.cidade ? `, ${im.cidade}` : ''}</p>

                      <div className="flex items-center justify-between">
                        <span className="font-bold text-primary">{fmtMoney(Number(im.preco))}</span>
                        <span className="text-xs text-muted-foreground">{im.quartos ? `${im.quartos}Q` : ''} {im.area ? `· ${im.area}m²` : ''}</span>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-6 gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">
              Página {pagina} de {totalPaginas} · mostrando {rows.length} de {total.toLocaleString('pt-BR')}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina <= 1}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina >= totalPaginas}>
                Próxima <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </>
      )}
    </CrmLayout>
  );
}
