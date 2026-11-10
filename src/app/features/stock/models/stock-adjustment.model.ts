import { AdjustmentReason } from './stock-in.model';

/** Body of POST /stock/adjustment (docs/api-spec.md section 5). One product per request. */
export interface StockAdjustmentRequestDto {
  product_id: number;
  /** The counted stock, not the difference; the server works out `qty`. */
  physical_stock: number;
  reason: AdjustmentReason;
  note?: string;
}

/** Reasons in the order of PRD 9.8, with their UI labels. */
export const ADJUSTMENT_REASONS: readonly { value: AdjustmentReason; label: string }[] = [
  { value: 'RUSAK', label: 'Rusak' },
  { value: 'KEDALUWARSA', label: 'Kedaluwarsa' },
  { value: 'HILANG', label: 'Hilang' },
  { value: 'SALAH_HITUNG', label: 'Salah Hitung' },
  { value: 'LAINNYA', label: 'Lainnya' },
];

export function reasonLabel(reason: AdjustmentReason | null): string {
  return ADJUSTMENT_REASONS.find((r) => r.value === reason)?.label ?? '';
}

/**
 * Physical minus system stock, shown as "+2" / "−3" while typing. Display only:
 * the server recomputes it from its current stock.
 */
export function stockDifference(systemStock: number, physicalStock: number): number {
  return physicalStock - systemStock;
}

/** A counted stock is a whole number of at least 0 (stock is never negative, PRD 14.4). */
export function isValidPhysicalStock(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

/** Typed count to a number; null unless it is digits only ("1e3", "2.5", "-1" are rejected). */
export function parsePhysicalStock(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const value = Number(trimmed);
  return isValidPhysicalStock(value) ? value : null;
}

/** "Lainnya" needs a note so the audit trail says what happened. */
export function isNoteRequired(reason: AdjustmentReason | null): boolean {
  return reason === 'LAINNYA';
}

export function toStockAdjustmentRequest(
  productId: number,
  physicalStock: number,
  reason: AdjustmentReason,
  note: string,
): StockAdjustmentRequestDto {
  const trimmed = note.trim();
  return {
    product_id: productId,
    physical_stock: physicalStock,
    reason,
    ...(trimmed ? { note: trimmed } : {}),
  };
}

/** "+23", "−4" (true minus sign), "0". The sign is text, not just colour (PRD section 11). */
export function formatSignedQty(qty: number): string {
  if (qty > 0) {
    return `+${qty}`;
  }
  return qty < 0 ? `−${-qty}` : '0';
}
