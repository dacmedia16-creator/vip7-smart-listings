import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface PropertyBreadcrumbProps {
  propertyTitle?: string;
  propertyCode?: number;
  isRental?: boolean;
  city?: string;
  neighborhood?: string;
}

export function PropertyBreadcrumb({
  propertyTitle,
  propertyCode,
  isRental,
  city,
  neighborhood,
}: PropertyBreadcrumbProps) {
  return (
    <nav
      aria-label="Navegação"
      className="flex items-center gap-1 text-sm text-muted-foreground overflow-x-auto pb-2"
    >
      <Link
        to="/"
        className="flex items-center gap-1 hover:text-primary transition-colors shrink-0"
      >
        <Home className="h-4 w-4" />
        <span className="sr-only md:not-sr-only">Início</span>
      </Link>

      <ChevronRight className="h-4 w-4 shrink-0" />

      <Link
        to={`/imoveis${isRental !== undefined ? `?finalidade=${isRental ? 'aluguel' : 'venda'}` : ''}`}
        className="hover:text-primary transition-colors shrink-0"
      >
        Imóveis
      </Link>

      {city && (
        <>
          <ChevronRight className="h-4 w-4 shrink-0" />
          <Link
            to={`/imoveis?cidades=${encodeURIComponent(city)}${isRental !== undefined ? `&finalidade=${isRental ? 'aluguel' : 'venda'}` : ''}`}
            className="hover:text-primary transition-colors shrink-0"
          >
            {city}
          </Link>
        </>
      )}

      {neighborhood && (
        <>
          <ChevronRight className="h-4 w-4 shrink-0" />
          <Link
            to={`/imoveis?cidades=${encodeURIComponent(city || '')}&bairros=${encodeURIComponent(neighborhood)}${isRental !== undefined ? `&finalidade=${isRental ? 'aluguel' : 'venda'}` : ''}`}
            className="hover:text-primary transition-colors shrink-0"
          >
            {neighborhood}
          </Link>
        </>
      )}

      <ChevronRight className="h-4 w-4 shrink-0" />
      <span className="text-foreground font-medium truncate max-w-[200px] md:max-w-none">
        {propertyTitle || `Cód. ${propertyCode}`}
      </span>
    </nav>
  );
}
