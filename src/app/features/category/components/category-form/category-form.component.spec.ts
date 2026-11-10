import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Subject, of, throwError } from 'rxjs';

import { AppError } from '../../../../core/http/api-error.model';
import { CategoryModule } from '../../category.module';
import { Category } from '../../models/category.model';
import { CategoryService } from '../../services/category.service';
import { CategoryFormComponent, CategorySaved } from './category-form.component';

describe('CategoryFormComponent', () => {
  let fixture: ComponentFixture<CategoryFormComponent>;
  let component: CategoryFormComponent;
  let service: jasmine.SpyObj<CategoryService>;

  const minuman: Category = { id: 2, name: 'Minuman', productCount: 2 };
  const errorText = () =>
    (fixture.nativeElement as HTMLElement).querySelector('#category-name-error')?.textContent ?? '';

  function render(category: Category | null = null): void {
    fixture = TestBed.createComponent(CategoryFormComponent);
    component = fixture.componentInstance;
    component.category = category;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    service = jasmine.createSpyObj<CategoryService>('CategoryService', ['create', 'update']);

    await TestBed.configureTestingModule({
      imports: [CategoryModule, NoopAnimationsModule],
      providers: [{ provide: CategoryService, useValue: service }],
    }).compileComponents();
  });

  it('requires a name that is not just spaces', () => {
    render();
    component.name.setValue('   ');

    component.submit();
    fixture.detectChanges();

    expect(service.create).not.toHaveBeenCalled();
    expect(errorText()).toContain('Nama kategori wajib diisi');
  });

  it('creates with the trimmed name and reports it', () => {
    const created: Category = { id: 5, name: 'Bumbu Dapur', productCount: 0 };
    service.create.and.returnValue(of(created));
    render();
    let saved: CategorySaved | undefined;
    component.saved.subscribe((event) => (saved = event));

    component.name.setValue('  Bumbu Dapur ');
    component.submit();

    expect(service.create).toHaveBeenCalledOnceWith('Bumbu Dapur');
    expect(saved).toEqual({ category: created, created: true });
  });

  it('edits the given category', () => {
    service.update.and.returnValue(of({ ...minuman, name: 'Minuman Dingin' }));
    render(minuman);

    expect(component.name.value).toBe('Minuman');

    component.name.setValue('Minuman Dingin');
    component.submit();

    expect(service.update).toHaveBeenCalledOnceWith(2, 'Minuman Dingin');
  });

  it('shows a duplicate name under the field', () => {
    const error: AppError = {
      code: 'DUPLICATE_CATEGORY',
      message: 'Nama kategori sudah ada',
      status: 409,
    };
    service.create.and.returnValue(throwError(() => error));
    render();

    component.name.setValue('Sembako');
    component.submit();
    fixture.detectChanges();

    expect(errorText()).toContain('Nama kategori sudah ada');
  });

  it('ignores a second submit while saving', () => {
    service.create.and.returnValue(new Subject<Category>());
    render();

    component.name.setValue('Bumbu Dapur');
    component.submit();
    component.submit();

    expect(service.create).toHaveBeenCalledTimes(1);
  });
});
