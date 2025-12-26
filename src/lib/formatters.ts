// Helper para gerar URL de compartilhamento com OG tags (foto aparece no WhatsApp)
export const buildOgShareUrl = (codigo: number | string): string => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const redirectUrl = encodeURIComponent(window.location.origin);
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
