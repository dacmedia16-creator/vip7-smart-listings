// Helper para gerar URL de compartilhamento com OG tags (foto aparece no WhatsApp)
export const buildOgShareUrl = (codigo: number | string): string => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  // Envia o redirect como URL FINAL do imóvel (mantendo #/ para funcionar mesmo sem rewrite no servidor)
  const redirectTarget = `${window.location.origin}/#/imovel/${codigo}`;

  const redirectUrl = encodeURIComponent(redirectTarget);
  const cacheBuster = Math.floor(Date.now() / 60000); // muda a cada minuto para evitar cache

  return `${supabaseUrl}/functions/v1/og-metadata?codigo=${codigo}&redirect=${redirectUrl}&v=${cacheBuster}`;
};

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

export const generateWhatsAppLink = (message: string, phone = '551535008641'): string => {
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encodedMessage}`;
};

export const generatePropertyWhatsAppMessage = (property: { titulo?: string; codigo: number | string }): string => {
  // Usa o link com OG para aparecer foto no WhatsApp
  const propertyUrl = buildOgShareUrl(property.codigo);
  return `Olá! Tenho interesse no imóvel: ${property.titulo || `Código ${property.codigo}`}\n\nLink: ${propertyUrl}`;
};
