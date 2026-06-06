import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useGlobalSearch } from '../hooks/useGlobalSearch';
import { statusMeta, fmtPhone, fmtMoney, LEAD_STATUS } from '../lib/leads';
import { imovelStatusMeta } from '../lib/imoveis';
import {
  Users,
  Building2,
  Plus,
  LayoutDashboard,
  KanbanSquare,
  CheckSquare,
  BarChart3,
  Settings,
  ArrowRight,
  Loader2,
  History,
  SlidersHorizontal,
  X,
} from 'lucide-react';

type Filter = 'all' | 'leads' | 'imoveis' | 'acoes';

type LeadHit = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  cidade_interesse: string | null;
  bairro_interesse: string | null;
  status_funil: string;
};

type ImovelHit = {
  id: string;
  titulo: string;
  codigo_interno: string | null;
  cidade: string | null;
  bairro: string | null;
  preco: number | null;
  status: string;
  finalidade: string;
};

type Corretor = { id: string; nome: string };

const RECENT_KEY = 'crm:recent-searches';
const MAX_PER_GROUP = 8;

function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
  } catch {
    return [];
  }
}
function pushRecent(q: string) {
  const t = q.trim();
  if (!t || t.length < 2) return;
  const prev = loadRecent().filter((x) => x.toLowerCase() !== t.toLowerCase());
  const next = [t, ...prev].slice(0, 5);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2 || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-inherit rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

const ALL = '__all__';

export function GlobalSearch() {
  const { open, setOpen } = useGlobalSearch();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<LeadHit[]>([]);
  const [imoveis, setImoveis] = useState<ImovelHit[]>([]);
  const [recent, setRecent] = useState<string[]>(loadRecent());
  const reqRef = useRef(0);

  // Advanced filters
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [fStatus, setFStatus] = useState<string>(ALL);
  const [fCorretor, setFCorretor] = useState<string>(ALL);
  const [fFinalidade, setFFinalidade] = useState<string>(ALL);
  const [fPrecoMin, setFPrecoMin] = useState<string>('');
  const [fPrecoMax, setFPrecoMax] = useState<string>('');
  const [corretores, setCorretores] = useState<Corretor[]>([]);

  // Reset state when reopened
  useEffect(() => {
    if (open) {
      setRecent(loadRecent());
    } else {
      setQuery('');
      setDebounced('');
      setFilter('all');
      setShowAdvanced(false);
      setFStatus(ALL);
      setFCorretor(ALL);
      setFFinalidade(ALL);
      setFPrecoMin('');
      setFPrecoMax('');
    }
  }, [open]);

  // Load corretores once when opened
  useEffect(() => {
    if (!open || corretores.length > 0) return;
    supabase
      .from('profiles')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome')
      .then(({ data }) => setCorretores((data ?? []) as Corretor[]));
  }, [open, corretores.length]);

  // Debounce 200ms
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  const advActive =
    fStatus !== ALL ||
    fCorretor !== ALL ||
    fFinalidade !== ALL ||
    fPrecoMin !== '' ||
    fPrecoMax !== '';
  const advCount =
    (fStatus !== ALL ? 1 : 0) +
    (fCorretor !== ALL ? 1 : 0) +
    (fFinalidade !== ALL ? 1 : 0) +
    (fPrecoMin !== '' || fPrecoMax !== '' ? 1 : 0);

  // Fetch
  useEffect(() => {
    if (!open) return;
    const noText = debounced.length < 2;
    // Allow searching with only advanced filters active
    if (noText && !advActive) {
      setLeads([]);
      setImoveis([]);
      setLoading(false);
      return;
    }
    const myReq = ++reqRef.current;
    setLoading(true);
    const s = noText ? null : `%${debounced.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    const precoMin = fPrecoMin ? Number(fPrecoMin) : null;
    const precoMax = fPrecoMax ? Number(fPrecoMax) : null;

    let leadsQuery: any = null;
    if (filter !== 'imoveis' && filter !== 'acoes') {
      let q = supabase
        .from('leads')
        .select('id, nome, telefone, email, cidade_interesse, bairro_interesse, status_funil')
        .order('created_at', { ascending: false })
        .limit(MAX_PER_GROUP);
      if (s) {
        q = q.or(
          `nome.ilike.${s},email.ilike.${s},telefone.ilike.${s},cidade_interesse.ilike.${s},bairro_interesse.ilike.${s},imovel_interesse_codigo.ilike.${s},observacoes.ilike.${s}`
        );
      }
      if (fStatus !== ALL) q = q.eq('status_funil', fStatus as any);
      if (fCorretor !== ALL) q = q.eq('corretor_id', fCorretor);
      if (fFinalidade !== ALL) q = q.eq('finalidade', fFinalidade);
      if (precoMin != null) q = q.gte('orcamento_max', precoMin);
      if (precoMax != null) q = q.lte('orcamento_min', precoMax);
      leadsQuery = q;
    }

    let imoveisQuery: any = null;
    if (filter !== 'leads' && filter !== 'acoes') {
      let q = supabase
        .from('imoveis_proprios')
        .select('id, titulo, codigo_interno, cidade, bairro, preco, status, finalidade')
        .order('created_at', { ascending: false })
        .limit(MAX_PER_GROUP);
      if (s) {
        q = q.or(
          `titulo.ilike.${s},codigo_interno.ilike.${s},cidade.ilike.${s},bairro.ilike.${s},endereco.ilike.${s},descricao.ilike.${s}`
        );
      }
      if (fCorretor !== ALL) q = q.eq('corretor_id', fCorretor);
      if (fFinalidade !== ALL) q = q.eq('finalidade', fFinalidade);
      if (precoMin != null) q = q.gte('preco', precoMin);
      if (precoMax != null) q = q.lte('preco', precoMax);
      imoveisQuery = q;
    }

    Promise.all([
      leadsQuery ?? Promise.resolve({ data: [] }),
      imoveisQuery ?? Promise.resolve({ data: [] }),
    ]).then(([lRes, iRes]) => {
      if (myReq !== reqRef.current) return;
      setLeads(((lRes as any).data ?? []) as LeadHit[]);
      setImoveis(((iRes as any).data ?? []) as ImovelHit[]);
      setLoading(false);
    });
  }, [debounced, filter, open, fStatus, fCorretor, fFinalidade, fPrecoMin, fPrecoMax, advActive]);

  const clearAdvanced = () => {
    setFStatus(ALL);
    setFCorretor(ALL);
    setFFinalidade(ALL);
    setFPrecoMin('');
    setFPrecoMax('');
  };

  const go = (path: string) => {
    pushRecent(debounced);
    setOpen(false);
    navigate(path);
  };

  const showActions = filter === 'all' || filter === 'acoes';
  const showLeads = filter === 'all' || filter === 'leads';
  const showImoveis = filter === 'all' || filter === 'imoveis';
  const hasQuery = debounced.length >= 2;
  const hasAnySearch = hasQuery || advActive;

  const actions = useMemo(
    () => [
      { id: 'new-lead', label: 'Novo lead', icon: Plus, path: '/crm/leads/novo' },
      { id: 'new-imovel', label: 'Novo imóvel', icon: Plus, path: '/crm/imoveis/novo' },
      { id: 'new-task', label: 'Nova tarefa', icon: Plus, path: '/crm/tarefas' },
      { id: 'nav-dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/crm' },
      { id: 'nav-leads', label: 'Leads', icon: Users, path: '/crm/leads' },
      { id: 'nav-funil', label: 'Funil', icon: KanbanSquare, path: '/crm/funil' },
      { id: 'nav-imoveis', label: 'Imóveis', icon: Building2, path: '/crm/imoveis' },
      { id: 'nav-tarefas', label: 'Tarefas', icon: CheckSquare, path: '/crm/tarefas' },
      { id: 'nav-relatorios', label: 'Relatórios', icon: BarChart3, path: '/crm/relatorios' },
      { id: 'nav-config', label: 'Configurações', icon: Settings, path: '/crm/configuracoes' },
    ],
    []
  );

  const filteredActions = useMemo(() => {
    if (!hasQuery) return actions;
    const s = debounced.toLowerCase();
    return actions.filter((a) => a.label.toLowerCase().includes(s));
  }, [actions, debounced, hasQuery]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Buscar leads, imóveis ou ações..."
        value={query}
        onValueChange={setQuery}
      />

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-b">
        {([
          ['all', 'Tudo'],
          ['leads', 'Leads'],
          ['imoveis', 'Imóveis'],
          ['acoes', 'Ações'],
        ] as [Filter, string][]).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              filter === k
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-transparent border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors inline-flex items-center gap-1 ml-1 ${
            showAdvanced || advActive
              ? 'bg-accent text-accent-foreground border-accent'
              : 'bg-transparent border-border text-muted-foreground hover:bg-muted'
          }`}
        >
          <SlidersHorizontal className="h-3 w-3" />
          Filtros
          {advCount > 0 && (
            <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] px-1">
              {advCount}
            </span>
          )}
        </button>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto self-center" />}
      </div>

      {/* Advanced filters panel */}
      {showAdvanced && (
        <div className="border-b bg-muted/30 px-3 py-2.5 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                Status do lead
              </label>
              <Select value={fStatus} onValueChange={setFStatus}>
                <SelectTrigger className="h-8 text-xs mt-0.5">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {LEAD_STATUS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                Corretor
              </label>
              <Select value={fCorretor} onValueChange={setFCorretor}>
                <SelectTrigger className="h-8 text-xs mt-0.5">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {corretores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                Finalidade
              </label>
              <Select value={fFinalidade} onValueChange={setFFinalidade}>
                <SelectTrigger className="h-8 text-xs mt-0.5">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas</SelectItem>
                  <SelectItem value="venda">Venda</SelectItem>
                  <SelectItem value="aluguel">Aluguel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                Faixa de valor (R$)
              </label>
              <div className="flex gap-1 mt-0.5">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Mín"
                  className="h-8 text-xs"
                  value={fPrecoMin}
                  onChange={(e) => setFPrecoMin(e.target.value)}
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Máx"
                  className="h-8 text-xs"
                  value={fPrecoMax}
                  onChange={(e) => setFPrecoMax(e.target.value)}
                />
              </div>
            </div>
          </div>
          {advActive && (
            <button
              type="button"
              onClick={clearAdvanced}
              className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Limpar filtros
            </button>
          )}
        </div>
      )}

      <CommandList className="max-h-[420px]">
        {!hasAnySearch && recent.length > 0 && (
          <CommandGroup heading="Buscas recentes">
            {recent.map((r) => (
              <CommandItem key={r} value={`recent-${r}`} onSelect={() => setQuery(r)}>
                <History className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{r}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {hasAnySearch && !loading && leads.length === 0 && imoveis.length === 0 && filteredActions.length === 0 && (
          <CommandEmpty>
            {hasQuery
              ? `Nenhum resultado para "${debounced}".`
              : 'Nenhum resultado para os filtros aplicados.'}
          </CommandEmpty>
        )}

        {!hasAnySearch && recent.length === 0 && showActions && (
          <CommandEmpty className="text-muted-foreground">
            Digite ao menos 2 caracteres ou aplique filtros para buscar.
          </CommandEmpty>
        )}

        {showLeads && leads.length > 0 && (
          <>
            <CommandGroup heading={`Leads (${leads.length})`}>
              {leads.map((l) => {
                const meta = statusMeta(l.status_funil);
                const local = [l.bairro_interesse, l.cidade_interesse].filter(Boolean).join(' / ');
                return (
                  <CommandItem
                    key={`lead-${l.id}`}
                    value={`lead-${l.id}-${l.nome}`}
                    onSelect={() => go(`/crm/leads/${l.id}`)}
                  >
                    <Users className="h-4 w-4 mr-2 shrink-0 text-[#7A5A14]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          <Highlight text={l.nome} query={debounced} />
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${meta.color}`}>{meta.label}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {fmtPhone(l.telefone ?? '')} {local && `· ${local}`}
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
              {leads.length >= MAX_PER_GROUP && (
                <CommandItem
                  value="see-all-leads"
                  onSelect={() => go(`/crm/leads?q=${encodeURIComponent(debounced)}`)}
                  className="text-xs text-primary"
                >
                  <ArrowRight className="h-3.5 w-3.5 mr-2" />
                  Ver todos os leads{hasQuery ? ` para "${debounced}"` : ''}
                </CommandItem>
              )}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {showImoveis && imoveis.length > 0 && (
          <>
            <CommandGroup heading={`Imóveis (${imoveis.length})`}>
              {imoveis.map((im) => {
                const meta = imovelStatusMeta(im.status);
                const local = [im.bairro, im.cidade].filter(Boolean).join(', ');
                return (
                  <CommandItem
                    key={`imovel-${im.id}`}
                    value={`imovel-${im.id}-${im.titulo}`}
                    onSelect={() => go(`/crm/imoveis/${im.id}`)}
                  >
                    <Building2 className="h-4 w-4 mr-2 shrink-0 text-amber-600" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          <Highlight text={im.titulo} query={debounced} />
                        </span>
                        <Badge variant="outline" className={`text-[10px] ${meta.color}`}>{meta.label}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {im.codigo_interno ? `${im.codigo_interno} · ` : ''}
                        {local || '—'} · <span className="font-medium">{fmtMoney(im.preco)}</span>
                        {im.finalidade && <span className="ml-1 capitalize">· {im.finalidade}</span>}
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
              {imoveis.length >= MAX_PER_GROUP && (
                <CommandItem
                  value="see-all-imoveis"
                  onSelect={() => go(`/crm/imoveis?q=${encodeURIComponent(debounced)}`)}
                  className="text-xs text-primary"
                >
                  <ArrowRight className="h-3.5 w-3.5 mr-2" />
                  Ver todos os imóveis{hasQuery ? ` para "${debounced}"` : ''}
                </CommandItem>
              )}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {showActions && filteredActions.length > 0 && (
          <CommandGroup heading="Ações rápidas">
            {filteredActions.map((a) => {
              const Icon = a.icon;
              return (
                <CommandItem key={a.id} value={`action-${a.id}`} onSelect={() => go(a.path)}>
                  <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">{a.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </CommandList>

      <div className="border-t px-3 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>↑↓ navegar · ↵ abrir · esc fechar</span>
        <span>⌘K para alternar</span>
      </div>
    </CommandDialog>
  );
}
