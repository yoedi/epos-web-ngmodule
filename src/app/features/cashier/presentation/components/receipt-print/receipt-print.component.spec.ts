import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StoreSettings } from '../../../../../core/store/store-settings.models';
import { RupiahPipe } from '../../../../../shared/pipes/rupiah.pipe';
import { Sale } from '../../../domain/models/sale';
import { ReceiptPrintComponent } from './receipt-print.component';

const SALE: Sale = {
  id: 1,
  invoiceNo: 'INV-20260916-0001',
  cashierName: 'Rina Lestari',
  items: [{ productId: 5, productName: 'Mi Instan Goreng', unit: 'pcs', price: 3500, qty: 2, subtotal: 7000 }],
  subtotal: 7000,
  discount: 0,
  total: 7000,
  paymentMethod: 'CASH',
  paid: 10000,
  change: 3000,
  createdAt: new Date('2026-09-16T14:32:10+07:00'),
};

describe('ReceiptPrintComponent store header', () => {
  let fixture: ComponentFixture<ReceiptPrintComponent>;

  function render(store: StoreSettings | null): HTMLElement {
    fixture = TestBed.createComponent(ReceiptPrintComponent);
    fixture.componentInstance.sale = SALE;
    fixture.componentInstance.store = store;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ declarations: [ReceiptPrintComponent, RupiahPipe] });
  });

  afterEach(() => fixture.destroy());

  it('shows name, address and phone when they are set', () => {
    const header = render({
      storeName: 'Toko Berkah',
      address: 'Jl. Kaliurang Km 5',
      phone: '0274-123456',
      receiptFooter: 'Terima kasih',
    }).querySelector('header');

    expect(header?.textContent).toContain('Toko Berkah');
    expect(header?.textContent).toContain('Jl. Kaliurang Km 5');
    expect(header?.textContent).toContain('Telp. 0274-123456');
  });

  it('leaves out the address and phone lines when they are null', () => {
    const header = render({
      storeName: 'Toko Berkah',
      address: null,
      phone: null,
      receiptFooter: null,
    }).querySelector('header');

    expect(header?.querySelectorAll('p').length).toBe(1);
    expect(header?.textContent).not.toContain('Telp.');
  });

  it('falls back to the default footer when receiptFooter is null', () => {
    const el = render({ storeName: 'Toko Berkah', address: null, phone: null, receiptFooter: null });

    expect(el.textContent).toContain('Terima kasih, selamat belanja kembali');
  });
});
