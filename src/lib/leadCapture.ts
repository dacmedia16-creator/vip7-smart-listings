import { supabase } from '@/integrations/supabase/client';

type Origem = 'site_avaliacao' | 'site_contato' | 'site_whatsapp';

interface CapturarLeadInput {
  nome: string;
  telefone: string;
  email?: string;
  origem: Origem;
  origem_url?: string;
  tipo_imovel?: string;
  finalidade?: string;
  cidade_interesse?: string;
  bairro_interesse?: string;
  orcamento_min?: number;
  orcamento_max?: number;
  observacoes?: string;
  imovel_interesse_codigo?: string;
}

export interface CapturarLeadResult {
  ok: boolean;
  duplicate?: boolean;
  id?: string;
  error?: string;
}

/**
 * Insert lead from public site forms.
 * SEMPRE cria um novo lead. Se o telefone/email já existir nos últimos 30 dias,
 * marca como recontato (tag + observação apontando o lead anterior).
 */
export async function capturarLead(input: CapturarLeadInput): Promise<CapturarLeadResult> {
  try {
    // 1) Detecta duplicata (informativo, não bloqueia)
    let duplicateId: string | null = null;
    try {
      const { data: dup } = await supabase.rpc('find_duplicate_lead', {
        _telefone: input.telefone,
        _email: input.email ?? null,
      });
      if (dup) duplicateId = dup as any;
    } catch (e) {
      console.warn('find_duplicate_lead falhou (ignorando):', e);
    }

    // 2) Monta observações e tags
    const tags = duplicateId ? ['recontato'] : [];
    const observacoes = duplicateId
      ? `⚠️ Recontato (lead anterior: ${duplicateId}) — ${input.observacoes ?? ''}`.trim()
      : (input.observacoes ?? null);

    // 3) SEMPRE insere novo lead
    const { data, error } = await supabase
      .from('leads')
      .insert({
        nome: input.nome,
        telefone: input.telefone,
        email: input.email ?? null,
        origem: input.origem,
        status_funil: 'novo',
        corretor_id: null,
        created_by: null,
        origem_url: input.origem_url ?? (typeof window !== 'undefined' ? window.location.href : null),
        tipo_imovel: input.tipo_imovel ?? null,
        finalidade: input.finalidade ?? null,
        cidade_interesse: input.cidade_interesse ?? null,
        bairro_interesse: input.bairro_interesse ?? null,
        orcamento_min: input.orcamento_min ?? null,
        orcamento_max: input.orcamento_max ?? null,
        observacoes,
        imovel_interesse_codigo: input.imovel_interesse_codigo ?? null,
        tags,
      })
      .select('id')
      .single();

    if (error) {
      console.error('capturarLead insert error:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id, duplicate: !!duplicateId };
  } catch (e: any) {
    console.error('capturarLead error:', e);
    return { ok: false, error: e?.message ?? 'erro desconhecido' };
  }
}
