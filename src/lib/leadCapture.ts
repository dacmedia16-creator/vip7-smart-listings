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

/** Insert lead from public site forms. Deduplicates by phone/email within 30 days. */
export async function capturarLead(input: CapturarLeadInput): Promise<{ ok: boolean; duplicate?: boolean; id?: string }> {
  try {
    const { data: dup } = await supabase.rpc('find_duplicate_lead', {
      _telefone: input.telefone,
      _email: input.email ?? null,
    });

    if (dup) {
      // Add interaction note instead of duplicate insert
      await supabase.from('lead_interacoes').insert({
        lead_id: dup as any,
        tipo: 'outro' as any,
        descricao: `Novo contato pelo site (${input.origem}): ${input.observacoes ?? '—'}`,
      });
      return { ok: true, duplicate: true, id: dup as any };
    }

    const { data, error } = await supabase
      .from('leads')
      .insert({
        nome: input.nome,
        telefone: input.telefone,
        email: input.email ?? null,
        origem: input.origem,
        origem_url: input.origem_url ?? (typeof window !== 'undefined' ? window.location.href : null),
        tipo_imovel: input.tipo_imovel ?? null,
        finalidade: input.finalidade ?? null,
        cidade_interesse: input.cidade_interesse ?? null,
        bairro_interesse: input.bairro_interesse ?? null,
        orcamento_min: input.orcamento_min ?? null,
        orcamento_max: input.orcamento_max ?? null,
        observacoes: input.observacoes ?? null,
        imovel_interesse_codigo: input.imovel_interesse_codigo ?? null,
      })
      .select('id')
      .single();

    if (error) throw error;
    return { ok: true, id: data?.id };
  } catch (e) {
    console.error('capturarLead error:', e);
    return { ok: false };
  }
}
