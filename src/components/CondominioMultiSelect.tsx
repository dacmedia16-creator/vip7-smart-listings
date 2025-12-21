import * as React from "react";
import { Check, ChevronsUpDown, Castle, Search, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export interface CondominioOption {
  codigo: number;
  nome: string;
  cidade?: string;
  quantidadeImoveis?: number;
}

interface CondominioMultiSelectProps {
  condominios: CondominioOption[];
  values: string[]; // Array de códigos selecionados
  onValuesChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  triggerClassName?: string;
  maxSelections?: number;
}

export function CondominioMultiSelect({
  condominios,
  values,
  onValuesChange,
  placeholder = "Selecione condomínios",
  disabled = false,
  isLoading = false,
  className,
  triggerClassName,
  maxSelections = 10,
}: CondominioMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // Find selected condominios
  const selectedCondominios = condominios.filter((c) =>
    values.includes(String(c.codigo))
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

  const handleToggle = (codigoValue: string) => {
    const isSelected = values.includes(codigoValue);
    if (isSelected) {
      onValuesChange(values.filter((v) => v !== codigoValue));
    } else if (values.length < maxSelections) {
      onValuesChange([...values, codigoValue]);
    }
  };

  const handleClearAll = () => {
    onValuesChange([]);
    setSearch("");
  };

  const handleRemove = (codigoValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onValuesChange(values.filter((v) => v !== codigoValue));
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
            "w-full justify-between font-normal min-h-[40px] h-auto",
            !values.length && "text-muted-foreground",
            triggerClassName
          )}
        >
          <div className="flex items-center gap-2 flex-wrap flex-1 text-left">
            <Castle className="h-4 w-4 text-primary shrink-0" />
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando...
              </span>
            ) : values.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {selectedCondominios.slice(0, 2).map((cond) => (
                  <Badge
                    key={cond.codigo}
                    variant="secondary"
                    className="text-xs py-0 px-1.5 gap-1"
                  >
                    {cond.nome.length > 15
                      ? `${cond.nome.slice(0, 15)}...`
                      : cond.nome}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={(e) => handleRemove(String(cond.codigo), e)}
                    />
                  </Badge>
                ))}
                {values.length > 2 && (
                  <Badge variant="secondary" className="text-xs py-0 px-1.5">
                    +{values.length - 2}
                  </Badge>
                )}
              </div>
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
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin opacity-50" />
                Carregando condomínios...
              </div>
            ) : filteredCondominios.length === 0 ? (
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                Nenhum condomínio encontrado.
              </CommandEmpty>
            ) : (
              <>
                {/* Selected count and clear button */}
                {values.length > 0 && (
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">
                      {values.length} selecionado{values.length > 1 ? "s" : ""}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAll}
                      className="h-auto py-1 px-2 text-xs"
                    >
                      Limpar tudo
                    </Button>
                  </div>
                )}

                {values.length >= maxSelections && (
                  <div className="px-3 py-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20">
                    Máximo de {maxSelections} condomínios selecionados
                  </div>
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
                    {group.condominios.map((cond) => {
                      const isSelected = values.includes(String(cond.codigo));
                      const isDisabled =
                        !isSelected && values.length >= maxSelections;

                      return (
                        <CommandItem
                          key={cond.codigo}
                          value={String(cond.codigo)}
                          onSelect={() => handleToggle(String(cond.codigo))}
                          className={cn(
                            "cursor-pointer",
                            isDisabled && "opacity-50 cursor-not-allowed"
                          )}
                          disabled={isDisabled}
                        >
                          <div
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0 rounded border flex items-center justify-center",
                              isSelected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground"
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="truncate font-medium">
                              {cond.nome}
                              {cond.quantidadeImoveis !== undefined && (
                                <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                                  ({cond.quantidadeImoveis})
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Código: {cond.codigo}
                            </span>
                          </div>
                        </CommandItem>
                      );
                    })}
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
