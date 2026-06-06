export const LEAD_STATUS = [
  { value: 'novo', label: 'Novo', color: 'bg-[#FBF3DC] text-[#7A5A14] border-[#E8D9A8]' },
  { value: 'em_atendimento', label: 'Em Atendimento', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'visita_agendada', label: 'Visita Agendada', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'proposta_enviada', label: 'Proposta Enviada', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { value: 'fechamento', label: 'Fechamento', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'perdido', label: 'Perdido', color: 'bg-slate-100 text-[#2A2A30] border-[#E8E4D9]' },
] as const;

export type LeadStatus = (typeof LEAD_STATUS)[number]['value'];

export const FUNIL_STATUS: LeadStatus[] = [
  'novo',
  'em_atendimento',
  'visita_agendada',
  'proposta_enviada',
  'fechamento',
];

export const LEAD_ORIGEM = [
  { value: 'manual', label: 'Manual' },
  { value: 'site_avaliacao', label: 'Site - Avaliação' },
  { value: 'site_contato', label: 'Site - Contato' },
  { value: 'site_whatsapp', label: 'Site - WhatsApp' },
  { value: 'portal', label: 'Portal' },
  { value: 'rede_social', label: 'Rede Social' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'importado', label: 'Importado' },
] as const;

export const TIPO_IMOVEL = [
  'Apartamento',
  'Casa',
  'Casa em Condomínio',
  'Cobertura',
  'Terreno',
  'Sala Comercial',
  'Galpão',
  'Sítio/Fazenda',
  'Outros',
];

export function statusMeta(s: string) {
  return LEAD_STATUS.find((x) => x.value === s) ?? LEAD_STATUS[0];
}

export function origemLabel(o: string) {
  return LEAD_ORIGEM.find((x) => x.value === o)?.label ?? o;
}

export function fmtMoney(n?: number | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
}

export function fmtPhone(p?: string | null) {
  if (!p) return '';
  const d = p.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return p;
}
