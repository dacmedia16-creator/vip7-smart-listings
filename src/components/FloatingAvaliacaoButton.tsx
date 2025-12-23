import { FileText } from 'lucide-react';
import { generateWhatsAppLink } from '@/lib/formatters';

export function FloatingAvaliacaoButton() {
  const whatsappUrl = generateWhatsAppLink('Olá! Gostaria de solicitar uma avaliação do meu imóvel.');

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-50 group"
      aria-label="Avalie seu imóvel gratuitamente"
    >
      <div className="relative">
        {/* Subtle Glow */}
        <div className="absolute inset-0 rounded-full bg-primary/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Button */}
        <div className="relative flex items-center gap-3 bg-primary text-primary-foreground pl-5 pr-6 py-4 rounded-full shadow-[0_10px_40px_hsl(var(--primary)/0.3)] hover:shadow-[0_15px_50px_hsl(var(--primary)/0.4)] transition-all duration-500 hover:scale-105">
          <FileText className="h-5 w-5" />
          <span className="font-medium hidden md:inline">Avalie seu Imóvel</span>
        </div>
      </div>
    </a>
  );
}
