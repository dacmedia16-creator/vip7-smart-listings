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
  const [tokenConfigurado, setTokenConfigurado] = useState<boolean | null>(null);
  const [leadsPortal, setLeadsPortal] = useState<any[]>([]);

  const webhookUrl = `${PROJECT_URL}/functions/v1/portal-lead-grupozap`;

  async function load() {
    setLoading(true);
    const [imRes, pRes] = await Promise.all([
      supabase
        .from('imoveis_proprios')
        .select('id,titulo,cidade,bairro,tipo,finalidade,preco,area,area_total,descricao,cep,estado,fotos')
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

  const filtrados = useMemo(() => {
    const f = filtro.toLowerCase();
    return imoveis.filter((im) => {
      if (f && !`${im.titulo} ${im.cidade ?? ''} ${im.bairro ?? ''}`.toLowerCase().includes(f)) return false;
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
  }, [imoveis, portais, filtro, filtroPortal, filtroStatus]);

  const contagens = useMemo(() => {
    const m: Record<PortalId, number> = { zap_vivareal: 0, olx: 0, imovelweb: 0, chavesnamao: 0 };
    portais.forEach((p) => { if (p.publicar) m[p.portal] = (m[p.portal] ?? 0) + 1; });
    return m;
  }, [portais]);

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
            <span className="text-xs text-muted-foreground ml-auto">{filtrados.length} imóveis</span>
          </div>
        </Card>

        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2">Imóvel</th>
                <th className="text-left p-2">Cidade</th>
                <th className="text-left p-2">Status</th>
                {PORTAIS.map((p) => (
                  <th key={p.id} className="text-center p-2 whitespace-nowrap">{p.nome.split(' ')[0]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3 + PORTAIS.length} className="p-6 text-center text-muted-foreground">Carregando…</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={3 + PORTAIS.length} className="p-6 text-center text-muted-foreground">Nenhum imóvel</td></tr>
              ) : filtrados.map((im) => {
                const erros = validarImovelParaPortais(im);
                return (
                  <tr key={im.id} className="border-t hover:bg-muted/30">
                    <td className="p-2">
                      <div className="font-medium">{im.titulo}</div>
                      <div className="text-xs text-muted-foreground">{im.tipo} · {im.finalidade}</div>
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
                    {PORTAIS.map((p) => (
                      <td key={p.id} className="text-center p-2">
                        <Checkbox
                          checked={isPub(im.id, p.id)}
                          disabled={erros.length > 0}
                          onCheckedChange={(v) => toggle(im.id, p.id, !!v)}
                        />
                      </td>
                    ))}
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
