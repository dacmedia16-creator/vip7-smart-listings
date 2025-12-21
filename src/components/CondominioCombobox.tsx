import * as React from "react";
import { Check, ChevronsUpDown, Castle, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface CondominioOption {
  codigo: number;
  nome: string;
  cidade?: string;
}

interface CondominioComboboxProps {
  condominios: CondominioOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  triggerClassName?: string;
}

export function CondominioCombobox({
  condominios,
  value,
  onValueChange,
  placeholder = "Selecione um condomínio",
  disabled = false,
  isLoading = false,
  className,
  triggerClassName,
}: CondominioComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // Find selected condominio
  const selectedCondominio = condominios.find(
    (c) => String(c.codigo) === value
  );

  // Filter condominios by search term
  const filteredCondominios = React.useMemo(() => {
    if (!search.trim()) return condominios;
    
    const searchLower = search.toLowerCase().trim();
    return condominios.filter((c) => {
      const nomeMatch = c.nome?.toLowerCase().includes(searchLower);
      const cidadeMatch = c.cidade?.toLowerCase().includes(searchLower);
      const codigoMatch = String(c.codigo).includes(searchLower);
      return nomeMatch || cidadeMatch || codigoMatch;
    });
  }, [condominios, search]);

  // Group condominios by city
  const groupedCondominios = React.useMemo(() => {
    const groups: Record<string, CondominioOption[]> = {};
    
    for (const cond of filteredCondominios) {
      const city = cond.cidade || "Outros";
      if (!groups[city]) {
        groups[city] = [];
      }
      groups[city].push(cond);
    }
    
    // Sort cities alphabetically
    const sortedCities = Object.keys(groups).sort((a, b) => {
      if (a === "Outros") return 1;
      if (b === "Outros") return -1;
      return a.localeCompare(b);
    });
    
    return sortedCities.map((city) => ({
      city,
      condominios: groups[city].sort((a, b) => a.nome.localeCompare(b.nome)),
    }));
  }, [filteredCondominios]);

  const handleSelect = (codigoValue: string) => {
    onValueChange(codigoValue === value ? "" : codigoValue);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            triggerClassName
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <Castle className="h-4 w-4 text-primary shrink-0" />
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando...
              </span>
            ) : selectedCondominio ? (
              <span className="truncate">
                <span className="font-medium">{selectedCondominio.nome}</span>
                <span className="text-muted-foreground ml-1">
                  #{selectedCondominio.codigo}
                </span>
              </span>
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className={cn("w-[350px] p-0 bg-card border-border z-50", className)} 
        align="start"
      >
        <Command shouldFilter={false}>
          <div className="flex items-center border-b border-border px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder="Buscar por nome, cidade ou código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList className="max-h-[300px] overflow-auto">
            {filteredCondominios.length === 0 ? (
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                Nenhum condomínio encontrado.
              </CommandEmpty>
            ) : (
              <>
                {/* Option to clear selection */}
                {value && (
                  <CommandItem
                    value="clear"
                    onSelect={() => handleSelect("")}
                    className="cursor-pointer"
                  >
                    <span className="text-muted-foreground">Todos os condomínios</span>
                  </CommandItem>
                )}
                
                {groupedCondominios.map((group) => (
                  <CommandGroup 
                    key={group.city} 
                    heading={
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                        {group.city} ({group.condominios.length})
                      </span>
                    }
                  >
                    {group.condominios.map((cond) => (
                      <CommandItem
                        key={cond.codigo}
                        value={String(cond.codigo)}
                        onSelect={() => handleSelect(String(cond.codigo))}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            value === String(cond.codigo)
                              ? "opacity-100 text-primary"
                              : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="truncate font-medium">{cond.nome}</span>
                          <span className="text-xs text-muted-foreground">
                            Código: {cond.codigo}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
