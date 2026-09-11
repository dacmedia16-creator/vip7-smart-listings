import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CrmLayout } from '../components/CrmLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Globe, Copy, AlertCircle, CheckCircle2, Webhook, ShieldCheck, ShieldAlert, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PORTAIS, type PortalId, TIPOS_ANUNCIO, type TipoAnuncio, validarImovelParaPortais } from '../lib/portais';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { MoneyInput } from '../components/MoneyInput';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ImovelLite {
  id: string;
  titulo: string;
  cidade: string | null;
  bairro: string | null;
  tipo: string;
  finalidade: string;
  preco: number;
  area: number | null;
  area_total: number | null;
  descricao: string | null;
  cep: string | null;
  estado: string | null;
  fotos: string[] | null;
  created_at: string | null;
  data_atualizacao_origem: string | null;
}

interface PortalRow {
  imovel_id: string;
  portal: PortalId;
  publicar: boolean;
  tipo_anuncio?: TipoAnuncio;
}

const PROJECT_URL = import.meta.env.VITE_SUPABASE_URL as string;

export default function Portais() {
  const { toast } = useToast();
  const [imoveis, setImoveis] = useState<ImovelLite[]>([]);
  const [portais, setPortais] = useState<PortalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [filtroPortal, setFiltroPortal] = useState<PortalId | 'todos'>('todos');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'publicados' | 'nao_publicados' | 'com_erro'>('todos');
  const [precoMin, setPrecoMin] = useState<number | null>(null);
  const [precoMax, setPrecoMax] = useState<number | null>(null);
  const [periodo, setPeriodo] = useState<'todos' | '7' | '30' | '90'>('todos');
  const [ordenacao, setOrdenacao] = useState<'recentes' | 'antigos' | 'maior_valor' | 'menor_valor' | 'titulo'>('recentes');
  const [filtroFinalidade, setFiltroFinalidade] = useState<string>('todos');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroCidade, setFiltroCidade] = useState<string>('todos');
  const [tokenConfigurado, setTokenConfigurado] = useState<boolean | null>(null);
  const [leadsPortal, setLeadsPortal] = useState<any[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const webhookUrl = `${PROJECT_URL}/functions/v1/portal-lead-grupozap`;

  async function load() {
    setLoading(true);
    const [imRes, pRes] = await Promise.all([
      supabase
        .from('imoveis_proprios')
        .select('id,titulo,cidade,bairro,tipo,finalidade,preco,area,area_total,descricao,cep,estado,fotos,created_at,data_atualizacao_origem')
        .eq('ativo', true)
        .order('titulo'),
      (supabase as any).from('imovel_portais').select('imovel_id, portal, publicar, tipo_anuncio'),
    ]);
    setImoveis((imRes.data ?? []) as ImovelLite[]);
    setPortais((pRes.data ?? []) as PortalRow[]);
    setLoading(false);
  }

  async function loadWebhookStatus() {
    try {
      const res = await fetch(webhookUrl, { method: 'GET' });
      const j = await res.json();
      setTokenConfigurado(!!j.token_configured);
    } catch {
      setTokenConfigurado(null);
    }
  }

  async function loadLeadsPortal() {
    const { data } = await (supabase as any)
      .from('leads')
      .select('id, nome, telefone, tags, observacoes, imovel_interesse_codigo, created_at')
      .eq('portal_origin', 'grupo_olx')
      .order('created_at', { ascending: false })
      .limit(20);
    setLeadsPortal(data ?? []);
  }

  useEffect(() => {
    load();
    loadWebhookStatus();
    loadLeadsPortal();
  }, []);

  const isPub = (imovelId: string, portal: PortalId) =>
    portais.some((p) => p.imovel_id === imovelId && p.portal === portal && p.publicar);

  async function toggle(imovelId: string, portal: PortalId, value: boolean) {
    setPortais((prev) => {
      const ex = prev.find((p) => p.imovel_id === imovelId && p.portal === portal);
      if (ex) return prev.map((p) => (p === ex ? { ...p, publicar: value } : p));
      return [...prev, { imovel_id: imovelId, portal, publicar: value }];
    });
    const { error } = await (supabase as any)
      .from('imovel_portais')
      .upsert({ imovel_id: imovelId, portal, publicar: value }, { onConflict: 'imovel_id,portal' });
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      load();
    }
  }

  const tipoOf = (imovelId: string, portal: PortalId): TipoAnuncio =>
    (portais.find((p) => p.imovel_id === imovelId && p.portal === portal)?.tipo_anuncio ?? 'simples') as TipoAnuncio;

  async function setTipo(imovelId: string, portal: PortalId, tipo: TipoAnuncio) {
    setPortais((prev) => {
      const ex = prev.find((p) => p.imovel_id === imovelId && p.portal === portal);
      if (ex) return prev.map((p) => (p === ex ? { ...p, tipo_anuncio: tipo } : p));
      return [...prev, { imovel_id: imovelId, portal, publicar: true, tipo_anuncio: tipo }];
    });
    const { error } = await (supabase as any)
      .from('imovel_portais')
      .upsert(
        { imovel_id: imovelId, portal, publicar: true, tipo_anuncio: tipo, destaque_portal: tipo !== 'simples' },
        { onConflict: 'imovel_id,portal' },
      );
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      load();
    }
  }

  function toggleSelecionado(id: string, checked: boolean) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function bulkSetPortal(portal: PortalId, publicar: boolean) {
    const ids = Array.from(selecionados);
    if (ids.length === 0) return;
    let elegiveis = ids;
    let pulados = 0;
    if (publicar) {
      const comErroIds = new Set(
        imoveis.filter((im) => selecionados.has(im.id) && validarImovelParaPortais(im).length > 0).map((im) => im.id),
      );
      pulados = comErroIds.size;
      elegiveis = ids.filter((id) => !comErroIds.has(id));
    }
    if (elegiveis.length === 0) {
      toast({ title: 'Nenhum imóvel elegível', description: pulados > 0 ? `${pulados} imóveis com dados faltando foram pulados.` : undefined, variant: 'destructive' });
      return;
    }
    setBulkLoading(true);
    const rows = elegiveis.map((imovel_id) => ({ imovel_id, portal, publicar }));
    const { error } = await (supabase as any)
      .from('imovel_portais')
      .upsert(rows, { onConflict: 'imovel_id,portal' });
    setBulkLoading(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    setPortais((prev) => {
      const next = [...prev];
      elegiveis.forEach((imovel_id) => {
        const i = next.findIndex((p) => p.imovel_id === imovel_id && p.portal === portal);
        if (i >= 0) next[i] = { ...next[i], publicar };
        else next.push({ imovel_id, portal, publicar });
      });
      return next;
    });
    const nomePortal = PORTAIS.find((p) => p.id === portal)?.nome ?? portal;
    toast({
      title: publicar ? `${elegiveis.length} imóveis publicados no ${nomePortal}` : `${elegiveis.length} imóveis despublicados do ${nomePortal}`,
      description: pulados > 0 ? `${pulados} pulados por dados faltando.` : undefined,
    });
    setSelecionados(new Set());
  }

  function copiarUrl(portal: PortalId) {
    const slugMap: Record<PortalId, string> = {
      zap_vivareal: 'zap',
      olx: 'olx',
      imovelweb: 'imovelweb',
      chavesnamao: 'chavesnamao',
    };
    const url = `${PROJECT_URL}/functions/v1/portal-feed/${slugMap[portal]}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'URL copiada', description: url });
  }

  const cidadesDisponiveis = useMemo(
    () => Array.from(new Set(imoveis.map((i) => i.cidade).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)),
    [imoveis],
  );
  const tiposDisponiveis = useMemo(
    () => Array.from(new Set(imoveis.map((i) => i.tipo).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [imoveis],
  );

  const filtrosAtivos =
    !!filtro || filtroPortal !== 'todos' || filtroStatus !== 'todos' || precoMin !== null || precoMax !== null ||
    periodo !== 'todos' || ordenacao !== 'recentes' || filtroFinalidade !== 'todos' || filtroTipo !== 'todos' ||
    filtroCidade !== 'todos';

  function limparFiltros() {
    setFiltro('');
    setFiltroPortal('todos');
    setFiltroStatus('todos');
    setPrecoMin(null);
    setPrecoMax(null);
    setPeriodo('todos');
    setOrdenacao('recentes');
    setFiltroFinalidade('todos');
    setFiltroTipo('todos');
    setFiltroCidade('todos');
  }

  const filtrados = useMemo(() => {
    const f = filtro.toLowerCase();
    const limiteData = periodo === 'todos' ? null : Date.now() - Number(periodo) * 24 * 60 * 60 * 1000;
    const lista = imoveis.filter((im) => {
      if (f && !`${im.titulo} ${im.cidade ?? ''} ${im.bairro ?? ''}`.toLowerCase().includes(f)) return false;
      if (precoMin !== null && Number(im.preco ?? 0) < precoMin) return false;
      if (precoMax !== null && Number(im.preco ?? 0) > precoMax) return false;
      if (filtroFinalidade !== 'todos' && im.finalidade !== filtroFinalidade) return false;
      if (filtroTipo !== 'todos' && im.tipo !== filtroTipo) return false;
      if (filtroCidade !== 'todos' && im.cidade !== filtroCidade) return false;
      if (limiteData !== null) {
        const t = im.created_at ? new Date(im.created_at).getTime() : 0;
        if (!t || t < limiteData) return false;
      }
      const erros = validarImovelParaPortais(im);
      if (filtroStatus === 'com_erro' && erros.length === 0) return false;
      if (filtroPortal !== 'todos') {
        const pub = isPub(im.id, filtroPortal);
        if (filtroStatus === 'publicados' && !pub) return false;
        if (filtroStatus === 'nao_publicados' && pub) return false;
      } else if (filtroStatus !== 'todos' && filtroStatus !== 'com_erro') {
        const algumPub = PORTAIS.some((p) => isPub(im.id, p.id));
        if (filtroStatus === 'publicados' && !algumPub) return false;
        if (filtroStatus === 'nao_publicados' && algumPub) return false;
      }
      return true;
    });

    const ts = (im: ImovelLite) => (im.created_at ? new Date(im.created_at).getTime() : 0);
    return [...lista].sort((a, b) => {
      switch (ordenacao) {
        case 'recentes': return ts(b) - ts(a);
        case 'antigos': return ts(a) - ts(b);
        case 'maior_valor': return Number(b.preco ?? 0) - Number(a.preco ?? 0);
        case 'menor_valor': return Number(a.preco ?? 0) - Number(b.preco ?? 0);
        default: return (a.titulo ?? '').localeCompare(b.titulo ?? '');
      }
    });
  }, [imoveis, portais, filtro, filtroPortal, filtroStatus, precoMin, precoMax, periodo, ordenacao, filtroFinalidade, filtroTipo, filtroCidade]);

  const contagens = useMemo(() => {
    const m: Record<PortalId, number> = { zap_vivareal: 0, olx: 0, imovelweb: 0, chavesnamao: 0 };
    portais.forEach((p) => { if (p.publicar) m[p.portal] = (m[p.portal] ?? 0) + 1; });
    return m;
  }, [portais]);

  // Limpa seleção quando busca/filtros mudam (evita ações em itens fora da tela)
  useEffect(() => {
    setSelecionados(new Set());
  }, [filtro, filtroPortal, filtroStatus, precoMin, precoMax, periodo, ordenacao, filtroFinalidade, filtroTipo, filtroCidade]);

  const filtradosIds = useMemo(() => filtrados.map((i) => i.id), [filtrados]);
  const todosSelecionados = filtradosIds.length > 0 && filtradosIds.every((id) => selecionados.has(id));
  const algunsSelecionados = filtradosIds.some((id) => selecionados.has(id));

  function toggleSelecionarTodos(checked: boolean) {
    setSelecionados(checked ? new Set(filtradosIds) : new Set());
  }

  const comErro = imoveis.filter((im) => validarImovelParaPortais(im).length > 0).length;

  return (
    <CrmLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Portais Imobiliários</h1>
          <p className="text-sm text-muted-foreground">
            Marque quais imóveis publicar em cada portal. Cole as URLs abaixo no painel de cada portal — eles leem o feed 1-2x por dia.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            <strong>Zap, VivaReal e OLX</strong> são do Grupo OLX e usam o mesmo formato (VRSync). O conteúdo do XML é igual, mas cada portal só lê os imóveis que você marcou para ele.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PORTAIS.map((p) => (
            <Card key={p.id} className="p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Globe className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium text-sm truncate">{p.nome}</span>
                </div>
                <Badge variant="secondary">{contagens[p.id]}</Badge>
              </div>
              <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => copiarUrl(p.id)}>
                <Copy className="h-3 w-3" /> Copiar URL do feed
              </Button>
            </Card>
          ))}
        </div>

        <Card className="p-4 border-primary/30">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold">Webhook de leads — Grupo OLX</h2>
                <p className="text-xs text-muted-foreground">
                  Cole essa URL no painel do Grupo OLX para receber leads do Zap, VivaReal e OLX direto no CRM.
                </p>
              </div>
            </div>
            {tokenConfigurado === true ? (
              <Badge variant="outline" className="text-emerald-700 border-emerald-400 gap-1 whitespace-nowrap">
                <ShieldCheck className="h-3 w-3" /> Protegido por token
              </Badge>
            ) : tokenConfigurado === false ? (
              <Badge variant="outline" className="text-amber-700 border-amber-400 gap-1 whitespace-nowrap">
                <ShieldAlert className="h-3 w-3" /> Sem token — webhook aberto
              </Badge>
            ) : null}
          </div>

          <div className="flex gap-2 items-center">
            <code className="flex-1 text-xs bg-muted px-3 py-2 rounded border break-all">{webhookUrl}{tokenConfigurado ? '?token=SEU_TOKEN' : ''}</code>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast({ title: 'URL copiada' }); }}>
              <Copy className="h-3 w-3" /> Copiar
            </Button>
          </div>

          {tokenConfigurado === false && (
            <p className="text-xs text-amber-800 mt-2">
              Para proteger o webhook, adicione um secret <code>GRUPOZAP_LEAD_TOKEN</code> em Lovable Cloud (qualquer string aleatória). Depois disso a URL passa a exigir <code>?token=…</code>.
            </p>
          )}

          <div className="flex flex-wrap gap-3 mt-3 text-xs">
            <a href="https://developers.grupozap.com/webhooks/endpoint_validator.html" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              Validador oficial <ExternalLink className="h-3 w-3" />
            </a>
            <a href="https://docs.google.com/forms/d/e/1FAIpQLSd6WJ3xw-qoFzW2-6OvrEihTjurUwVsJYei-P4alae2S1yedQ/viewform" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              Formulário de homologação <ExternalLink className="h-3 w-3" />
            </a>
            <a href="https://developers.grupozap.com/webhooks/integration_leads.html" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              Documentação <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {leadsPortal.length > 0 && (
            <div className="mt-4 border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Últimos {leadsPortal.length} leads recebidos do Grupo OLX</p>
              <div className="space-y-1 max-h-64 overflow-auto">
                {leadsPortal.map((l) => (
                  <Link key={l.id} to={`/crm/leads/${l.id}`} className="flex items-center justify-between gap-2 text-xs p-2 rounded hover:bg-muted">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{l.nome}</div>
                      <div className="text-muted-foreground truncate">
                        {l.telefone} {l.imovel_interesse_codigo ? `· cód ${l.imovel_interesse_codigo}` : ''}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {(l.tags ?? []).filter((t: string) => t !== 'grupo-olx').slice(0, 3).map((t: string) => (
                        <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Card>



        {comErro > 0 && (
          <Card className="p-3 border-amber-300 bg-amber-50">
            <div className="flex items-center gap-2 text-sm text-amber-900">
              <AlertCircle className="h-4 w-4" />
              <span><strong>{comErro}</strong> imóveis com dados faltando — não serão publicados nos portais até serem corrigidos.</span>
            </div>
          </Card>
        )}

        <Card className="p-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              placeholder="Buscar por título, cidade, bairro…"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="max-w-xs"
            />
            <select
              className="h-9 rounded-md border px-2 text-sm bg-background"
              value={filtroPortal}
              onChange={(e) => setFiltroPortal(e.target.value as any)}
            >
              <option value="todos">Todos os portais</option>
              {PORTAIS.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <select
              className="h-9 rounded-md border px-2 text-sm bg-background"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as any)}
            >
              <option value="todos">Todos os status</option>
              <option value="publicados">Publicados</option>
              <option value="nao_publicados">Não publicados</option>
              <option value="com_erro">Com erro de validação</option>
            </select>
            <select
              className="h-9 rounded-md border px-2 text-sm bg-background"
              value={filtroFinalidade}
              onChange={(e) => setFiltroFinalidade(e.target.value)}
            >
              <option value="todos">Todas as finalidades</option>
              <option value="venda">Venda</option>
              <option value="aluguel">Aluguel</option>
              <option value="venda_aluguel">Venda e aluguel</option>
            </select>
            <select
              className="h-9 rounded-md border px-2 text-sm bg-background"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="todos">Todos os tipos</option>
              {tiposDisponiveis.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              className="h-9 rounded-md border px-2 text-sm bg-background"
              value={filtroCidade}
              onChange={(e) => setFiltroCidade(e.target.value)}
            >
              <option value="todos">Todas as cidades</option>
              {cidadesDisponiveis.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              className="h-9 rounded-md border px-2 text-sm bg-background"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as any)}
            >
              <option value="todos">Qualquer data</option>
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
            </select>
            <select
              className="h-9 rounded-md border px-2 text-sm bg-background"
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value as any)}
            >
              <option value="recentes">Mais recentes</option>
              <option value="antigos">Mais antigos</option>
              <option value="maior_valor">Maior valor</option>
              <option value="menor_valor">Menor valor</option>
              <option value="titulo">Título A–Z</option>
            </select>
            <div className="flex items-center gap-1">
              <MoneyInput value={precoMin} onChange={setPrecoMin} placeholder="De R$" className="h-9 w-28" />
              <span className="text-xs text-muted-foreground">até</span>
              <MoneyInput value={precoMax} onChange={setPrecoMax} placeholder="Até R$" className="h-9 w-28" />
            </div>
            {filtrosAtivos && (
              <Button size="sm" variant="ghost" onClick={limparFiltros}>Limpar filtros</Button>
            )}
            <span className="text-xs text-muted-foreground ml-auto">{filtrados.length} imóveis</span>
          </div>
        </Card>

        {selecionados.size > 0 && (
          <Card className="p-3 border-primary/40">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{selecionados.size} selecionado{selecionados.size > 1 ? 's' : ''}</span>
              <div className="flex flex-wrap gap-2 ml-auto">
                {PORTAIS.map((p) => (
                  <div key={p.id} className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={bulkLoading}
                      onClick={() => bulkSetPortal(p.id, true)}
                    >
                      Publicar {p.nome.split(' ')[0]}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={bulkLoading}
                      onClick={() => bulkSetPortal(p.id, false)}
                    >
                      Despublicar
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="ghost" onClick={() => setSelecionados(new Set())}>
                  Limpar seleção
                </Button>
              </div>
            </div>
          </Card>
        )}

        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2 w-10">
                  <Checkbox
                    checked={todosSelecionados ? true : algunsSelecionados ? 'indeterminate' : false}
                    onCheckedChange={(v) => toggleSelecionarTodos(!!v)}
                    aria-label="Selecionar todos"
                  />
                </th>
                <th className="text-left p-2">Imóvel</th>
                <th className="text-left p-2">Cidade</th>
                <th className="text-left p-2">Status</th>
                {PORTAIS.map((p) => (
                  <th key={p.id} className="text-center p-2 whitespace-nowrap">
                    <div className="flex flex-col items-center gap-0.5">
                      <span>{p.nome.split(' ')[0]}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {contagens[p.id]} publicado{contagens[p.id] === 1 ? '' : 's'}
                      </Badge>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4 + PORTAIS.length} className="p-6 text-center text-muted-foreground">Carregando…</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={4 + PORTAIS.length} className="p-6 text-center text-muted-foreground">Nenhum imóvel</td></tr>
              ) : filtrados.map((im) => {
                const erros = validarImovelParaPortais(im);
                const marcado = selecionados.has(im.id);
                return (
                  <tr key={im.id} className={`border-t hover:bg-muted/30 ${marcado ? 'bg-primary/5' : ''}`}>
                    <td className="p-2">
                      <Checkbox
                        checked={marcado}
                        onCheckedChange={(v) => toggleSelecionado(im.id, !!v)}
                        aria-label={`Selecionar ${im.titulo}`}
                      />
                    </td>
                    <td className="p-2">
                      <div className="font-medium">{im.titulo}</div>
<div className="text-xs text-muted-foreground">
                      {im.tipo} · {im.finalidade} · <span className="font-medium text-foreground">{Number(im.preco ?? 0) > 0 ? `R$ ${Number(im.preco).toLocaleString('pt-BR')}` : '—'}</span>
                    </div>
                    </td>
                    <td className="p-2 text-xs">{[im.bairro, im.cidade].filter(Boolean).join(', ') || '—'}</td>
                    <td className="p-2">
                      {erros.length > 0 ? (
                        <Badge variant="outline" className="text-amber-700 border-amber-400 gap-1" title={erros.join(', ')}>
                          <AlertCircle className="h-3 w-3" /> {erros.length} erro{erros.length > 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-emerald-700 border-emerald-400 gap-1">
                          <CheckCircle2 className="h-3 w-3" /> OK
                        </Badge>
                      )}
                    </td>
                    {PORTAIS.map((p) => {
                      const pub = isPub(im.id, p.id);
                      return (
                        <td key={p.id} className="text-center p-2">
                          <div className="flex flex-col items-center gap-1">
                            <Checkbox
                              checked={pub}
                              disabled={erros.length > 0}
                              onCheckedChange={(v) => toggle(im.id, p.id, !!v)}
                            />
                            {pub && (
                              <Select value={tipoOf(im.id, p.id)} onValueChange={(v) => setTipo(im.id, p.id, v as TipoAnuncio)}>
                                <SelectTrigger className="h-7 text-[11px] px-2 w-28">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TIPOS_ANUNCIO.map((t) => (
                                    <SelectItem key={t.id} value={t.id} className="text-xs">{t.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </CrmLayout>
  );
}
