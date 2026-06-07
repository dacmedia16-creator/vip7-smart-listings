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

export const DESTINACAO = [
  'Residencial', 'Comercial', 'Industrial', 'Rural', 'Misto',
];

export const TIPO_VAGA = [
  'Coberta', 'Descoberta', 'Demarcada', 'Não demarcada', 'Box fechado',
];

export const POSICAO_IMOVEL = [
  'Frente', 'Fundos', 'Lateral', 'Outra',
];

export const TIPO_MEDIDA = ['m', 'cm', 'km', 'ha'];

export const PLACA_FAIXA = ['Sim', 'Não', 'Pendente'];

export const LOCAL_CHAVES = [
  'Imobiliária', 'Portaria', 'Proprietário', 'Inquilino', 'Zelador', 'Outro',
];

export const TIPO_COMPLEMENTO = [
  'Apto', 'Casa', 'Sala', 'Loja', 'Bloco', 'Lote',
];

export const CARACT_INTERNAS = [
  { key: 'ar_condicionado', label: 'Ar condicionado' },
  { key: 'area_servico', label: 'Área serviço' },
  { key: 'armario_cozinha', label: 'Armário cozinha' },
  { key: 'box_banheiro', label: 'Box banheiro' },
  { key: 'dce', label: 'DCE' },
  { key: 'escritorio', label: 'Escritório' },
  { key: 'mobiliado', label: 'Mobiliado' },
  { key: 'sol_manha', label: 'Sol da manhã' },
  { key: 'varanda_gourmet', label: 'Varanda gourmet' },
  { key: 'cabeamento_estruturado', label: 'Cabeamento estruturado' },
  { key: 'conexao_internet', label: 'Conexão internet' },
  { key: 'vista_lago', label: 'Vista para lago' },
  { key: 'area_privativa', label: 'Área privativa' },
  { key: 'armario_banheiro', label: 'Armário banheiro' },
  { key: 'armario_quarto', label: 'Armário quarto' },
  { key: 'closet', label: 'Closet' },
  { key: 'despensa', label: 'Despensa' },
  { key: 'lavabo', label: 'Lavabo' },
  { key: 'rouparia', label: 'Rouparia' },
  { key: 'vista_mar', label: 'Vista para o mar' },
  { key: 'lareira', label: 'Lareira' },
  { key: 'tv_cabo', label: 'TV a cabo' },
  { key: 'vista_montanha', label: 'Vista para montanha' },
] as const;

export const CARACT_EXTERNAS = [
  { key: 'agua_individual', label: 'Água individual' },
  { key: 'aquec_eletrico', label: 'Aquec. elétrico' },
  { key: 'aquec_gas', label: 'Aquec. gás' },
  { key: 'aquec_solar', label: 'Aquec. solar' },
  { key: 'cerca_eletrica', label: 'Cerca elétrica' },
  { key: 'gas_canalizado', label: 'Gás canalizado' },
  { key: 'jardim', label: 'Jardim' },
  { key: 'portao_eletronico', label: 'Portão eletrônico' },
  { key: 'seguranca_24h', label: 'Segurança 24 horas' },
  { key: 'gramado', label: 'Gramado' },
  { key: 'alarme', label: 'Alarme' },
  { key: 'box_despejo', label: 'Box despejo' },
  { key: 'circuito_tv', label: 'Circuito TV' },
  { key: 'interfone', label: 'Interfone' },
  { key: 'lavanderia', label: 'Lavanderia' },
  { key: 'portaria_24h', label: 'Portaria 24 horas' },
  { key: 'quintal', label: 'Quintal' },
] as const;

export const LAZER = [
  { key: 'academia', label: 'Academia' },
  { key: 'churrasqueira', label: 'Churrasqueira' },
  { key: 'hidromassagem', label: 'Hidromassagem' },
  { key: 'home_cinema', label: 'Home cinema' },
  { key: 'piscina', label: 'Piscina' },
  { key: 'playground', label: 'Playground' },
  { key: 'quadra_poliesportiva', label: 'Quadra poliesportiva' },
  { key: 'quadra_tenis', label: 'Quadra de tênis' },
  { key: 'sala_massagem', label: 'Sala de massagem' },
  { key: 'salao_festas', label: 'Salão de festas' },
  { key: 'salao_jogos', label: 'Salão de jogos' },
  { key: 'sauna', label: 'Sauna' },
  { key: 'wifi', label: 'Wifi' },
  { key: 'espaco_gourmet', label: 'Espaço gourmet' },
  { key: 'garage_band', label: 'Garage Band' },
  { key: 'quadra_squash', label: 'Quadra de squash' },
  { key: 'quadra_beach_tenis', label: 'Quadra de beach tênis' },
] as const;

export function imovelStatusMeta(s: string) {
  return IMOVEL_STATUS.find((x) => x.value === s) ?? IMOVEL_STATUS[0];
}
