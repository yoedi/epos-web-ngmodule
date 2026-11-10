import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';

import { Role, User } from '../../../../core/auth/auth.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { AppError } from '../../../../core/http/api-error.model';
import { CategoryModule } from '../../category.module';
import { Category } from '../../models/category.model';
import { CategoryService } from '../../services/category.service';
import { CategoryListComponent } from './category-list.component';

describe('CategoryListComponent', () => {
  let fixture: ComponentFixture<CategoryListComponent>;
  let component: CategoryListComponent;
  let service: jasmine.SpyObj<CategoryService>;
  let messages: jasmine.SpyObj<MessageService>;
  let user$: BehaviorSubject<User | null>;

  const sembako: Category = { id: 1, name: 'Sembako', productCount: 4 };
  const bumbu: Category = { id: 5, name: 'Bumbu Dapur', productCount: 0 };

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const el = (selector: string) =>
    fixture.debugElement.query(By.css(selector))?.nativeElement as HTMLElement | undefined;

  function render(role: Role = 'OWNER'): void {
    user$.next({ id: 1, name: 'x', username: 'x', role });
    fixture = TestBed.createComponent(CategoryListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    service = jasmine.createSpyObj<CategoryService>('CategoryService', ['list', 'remove']);
    service.list.and.returnValue(of([sembako, bumbu]));
    messages = jasmine.createSpyObj<MessageService>('MessageService', ['add']);
    user$ = new BehaviorSubject<User | null>(null);

    await TestBed.configureTestingModule({
      imports: [CategoryModule, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: CategoryService, useValue: service },
        { provide: AuthService, useValue: { currentUser$: user$ } },
        { provide: MessageService, useValue: messages },
      ],
    }).compileComponents();
  });

  describe('states', () => {
    it('shows a skeleton while loading', () => {
      service.list.and.returnValue(new Subject<Category[]>());
      render();

      expect(el('app-category-table p-skeleton')).toBeDefined();
      expect(text()).not.toContain('Sembako');
    });

    it('shows the categories with their product counts', () => {
      render();

      const table = el('app-category-table')?.textContent ?? '';
      expect(table).toContain('Nama Kategori');
      expect(table).toContain('Jumlah Produk');
      expect(table).toContain('Sembako');
      expect(table).toContain('4');
      expect(el('.page__count')?.textContent).toContain('2 kategori');
    });

    it('invites the owner to add the first category when there are none', () => {
      service.list.and.returnValue(of([]));
      render();

      expect(el('app-empty-state')?.textContent).toContain(
        'Belum ada kategori. Tambahkan kategori pertama Anda',
      );
      expect(el('app-empty-state button')?.textContent).toContain('Tambah Kategori');
    });

    it('shows the error with a retry that reloads the list', () => {
      const error: AppError = { code: 'INTERNAL_ERROR', message: 'Server sibuk', status: 500 };
      service.list.and.returnValue(throwError(() => error));
      render();

      expect(el('app-empty-state')?.textContent).toContain('Gagal memuat kategori');
      expect(el('app-empty-state')?.textContent).toContain('Server sibuk');

      service.list.and.returnValue(of([sembako]));
      el('app-empty-state button')?.click();
      fixture.detectChanges();

      expect(el('app-category-table')?.textContent).toContain('Sembako');
    });
  });

  describe('roles', () => {
    it('hides the add button and the Aksi column from a cashier', () => {
      render('CASHIER');

      expect(text()).not.toContain('Tambah Kategori');
      expect(el('app-category-table')?.textContent).not.toContain('Aksi');
      expect(el('.action')).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('explains instead of deleting a category that still has products', () => {
      render();

      component.askDelete(sembako);
      fixture.detectChanges();

      expect(component.blockedMessage).toBe('Kategori Sembako masih memiliki 4 produk');
      expect(component.toDelete).toBeNull();
      expect(service.remove).not.toHaveBeenCalled();
    });

    it('asks for confirmation, then deletes and refreshes', () => {
      service.remove.and.returnValue(of(undefined));
      render();

      component.askDelete(bumbu);
      expect(component.toDelete).toBe(bumbu);

      component.confirmDelete();

      expect(service.remove).toHaveBeenCalledOnceWith(5);
      expect(component.toDelete).toBeNull();
      expect(messages.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ detail: 'Bumbu Dapur berhasil dihapus' }),
      );
      expect(service.list).toHaveBeenCalledTimes(2);
    });

    it('ignores a second confirm while the delete is in flight', () => {
      service.remove.and.returnValue(new Subject<void>());
      render();

      component.askDelete(bumbu);
      component.confirmDelete();
      component.confirmDelete();

      expect(service.remove).toHaveBeenCalledTimes(1);
    });

    it('shows the server explanation when the category gained products meanwhile', () => {
      const error: AppError = {
        code: 'CATEGORY_IN_USE',
        message: 'Kategori Bumbu Dapur masih memiliki 1 produk',
        status: 409,
      };
      service.remove.and.returnValue(throwError(() => error));
      render();

      component.askDelete(bumbu);
      component.confirmDelete();

      expect(component.toDelete).toBeNull();
      expect(component.blockedMessage).toBe('Kategori Bumbu Dapur masih memiliki 1 produk');
    });
  });
});
