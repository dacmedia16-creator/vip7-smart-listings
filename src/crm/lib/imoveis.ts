export const IMOVEL_STATUS = [
  { value: 'disponivel', label: 'Disponível', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'sob_proposta', label: 'Sob Proposta', color: 'bg-amber-100 text-amber-700' },
  { value: 'vendido', label: 'Vendido', color: 'bg-[#FBF3DC] text-[#7A5A14]' },
  { value: 'alugado', label: 'Alugado', color: 'bg-purple-100 text-purple-700' },
  { value: 'inativo', label: 'Inativo', color: 'bg-[#F0E9D6] text-[#2A2A30]' },
] as const;

export const TIPO_IMOVEL = [
  'Apartamento','Casa','Casa em Condomínio','Cobertura','Terreno',
  'Sala Comercial','Galpão','Sítio/Fazenda','Outros',
];

export const FINALIDADE = [
  { value: 'venda', label: 'Venda' },
  { value: 'aluguel', label: 'Aluguel' },
  { value: 'venda_aluguel', label: 'Venda e Aluguel' },
];

export function imovelStatusMeta(s: string) {
  return IMOVEL_STATUS.find((x) => x.value === s) ?? IMOVEL_STATUS[0];
}
