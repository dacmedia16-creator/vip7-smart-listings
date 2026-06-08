// Mapeamentos PT (CRM) → VRSync (vocabulário oficial Grupo OLX).
// https://developers.grupozap.com/feeds/vrsync/

export function mapUsageType(tipo: string): 'Residential' | 'Commercial' {
  const t = (tipo || '').toLowerCase();
  if (
    t.includes('comercial') || t.includes('sala') || t.includes('loja') ||
    t.includes('galp') || t.includes('escrit') || t.includes('industri') ||
    t.includes('predio') || t.includes('prédio') || t.includes('hotel') ||
    t.includes('pousada')
  ) return 'Commercial';
  return 'Residential';
}

export function mapPropertyType(tipo: string): string {
  const t = (tipo || '').toLowerCase().trim();
  // Residencial
  if (t.includes('apartamento') && t.includes('cobert')) return 'Residential / Penthouse';
  if (t.includes('cobert')) return 'Residential / Penthouse';
  if (t.includes('apartamento') || t === 'apto') return 'Residential / Apartment';
  if (t.includes('studio') || t.includes('kitnet') || t.includes('loft')) return 'Residential / Kitnet';
  if (t.includes('flat')) return 'Residential / Flat';
  if (t.includes('casa') && t.includes('cond')) return 'Residential / Condominium House';
  if (t.includes('casa') && t.includes('vila')) return 'Residential / Village House';
  if (t.includes('casa')) return 'Residential / Home';
  if (t.includes('sobrado')) return 'Residential / Home';
  if (t.includes('chac') || t.includes('chá') || t.includes('sitio') || t.includes('sítio') || t.includes('fazenda') || t.includes('rural')) return 'Residential / Country House';
  if (t.includes('terreno') || t.includes('lote') || t.includes('area')) return 'Allotment Land';
  // Comercial
  if (t.includes('sala') || t.includes('conjunto')) return 'Commercial / Business';
  if (t.includes('loja')) return 'Commercial / Store';
  if (t.includes('galp')) return 'Commercial / Warehouse';
  if (t.includes('hotel') || t.includes('pousada')) return 'Commercial / Hotel';
  if (t.includes('predio') || t.includes('prédio')) return 'Commercial / Building';
  if (t.includes('industri')) return 'Commercial / Warehouse';
  return mapUsageType(tipo) === 'Commercial' ? 'Commercial / Business' : 'Residential / Apartment';
}

// Tabela PT → EN (Feature) — apenas itens do vocabulário oficial VRSync.
// Características sem match são descartadas silenciosamente (não invalidam o imóvel).
const FEATURE_MAP: Record<string, string> = {
  // Lazer
  'piscina': 'Pool',
  'academia': 'Gym',
  'churrasqueira': 'BBQ',
  'churrasqueira gourmet': 'BBQ',
  'espaço gourmet': 'Gourmet Area',
  'espaco gourmet': 'Gourmet Area',
  'area gourmet': 'Gourmet Area',
  'área gourmet': 'Gourmet Area',
  'playground': 'Playground',
  'quadra': 'Sports Court',
  'quadra esportiva': 'Sports Court',
  'quadra de tenis': 'Tennis court',
  'quadra de tênis': 'Tennis court',
  'quadra poliesportiva': 'Sports Court',
  'salao de jogos': 'Game room',
  'salão de jogos': 'Game room',
  'sala de jogos': 'Game room',
  'salao de festas': 'Reception room',
  'salão de festas': 'Reception room',
  'salao de festa': 'Reception room',
  'sauna': 'Sauna',
  'spa': 'Spa',
  'sala de massagem': 'Massage Room',
  'pista de cooper': 'Jogging track',
  'squash': 'Squash',
  'cinema': 'Media Room',
  'sala de cinema': 'Media Room',
  'home theater': 'Media Room',
  'jardim': 'Garden Area',
  'area verde': 'Green space / Park',
  'área verde': 'Green space / Park',
  // Estrutura
  'elevador': 'Elevator',
  'portaria 24h': 'Security Guard on Duty',
  'portaria 24 horas': 'Security Guard on Duty',
  'portaria': 'Security Guard on Duty',
  'porteiro': 'Security Guard on Duty',
  'interfone': 'Intercom',
  'alarme': 'Alarm System',
  'cerca eletrica': 'Fenced Yard',
  'cerca elétrica': 'Fenced Yard',
  'cftv': 'TV Security',
  'circuito de tv': 'TV Security',
  'controle de acesso': 'Controlled Access',
  'gerador': 'Generator',
  'lavanderia': 'Laundry',
  // Interior
  'varanda': 'Balcony',
  'sacada': 'Balcony',
  'mobiliado': 'Furnished',
  'semi mobiliado': 'Furnished',
  'semi-mobiliado': 'Furnished',
  'ar condicionado': 'Cooling',
  'aquecimento': 'Heating',
  'lareira': 'Fireplace',
  'closet': 'Home Office',
  'escritorio': 'Home Office',
  'escritório': 'Home Office',
  'cozinha': 'Kitchen',
  'cozinha planejada': 'Kitchen',
  'cozinha americana': 'Kitchen',
  'dependencia de empregada': "Maid's Quarters",
  'dependência de empregada': "Maid's Quarters",
  'quarto de empregada': "Maid's Quarters",
  'deposito': 'Warehouse',
  'depósito': 'Warehouse',
  // Conexões / vista
  'internet': 'Internet Connection',
  'wi-fi': 'Internet Connection',
  'wifi': 'Internet Connection',
  'tv a cabo': 'Cable Television',
  'tv': 'Cable Television',
  'vista para o mar': 'Ocean View',
  'vista mar': 'Ocean View',
  'vista para montanha': 'Mountain View',
  'vista para a lagoa': 'Lake View',
  'vista lago': 'Lake View',
  // Estacionamento
  'garagem': 'Parking Garage',
  'estacionamento': 'Parking Garage',
};

export function mapFeature(c: string): string | null {
  const key = (c || '').toLowerCase().trim().replace(/\s+/g, ' ');
  return FEATURE_MAP[key] ?? null;
}

export function mapDisplayAddress(
  mostrar: boolean,
  endereco: string | null | undefined,
  numero: string | null | undefined,
  bairro: string | null | undefined,
): 'Street' | 'Neighborhood' | 'City' | 'None' {
  if (mostrar && endereco && numero) return 'Street';
  if (bairro) return 'Neighborhood';
  return 'City';
}

export function mapTransactionType(finalidade: string): 'For Sale' | 'For Rent' {
  return (finalidade || '').toLowerCase() === 'aluguel' ? 'For Rent' : 'For Sale';
}
