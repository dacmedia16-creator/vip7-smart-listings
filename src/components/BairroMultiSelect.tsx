import * as React from "react";
import { Check, ChevronsUpDown, MapPin, Search, Loader2, X } from "lucide-react";
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

export interface BairroOption {
  codigo: number;
  nome: string;
  cidade?: string;
}

interface BairroMultiSelectProps {
  bairros: BairroOption[];
  values: string[]; // Array de nomes selecionados
  onValuesChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  triggerClassName?: string;
  maxSelections?: number;
}

export function BairroMultiSelect({
  bairros,
  values,
  onValuesChange,
  placeholder = "Selecione bairros",
  disabled = false,
  isLoading = false,
  className,
  triggerClassName,
  maxSelections = 10,
}: BairroMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // Find selected bairros
  const selectedBairros = bairros.filter((b) =>
    values.includes(b.nome)
  );

  // Filter bairros by search term
  const filteredBairros = React.useMemo(() => {
    if (!search.trim()) return bairros;

    const searchLower = search.toLowerCase().trim();
    return bairros.filter((b) => {
      const nomeMatch = b.nome?.toLowerCase().includes(searchLower);
      return nomeMatch;
    });
  }, [bairros, search]);

  // Sort bairros alphabetically
  const sortedBairros = React.useMemo(() => {
    return [...filteredBairros].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [filteredBairros]);

  const handleToggle = (nome: string) => {
    const isSelected = values.includes(nome);
    if (isSelected) {
      onValuesChange(values.filter((v) => v !== nome));
    } else if (values.length < maxSelections) {
      onValuesChange([...values, nome]);
    }
  };

  const handleClearAll = () => {
    onValuesChange([]);
    setSearch("");
  };

  const handleRemove = (nome: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onValuesChange(values.filter((v) => v !== nome));
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
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando...
              </span>
            ) : values.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {selectedBairros.slice(0, 2).map((bairro) => (
                  <Badge
                    key={bairro.codigo}
                    variant="secondary"
                    className="text-xs py-0 px-1.5 gap-1"
                  >
                    {bairro.nome.length > 15
                      ? `${bairro.nome.slice(0, 15)}...`
                      : bairro.nome}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={(e) => handleRemove(bairro.nome, e)}
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
              placeholder="Buscar bairro..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList className="max-h-[300px] overflow-auto">
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin opacity-50" />
                Carregando bairros...
              </div>
            ) : sortedBairros.length === 0 ? (
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                Nenhum bairro encontrado.
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
                    Máximo de {maxSelections} bairros selecionados
                  </div>
                )}

                <CommandGroup>
                  {sortedBairros.map((bairro) => {
                    const isSelected = values.includes(bairro.nome);
                    const isDisabled =
                      !isSelected && values.length >= maxSelections;

                    return (
                      <CommandItem
                        key={bairro.codigo}
                        value={bairro.nome}
                        onSelect={() => handleToggle(bairro.nome)}
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
                        <span className="truncate font-medium">
                          {bairro.nome}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
