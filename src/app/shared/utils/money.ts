const THOUSANDS = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

/** 144500 -> "144.500" */
export function formatThousands(value: number): string {
  return THOUSANDS.format(value);
}

/** 144500 -> "Rp 144.500", -500 -> "-Rp 500" (PRD section 7). */
export function formatRupiah(value: number): string {
  const amount = `Rp ${formatThousands(Math.abs(value))}`;
  return value < 0 ? `-${amount}` : amount;
}

/** Keeps only the digits of typed text: "Rp 1.500" -> 1500, "" -> null. */
export function parseDigits(text: string): number | null {
  const digits = text.replace(/\D/g, '');
  return digits === '' ? null : Number(digits);
}
