/**
 * Response of GET /store-settings (docs/api-spec.md section 7).
 * `address`, `phone` and `receipt_footer` are optional and come back as `null` when not set.
 */
export interface StoreSettingsDto {
  store_name: string;
  address: string | null;
  phone: string | null;
  receipt_footer: string | null;
}

/** Application model of the store identity shown in the header and on receipts. */
export interface StoreSettings {
  storeName: string;
  address: string | null;
  phone: string | null;
  receiptFooter: string | null;
}

export function toStoreSettings(dto: StoreSettingsDto): StoreSettings {
  return {
    storeName: dto.store_name,
    address: dto.address,
    phone: dto.phone,
    receiptFooter: dto.receipt_footer,
  };
}
