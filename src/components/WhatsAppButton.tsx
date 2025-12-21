import { MessageCircle } from 'lucide-react';

interface WhatsAppButtonProps {
  message?: string;
  phone?: string;
}

export function WhatsAppButton({ 
  message = 'Olá! Gostaria de mais informações sobre os imóveis.',
  phone = '5515999999999' 
}: WhatsAppButtonProps) {
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] text-white px-5 py-4 rounded-full shadow-lg hover:bg-[#20BA5C] transition-all hover:scale-105 animate-pulse-gold"
      aria-label="Fale conosco pelo WhatsApp"
    >
      <MessageCircle className="h-6 w-6" />
      <span className="hidden md:inline font-medium">Fale Conosco</span>
    </a>
  );
}
