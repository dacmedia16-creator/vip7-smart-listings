/**
 * Integração com portais imobiliários.
 * Validação compartilhada entre UI (mostra erro) e edge function (pula imóvel).
 */

export type PortalId = 'zap_vivareal' | 'olx' | 'imovelweb' | 'chavesnamao';

export const PORTAIS: { id: PortalId; nome: string; descricao: string }[] = [
  { id: 'zap_vivareal', nome: 'Zap + VivaReal', descricao: 'Padrão VRSync (Grupo OLX)' },
  { id: 'olx', nome: 'OLX', descricao: 'Padrão VRSync (Grupo OLX)' },
  { id: 'imovelweb', nome: 'ImovelWeb', descricao: 'Universal Feed' },
  { id: 'chavesnamao', nome: 'Chaves na Mão', descricao: 'XML Chaves na Mão' },
];

export type TipoAnuncio =
  | 'simples'
  | 'destaque'
  | 'super_destaque'
  | 'triple'
  | 'premiere_premium'
  | 'premiere_especial';

export const TIPOS_ANUNCIO: { id: TipoAnuncio; label: string; descricao: string }[] = [
  { id: 'simples', label: 'Simples', descricao: 'Anúncio padrão' },
  { id: 'destaque', label: 'Destaque', descricao: 'Maior visibilidade' },
  { id: 'super_destaque', label: 'Super Destaque', descricao: 'Aparece no topo das buscas' },
  { id: 'triple', label: 'Triple', descricao: 'Triple boost de visualizações' },
  { id: 'premiere_premium', label: 'Premiere (Destaque premium)', descricao: 'Posição premium' },
  { id: 'premiere_especial', label: 'Premiere (Destaque especial)', descricao: 'Máxima exposição' },
];

// Exclusivo é o antigo Destaque Premium (VRSync PREMIERE_1).
// https://help-center-eddie.olx.com.br/s/article/como-funcionam-os-destaques
export const TIPOS_ZAP = TIPOS_ANUNCIO.filter((t) => t.id !== 'premiere_especial').map((t) => ({
  ...t,
  label: t.id === 'simples' ? 'Sem Destaque' : t.id === 'triple' ? 'Destaque Triplo' : t.id === 'premiere_premium' ? 'Destaque Exclusivo' : t.label,
}));

export function tiposAnuncioDoPortal(portal: PortalId, atual?: TipoAnuncio) {
  if (portal !== 'zap_vivareal') return TIPOS_ANUNCIO;
  // Preserva acesso aos anúncios legados sem converter seu tipo.
  return atual === 'premiere_especial' ? [...TIPOS_ZAP, { id: 'premiere_especial' as const, label: 'Premiere (Destaque especial) — legado', descricao: 'Anúncio existente' }] : TIPOS_ZAP;
}

export interface ImovelParaValidacao {
  titulo?: string | null;
  titulo_anuncio?: string | null;
  descricao?: string | null;
  preco?: number | null;
  area?: number | null;
  area_total?: number | null;
  cep?: string | null;
  cidade?: string | null;
  bairro?: string | null;
  estado?: string | null;
  tipo?: string | null;
  finalidade?: string | null;
  fotos?: string[] | null;
}

export function validarImovelParaPortais(im: ImovelParaValidacao): string[] {
  const erros: string[] = [];
  // Mesma regra do feed: prefere o título do anúncio quando preenchido.
  const titulo = ((im.titulo_anuncio ?? '').trim() || (im.titulo ?? '')).trim();
  if (titulo.length < 10) erros.push('Título precisa ter pelo menos 10 caracteres');
  else if (titulo.length > 100) erros.push('Título não pode passar de 100 caracteres');
  const descricao = (im.descricao ?? '').trim();
  if (descricao.length < 100) erros.push('Descrição precisa ter pelo menos 100 caracteres');
  else if (descricao.length > 3000) erros.push('Descrição não pode passar de 3000 caracteres');
  if (!im.preco || Number(im.preco) <= 0) erros.push('Preço obrigatório');
  const area = im.area ?? im.area_total;
  if (!area || Number(area) <= 0) erros.push('Área obrigatória');
  if (!im.cidade) erros.push('Cidade obrigatória');
  if (!im.bairro) erros.push('Bairro obrigatório');
  if (!im.estado) erros.push('Estado obrigatório');
  if (!im.cep) erros.push('CEP obrigatório');
  if (!im.tipo) erros.push('Tipo obrigatório');
  if (!im.finalidade) erros.push('Finalidade obrigatória');
  if (!im.fotos || im.fotos.length === 0) erros.push('Pelo menos 1 foto');
  return erros;
}
