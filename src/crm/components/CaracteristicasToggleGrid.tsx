import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface Item { key: string; label: string }

interface Props {
  items: readonly Item[];
  prefix: string; // ex: 'interna' | 'externa' | 'lazer'
  value: string[];
  onChange: (next: string[]) => void;
  columns?: number;
}

export function CaracteristicasToggleGrid({ items, prefix, value, onChange, columns = 2 }: Props) {
  const set = new Set(value);
  const toggle = (key: string, on: boolean) => {
    const full = `${prefix}:${key}`;
    const next = new Set(value);
    if (on) next.add(full); else next.delete(full);
    onChange(Array.from(next));
  };
  return (
    <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {items.map((it) => {
        const checked = set.has(`${prefix}:${it.key}`);
        return (
          <div key={it.key} className="flex items-center gap-2">
            <Switch checked={checked} onCheckedChange={(v) => toggle(it.key, v)} />
            <Label className="text-sm text-[#2A2A30] font-normal cursor-pointer">{it.label}</Label>
          </div>
        );
      })}
    </div>
  );
}
