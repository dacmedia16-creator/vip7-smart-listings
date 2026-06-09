import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Globe, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PORTAIS, type PortalId, TIPOS_ANUNCIO, type TipoAnuncio, validarImovelParaPortais, type ImovelParaValidacao } from '../lib/portais';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  imovelId: string;
  imovel?: ImovelParaValidacao;
}

interface Row {
  portal: PortalId;
  publicar: boolean;
  destaque_portal: boolean;
  tipo_anuncio: TipoAnuncio;
  erro_validacao: string | null;
  ultimo_envio_em: string | null;
}

export function PortaisCard({ imovelId, imovel }: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState<Record<PortalId, Row>>({} as any);
  const [loading, setLoading] = useState(true);

  const errosValidacao = imovel ? validarImovelParaPortais(imovel) : [];

  async function load() {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('imovel_portais')
      .select('portal, publicar, destaque_portal, tipo_anuncio, erro_validacao, ultimo_envio_em')
      .eq('imovel_id', imovelId);
    const map = {} as Record<PortalId, Row>;
    for (const p of PORTAIS) {
      const found = (data ?? []).find((r: any) => r.portal === p.id);
      map[p.id] = found ?? { portal: p.id, publicar: false, destaque_portal: false, tipo_anuncio: 'simples', erro_validacao: null, ultimo_envio_em: null };
    }
    setRows(map);
    setLoading(false);
  }

  useEffect(() => { load(); }, [imovelId]);

  async function update(portal: PortalId, patch: Partial<Row>) {
    const next = { ...rows[portal], ...patch };
    // Mantém destaque_portal sincronizado com tipo_anuncio para compatibilidade com feed.
    next.destaque_portal = next.tipo_anuncio !== 'simples';
    setRows({ ...rows, [portal]: next });
    const { error } = await (supabase as any)
      .from('imovel_portais')
      .upsert(
        {
          imovel_id: imovelId,
          portal,
          publicar: next.publicar,
          destaque_portal: next.destaque_portal,
          tipo_anuncio: next.tipo_anuncio,
        },
        { onConflict: 'imovel_id,portal' },
      );
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      load();
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Portais imobiliários</h3>
      </div>

      {errosValidacao.length > 0 && (
        <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
          <div className="flex items-center gap-1 font-medium mb-1">
            <AlertCircle className="h-3.5 w-3.5" /> Faltam dados para publicar
          </div>
          <ul className="list-disc pl-4 space-y-0.5">
            {errosValidacao.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <div className="space-y-3">
          {PORTAIS.map((p) => {
            const row = rows[p.id];
            return (
              <div key={p.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{p.nome}</span>
                      {row?.publicar && errosValidacao.length === 0 && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Ativo
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{p.descricao}</p>
                    {row?.ultimo_envio_em && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Último envio: {new Date(row.ultimo_envio_em).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={row?.publicar ?? false}
                    onCheckedChange={(v) => update(p.id, { publicar: v })}
                  />
                </div>
                {row?.publicar && (
                  <div className="mt-3">
                    <label className="text-xs text-muted-foreground block mb-1">Tipo de anúncio</label>
                    <Select
                      value={row.tipo_anuncio ?? 'simples'}
                      onValueChange={(v) => update(p.id, { tipo_anuncio: v as TipoAnuncio })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_ANUNCIO.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs">{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {row.tipo_anuncio && row.tipo_anuncio !== 'simples' && (
                      <p className="text-[10px] text-muted-foreground mt-1">Pode ter custo extra no portal.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
