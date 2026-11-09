/** Response of GET /store-settings (docs/api-spec.md section 7). */
export interface StoreSettingsDto {
  store_name: string;
  address: string;
  phone: string;
  receipt_footer: string;
}

/** Application model of the store identity shown in the header and on receipts. */
export interface StoreSettings {
  storeName: string;
  address: string;
  phone: string;
  receiptFooter: string;
}

export function toStoreSettings(dto: StoreSettingsDto): StoreSettings {
  return {
    storeName: dto.store_name,
    address: dto.address,
    phone: dto.phone,
    receiptFooter: dto.receipt_footer,
  };
}
