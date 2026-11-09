import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';

import { Role, User } from '../../../../core/auth/auth.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { AppError } from '../../../../core/http/api-error.model';
import { Page } from '../../../../core/http/page.model';
import { CategoryService } from '../../../category/services/category.service';
import { Product, ProductQuery } from '../../models/product.model';
import { ProductModule } from '../../product.module';
import { ProductService } from '../../services/product.service';
import { ProductListComponent } from './product-list.component';

describe('ProductListComponent', () => {
  let fixture: ComponentFixture<ProductListComponent>;
  let component: ProductListComponent;
  let service: jasmine.SpyObj<ProductService>;
  let messages: jasmine.SpyObj<MessageService>;
  let user$: BehaviorSubject<User | null>;

  const beras: Product = {
    id: 1,
    sku: 'BRS-005',
    barcode: null,
    name: 'Beras Premium 5 kg',
    category: { id: 1, name: 'Sembako' },
    unit: 'KG',
    costPrice: 69500,
    sellPrice: 78000,
    stock: 24,
    minStock: 10,
    stockStatus: 'SAFE',
    isActive: true,
  };
  const sabun: Product = { ...beras, id: 7, name: 'Sabun Mandi Batang', isActive: false };

  const pageOf = (content: Product[], totalElements = content.length): Page<Product> => ({
    content,
    page: 0,
    size: 20,
    totalElements,
    totalPages: Math.ceil(totalElements / 20),
    last: true,
  });

  const lastQuery = (): ProductQuery => service.list.calls.mostRecent().args[0];
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const el = (selector: string) =>
    fixture.debugElement.query(By.css(selector))?.nativeElement as HTMLElement | undefined;

  function render(role: Role = 'OWNER'): void {
    user$.next({ id: 1, name: 'x', username: 'x', role });
    fixture = TestBed.createComponent(ProductListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    service = jasmine.createSpyObj<ProductService>('ProductService', ['list', 'setActive']);
    service.list.and.returnValue(of(pageOf([beras, sabun])));
    messages = jasmine.createSpyObj<MessageService>('MessageService', ['add']);
    user$ = new BehaviorSubject<User | null>(null);

    await TestBed.configureTestingModule({
      imports: [ProductModule, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: ProductService, useValue: service },
        { provide: CategoryService, useValue: { list: () => of([]) } },
        { provide: AuthService, useValue: { currentUser$: user$ } },
        { provide: MessageService, useValue: messages },
      ],
    }).compileComponents();
  });

  describe('states', () => {
    it('shows a skeleton while loading', () => {
      service.list.and.returnValue(new Subject<Page<Product>>());
      render();

      expect(el('app-product-table p-skeleton')).toBeDefined();
      expect(text()).not.toContain('Beras Premium 5 kg');
    });

    it('shows the products, count and page summary', () => {
      render();

      expect(el('app-product-table')?.textContent).toContain('Beras Premium 5 kg');
      expect(el('.page__count')?.textContent).toContain('2 produk');
      expect(el('app-pagination')?.textContent).toContain('Menampilkan 1-2 dari 2 produk');
    });

    it('invites the owner to add the first product when there are none', () => {
      service.list.and.returnValue(of(pageOf([])));
      render();

      expect(el('app-empty-state')?.textContent).toContain(
        'Belum ada produk. Tambahkan produk pertama Anda',
      );
      expect(el('app-empty-state button')?.textContent).toContain('Tambah Produk');
    });

    it('does not invite a cashier to add products', () => {
      service.list.and.returnValue(of(pageOf([])));
      render('CASHIER');

      expect(el('app-empty-state')?.textContent).toContain('Belum ada produk.');
      expect(el('app-empty-state button')).toBeUndefined();
    });

    it('offers to clear the filter when a search finds nothing', fakeAsync(() => {
      render();
      service.list.and.returnValue(of(pageOf([])));

      component.filters.controls.search.setValue('zzz');
      tick(300);
      fixture.detectChanges();

      expect(el('app-empty-state')?.textContent).toContain('Produk tidak ditemukan');

      service.list.and.returnValue(of(pageOf([beras])));
      (el('app-empty-state button') as HTMLButtonElement).click();
      tick(300);
      fixture.detectChanges();

      expect(lastQuery().search).toBe('');
      expect(component.filters.getRawValue().search).toBe('');
      expect(text()).toContain('Beras Premium 5 kg');
    }));

    it('shows the error with a retry button that loads again', () => {
      const error: AppError = { code: 'INTERNAL_ERROR', message: 'Server bermasalah', status: 500 };
      service.list.and.returnValue(throwError(() => error));
      render();

      expect(el('app-empty-state')?.textContent).toContain('Gagal memuat produk');
      expect(el('app-empty-state')?.textContent).toContain('Server bermasalah');

      service.list.and.returnValue(of(pageOf([beras])));
      (el('app-empty-state button') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(text()).toContain('Beras Premium 5 kg');
    });
  });

  describe('roles', () => {
    it('gives the owner the cost column, actions and add button', () => {
      render('OWNER');

      expect(el('app-product-table')?.textContent).toContain('Harga Modal');
      expect(el('app-product-table')?.textContent).toContain('Aksi');
      expect(el('app-product-table app-product-actions')).toBeDefined();
      expect(el('.toolbar__add')).toBeDefined();
    });

    it('hides them from a cashier instead of disabling them', () => {
      service.list.and.returnValue(of(pageOf([{ ...beras, costPrice: null }])));
      render('CASHIER');

      expect(el('app-product-table')?.textContent).not.toContain('Harga Modal');
      expect(el('app-product-table')?.textContent).not.toContain('Aksi');
      expect(el('app-product-actions')).toBeUndefined();
      expect(el('.toolbar__add')).toBeUndefined();
      expect(el('app-product-card-list')?.textContent).not.toContain('modal');
    });
  });

  describe('querying', () => {
    it('debounces the search and goes back to the first page', fakeAsync(() => {
      render();
      component.changePage(1);
      const callsBefore = service.list.calls.count();

      component.filters.controls.search.setValue('ber');
      tick(100);
      component.filters.controls.search.setValue('beras');
      tick(299);
      expect(service.list.calls.count()).toBe(callsBefore);

      tick(1);
      expect(service.list.calls.count()).toBe(callsBefore + 1);
      expect(lastQuery().search).toBe('beras');
      expect(lastQuery().page).toBe(0);
    }));

    it('applies the category and status filters', () => {
      render();

      component.filters.controls.categoryId.setValue(1);
      expect(lastQuery().categoryId).toBe(1);

      component.filters.controls.status.setValue('LOW_STOCK');
      expect(lastQuery().status).toBe('LOW_STOCK');
    });

    it('cycles a column through ascending, descending and unsorted', () => {
      render();

      component.changeSort('name');
      expect(lastQuery().sort).toEqual({ field: 'name', direction: 'asc' });
      component.changeSort('name');
      expect(lastQuery().sort).toEqual({ field: 'name', direction: 'desc' });
      component.changeSort('name');
      expect(lastQuery().sort).toBeNull();
    });

    it('moves back when the current page has become empty', () => {
      render();
      service.list.and.returnValues(
        of({ ...pageOf([], 21), page: 2, totalPages: 2 }),
        of({ ...pageOf([beras], 21), page: 1, totalPages: 2 }),
      );

      component.changePage(2);

      expect(lastQuery().page).toBe(1);
    });
  });

  describe('status', () => {
    it('asks before deactivating and refreshes afterwards', () => {
      render();
      service.setActive.and.returnValue(of({ ...beras, isActive: false }));
      const callsBefore = service.list.calls.count();

      component.toggleStatus(beras);
      expect(service.setActive).not.toHaveBeenCalled();
      expect(component.toDeactivate).toBe(beras);

      component.confirmDeactivate();

      expect(service.setActive).toHaveBeenCalledOnceWith(1, false);
      expect(component.toDeactivate).toBeNull();
      expect(service.list.calls.count()).toBe(callsBefore + 1);
      expect(messages.add).toHaveBeenCalled();
    });

    it('reactivates without asking', () => {
      render();
      service.setActive.and.returnValue(of({ ...sabun, isActive: true }));

      component.toggleStatus(sabun);

      expect(service.setActive).toHaveBeenCalledOnceWith(7, true);
    });

    it('keeps the rows on screen during a refresh', () => {
      render();
      service.setActive.and.returnValue(of({ ...sabun, isActive: true }));
      service.list.and.returnValue(new Subject<Page<Product>>());

      component.toggleStatus(sabun);
      fixture.detectChanges();

      expect(el('app-product-table')?.textContent).toContain('Beras Premium 5 kg');
    });

    it('closes the dialog and shows no success message when the change fails', () => {
      render();
      const error: AppError = { code: 'NOT_FOUND', message: 'Produk tidak ditemukan', status: 404 };
      service.setActive.and.returnValue(throwError(() => error));

      component.toggleStatus(beras);
      component.confirmDeactivate();

      expect(component.toDeactivate).toBeNull();
      expect(component.statusBusy).toBeFalse();
      expect(messages.add).not.toHaveBeenCalled();
    });
  });

  describe('form', () => {
    it('opens empty for a new product and filled for an edit', () => {
      render();

      component.openCreate();
      expect(component.formOpen).toBeTrue();
      expect(component.editing).toBeNull();

      component.closeForm();
      component.openEdit(beras);
      expect(component.editing).toBe(beras);
    });

    it('closes, confirms and refreshes after saving', () => {
      render();
      component.openCreate();
      const callsBefore = service.list.calls.count();

      component.handleSaved({ product: beras, created: true });

      expect(component.formOpen).toBeFalse();
      expect(messages.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ detail: 'Beras Premium 5 kg berhasil ditambahkan' }),
      );
      expect(service.list.calls.count()).toBe(callsBefore + 1);
    });
  });
});
