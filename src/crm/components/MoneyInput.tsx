import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';

function formatBRText(raw: string): string {
  // Mantém apenas dígitos e uma vírgula
  let t = raw.replace(/[^\d,]/g, '');
  const firstComma = t.indexOf(',');
  if (firstComma >= 0) {
    t = t.slice(0, firstComma + 1) + t.slice(firstComma + 1).replace(/,/g, '');
  }
  const [intPartRaw, decPartRaw] = t.split(',');
  const intPart = intPartRaw.replace(/^0+(?=\d)/, '');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (firstComma >= 0) {
    return grouped + ',' + (decPartRaw ?? '').slice(0, 2);
  }
  return grouped;
}

function parseBR(text: string): number | null {
  if (!text) return null;
  const n = Number(text.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function numberToText(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '';
  return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
}

export function MoneyInput({ value, onChange, ...rest }: MoneyInputProps) {
  const [text, setText] = useState<string>(() => numberToText(value));

  // Sincroniza quando o valor externo muda (ex.: ao carregar imóvel)
  useEffect(() => {
    const current = parseBR(text);
    if ((value ?? null) !== current) {
      setText(numberToText(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Input
      type="text"
      inputMode="decimal"
      {...rest}
      value={text}
      onChange={(e) => {
        const formatted = formatBRText(e.target.value);
        setText(formatted);
        onChange(parseBR(formatted));
      }}
      onBlur={() => setText(numberToText(parseBR(text)))}
    />
  );
}
