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

export interface ImovelParaValidacao {
  titulo?: string | null;
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
  if (!im.titulo || im.titulo.trim().length < 5) erros.push('Título precisa ter pelo menos 5 caracteres');
  if (!im.descricao || im.descricao.trim().length < 100) erros.push('Descrição precisa ter pelo menos 100 caracteres');
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
