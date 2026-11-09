import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Subject, of, throwError } from 'rxjs';

import { AppError } from '../../../../core/http/api-error.model';
import { SharedModule } from '../../../../shared/shared.module';
import { Product } from '../../models/product.model';
import { ProductService } from '../../services/product.service';
import { ProductFormComponent, ProductSaved } from './product-form.component';

describe('ProductFormComponent', () => {
  let fixture: ComponentFixture<ProductFormComponent>;
  let component: ProductFormComponent;
  let service: jasmine.SpyObj<ProductService>;

  const product: Product = {
    id: 2,
    sku: 'MYK-002',
    barcode: null,
    name: 'Minyak Goreng 2 L',
    category: { id: 1, name: 'Sembako' },
    unit: 'LITER',
    costPrice: 32000,
    sellPrice: 36500,
    stock: 3,
    minStock: 12,
    stockStatus: 'LOW_STOCK',
    isActive: true,
  };

  const valid = {
    name: '  Kecap Manis 275 ml ',
    sku: 'KCP-001',
    barcode: '',
    categoryId: 1,
    unit: 'PCS' as const,
    costPrice: 9500,
    sellPrice: 11500,
    initialStock: 24,
    minStock: 10,
    isActive: true,
  };

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const el = (selector: string) =>
    fixture.debugElement.query(By.css(selector))?.nativeElement as HTMLElement | undefined;

  function submit(): void {
    fixture.debugElement.query(By.css('form')).triggerEventHandler('ngSubmit', null);
    fixture.detectChanges();
  }

  function create(existing: Product | null = null): void {
    fixture = TestBed.createComponent(ProductFormComponent);
    component = fixture.componentInstance;
    component.product = existing;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    service = jasmine.createSpyObj<ProductService>('ProductService', ['create', 'update']);
    await TestBed.configureTestingModule({
      declarations: [ProductFormComponent],
      imports: [SharedModule, NoopAnimationsModule],
      providers: [{ provide: ProductService, useValue: service }],
    }).compileComponents();
  });

  it('shows a message per field and does not save when empty', () => {
    create();
    component.form.controls.minStock.setValue(null);

    submit();

    expect(text()).toContain('Nama barang wajib diisi');
    expect(text()).toContain('SKU wajib diisi');
    expect(text()).toContain('Kategori wajib dipilih');
    expect(text()).toContain('Harga jual wajib diisi');
    expect(text()).toContain('Stok minimum wajib diisi');
    expect(service.create).not.toHaveBeenCalled();
  });

  it('treats spaces alone as an empty name', () => {
    create();
    component.form.patchValue({ ...valid, name: '   ' });

    submit();

    expect(text()).toContain('Nama barang wajib diisi');
    expect(service.create).not.toHaveBeenCalled();
  });

  it('rejects a fractional stock', () => {
    create();
    component.form.patchValue({ ...valid, minStock: 1.5 });

    submit();

    expect(text()).toContain('Isi dengan bilangan bulat, minimal 0');
    expect(service.create).not.toHaveBeenCalled();
  });

  it('shows the margin automatically', () => {
    create();
    component.form.patchValue({ costPrice: 11000, sellPrice: 12500 });
    fixture.detectChanges();

    expect(el('.margin__value')?.textContent?.replace(/\s+/g, ' ')).toContain(
      'Margin Rp 1.500 / 12%',
    );
    expect(el('.margin__warning')).toBeUndefined();
  });

  it('warns but still saves when selling below cost', () => {
    create();
    service.create.and.returnValue(of(product));
    component.form.patchValue({ ...valid, costPrice: 1000, sellPrice: 800 });
    fixture.detectChanges();

    expect(el('.margin__warning')?.textContent).toContain('Harga jual di bawah harga modal');

    submit();

    expect(service.create).toHaveBeenCalled();
  });

  it('creates with trimmed values and an empty barcode as null', () => {
    create();
    service.create.and.returnValue(of(product));
    const saved: ProductSaved[] = [];
    component.saved.subscribe((event) => saved.push(event));
    component.form.patchValue(valid);

    submit();

    const value = service.create.calls.mostRecent().args[0];
    expect(value.name).toBe('Kecap Manis 275 ml');
    expect(value.barcode).toBeNull();
    expect(saved).toEqual([{ product, created: true }]);
  });

  it('prevents a double submit while saving', () => {
    create();
    service.create.and.returnValue(new Subject<Product>());
    component.form.patchValue(valid);

    submit();
    submit();

    expect(service.create).toHaveBeenCalledTimes(1);
    expect((el('button[type="submit"]') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('fills in the product when editing and hides Stok Awal', () => {
    create(product);

    expect(component.form.getRawValue().sku).toBe('MYK-002');
    expect(component.form.getRawValue().sellPrice).toBe(36500);
    expect(text()).not.toContain('Stok Awal');
  });

  it('updates the product being edited', () => {
    create(product);
    service.update.and.returnValue(of(product));

    submit();

    expect(service.update.calls.mostRecent().args[0]).toBe(2);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('shows a duplicate SKU on the SKU field and keeps the form open', () => {
    create();
    const error: AppError = {
      code: 'DUPLICATE_SKU',
      message: 'SKU sudah dipakai produk lain',
      status: 409,
    };
    service.create.and.returnValue(throwError(() => error));
    const saved = jasmine.createSpy('saved');
    component.saved.subscribe(saved);
    component.form.patchValue(valid);

    submit();

    expect(el('#product-sku-error')?.textContent).toContain('SKU sudah dipakai produk lain');
    expect(component.form.getRawValue().sku).toBe('KCP-001');
    expect(component.submitting).toBeFalse();
    expect(saved).not.toHaveBeenCalled();
  });

  it('maps VALIDATION_ERROR fields from the API onto the form', () => {
    create();
    const error: AppError = {
      code: 'VALIDATION_ERROR',
      message: 'Validasi gagal',
      status: 400,
      fieldErrors: [{ field: 'sell_price', message: 'Harga jual tidak valid' }],
    };
    service.create.and.returnValue(throwError(() => error));
    component.form.patchValue(valid);

    submit();

    expect(el('#product-sell-error')?.textContent).toContain('Harga jual tidak valid');
  });
});
