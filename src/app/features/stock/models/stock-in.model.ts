// ── Products to pick ─────────────────────────────────────────

/**
 * The fields of the API product object (docs/api-spec.md section 3) that the
 * stock screens need. The server sends the full object; the rest is ignored.
 */
export interface StockProductDto {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  stock: number;
}

/** Product as the stock screens see it. */
export interface StockProduct {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  stock: number;
}

export function toStockProduct(dto: StockProductDto): StockProduct {
  return { id: dto.id, sku: dto.sku, barcode: dto.barcode, name: dto.name, stock: dto.stock };
}

/** Scanner input is digits only; EAN-8 up to GTIN-14. */
const BARCODE_PATTERN = /^\d{8,14}$/;

export function looksLikeBarcode(text: string): boolean {
  return BARCODE_PATTERN.test(text);
}

/** Query params of GET /products used by the product picker. */
export interface ProductSearchParamsDto {
  search: string;
  page: number;
  size: number;
}

// ── Movements ────────────────────────────────────────────────

export type StockMovementType = 'IN' | 'SALE' | 'ADJUSTMENT';

/** `stock_movements.reason` (PRD 14.3); only set on ADJUSTMENT movements. */
export type AdjustmentReason = 'RUSAK' | 'KEDALUWARSA' | 'HILANG' | 'SALAH_HITUNG' | 'LAINNYA';

/** Movement object of the API (docs/api-spec.md section 5). */
export interface StockMovementDto {
  id: number;
  product_id: number;
  product_name: string;
  type: StockMovementType;
  qty: number;
  stock_before: number;
  stock_after: number;
  /** Only present on ADJUSTMENT movements. */
  reason?: AdjustmentReason | null;
  note: string | null;
  created_at: string;
}

export interface StockMovement {
  id: number;
  productId: number;
  productName: string;
  type: StockMovementType;
  qty: number;
  stockBefore: number;
  stockAfter: number;
  reason: AdjustmentReason | null;
  note: string | null;
  createdAt: string;
}

export function toStockMovement(dto: StockMovementDto): StockMovement {
  return {
    id: dto.id,
    productId: dto.product_id,
    productName: dto.product_name,
    type: dto.type,
    qty: dto.qty,
    stockBefore: dto.stock_before,
    stockAfter: dto.stock_after,
    reason: dto.reason ?? null,
    note: dto.note,
    createdAt: dto.created_at,
  };
}

/** Query params of GET /stock/movements. Sorted by `created_at` descending on the server. */
export interface StockMovementParamsDto {
  type?: StockMovementType;
  product_id?: number;
  start_date?: string;
  end_date?: string;
  page: number;
  size: number;
}

// ── Stock in ─────────────────────────────────────────────────

/** Body of POST /stock/in. */
export interface StockInRequestDto {
  note?: string;
  items: { product_id: number; qty: number }[];
}

/** Response of POST /stock/in. */
export interface StockInResponseDto {
  movements: StockMovementDto[];
}

/** One row of the draft list before it is saved (PRD 9.7 "daftar sementara"). */
export interface StockInLine {
  product: StockProduct;
  qty: number;
}

/** Stock after saving, as shown in the "Stok sebelum → sesudah" column. Display only. */
export function stockAfter(line: StockInLine): number {
  return line.product.stock + line.qty;
}

/** Adds a line; the same product twice is merged into one line. Returns a new array. */
export function addLine(
  lines: readonly StockInLine[],
  product: StockProduct,
  qty: number,
): StockInLine[] {
  const existing = lines.find((line) => line.product.id === product.id);
  if (!existing) {
    return [...lines, { product, qty }];
  }
  return lines.map((line) =>
    line === existing ? { product, qty: existing.qty + qty } : line,
  );
}

export function removeLine(lines: readonly StockInLine[], productId: number): StockInLine[] {
  return lines.filter((line) => line.product.id !== productId);
}

export function totalUnits(lines: readonly StockInLine[]): number {
  return lines.reduce((sum, line) => sum + line.qty, 0);
}

/** A whole number of at least 1 (api-spec: `qty` must be > 0). */
export function isValidQty(qty: number): boolean {
  return Number.isInteger(qty) && qty >= 1;
}

export function toStockInRequest(note: string, lines: readonly StockInLine[]): StockInRequestDto {
  const trimmed = note.trim();
  return {
    ...(trimmed ? { note: trimmed } : {}),
    items: lines.map((line) => ({ product_id: line.product.id, qty: line.qty })),
  };
}
