import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
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

interface AutocompleteInputProps {
  options: string[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export function AutocompleteInput({
  options,
  value,
  onValueChange,
  placeholder = "Digite para buscar...",
  label,
  className,
}: AutocompleteInputProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState(value);

  React.useEffect(() => {
    setSearch(value);
  }, [value]);

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options.slice(0, 50);
    return options
      .filter((o) => o.toLowerCase().includes(term))
      .slice(0, 50);
  }, [options, search]);

  const handleSelect = (selected: string) => {
    onValueChange(selected);
    setSearch(selected);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-card border-border z-50" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b border-border px-3">
            <input
              placeholder={placeholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                onValueChange(e.target.value);
              }}
              onFocus={() => setOpen(true)}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList className="max-h-[240px] overflow-auto">
            {filtered.length === 0 ? (
              <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
                Nenhum resultado.
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filtered.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => handleSelect(option)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === option ? "opacity-100 text-primary" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{option}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
