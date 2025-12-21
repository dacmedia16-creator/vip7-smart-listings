export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatArea = (area: number): string => {
  return `${area} m²`;
};

export const generateWhatsAppLink = (message: string, phone = '5515999999999'): string => {
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encodedMessage}`;
};

export const generatePropertyWhatsAppMessage = (property: { titulo?: string; codigo: number | string }): string => {
  const baseUrl = window.location.origin;
  return `Olá! Tenho interesse no imóvel: ${property.titulo || `Código ${property.codigo}`}\n\nLink: ${baseUrl}/imovel/${property.codigo}`;
};
