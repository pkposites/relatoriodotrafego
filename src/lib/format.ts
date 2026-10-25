const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });
const dec = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

export const formatBRL = (n: number) => brl.format(n);
export const formatPct = (n: number) => pct.format(n);
export const formatDec = (n: number) => dec.format(n);

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}
