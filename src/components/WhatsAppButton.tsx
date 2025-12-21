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
      className="fixed bottom-6 right-6 z-50 group"
      aria-label="Fale conosco pelo WhatsApp"
    >
      <div className="relative">
        {/* Pulse Ring */}
        <div className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30" />
        
        {/* Button */}
        <div className="relative flex items-center gap-3 bg-[#25D366] text-white pl-5 pr-6 py-4 rounded-full shadow-[0_10px_40px_rgba(37,211,102,0.4)] hover:shadow-[0_15px_50px_rgba(37,211,102,0.5)] transition-all duration-500 hover:scale-105">
          <MessageCircle className="h-6 w-6" />
          <span className="font-medium hidden md:inline">Fale Conosco</span>
        </div>
      </div>
    </a>
  );
}
