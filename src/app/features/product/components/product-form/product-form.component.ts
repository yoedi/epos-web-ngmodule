import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { finalize, map, startWith } from 'rxjs';

import { UNKNOWN_ERROR_MESSAGE, isAppError } from '../../../../core/http/api-error.model';
import { Category } from '../../../category/models/category.model';
import {
  Margin,
  Product,
  ProductFormValue,
  ProductUnit,
  UNIT_OPTIONS,
  marginOf,
} from '../../models/product.model';
import { ProductService } from '../../services/product.service';

export interface ProductSaved {
  product: Product;
  created: boolean;
}

const WHOLE_NUMBER = Validators.pattern(/^\d+$/);

/** Like Validators.required, but spaces alone do not count as filled in. */
function notBlank(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim() ? null : { required: true };
}

const REQUIRED_MESSAGE: Record<string, string> = {
  name: 'Nama barang wajib diisi',
  sku: 'SKU wajib diisi',
  categoryId: 'Kategori wajib dipilih',
  unit: 'Satuan wajib dipilih',
  costPrice: 'Harga modal wajib diisi',
  sellPrice: 'Harga jual wajib diisi',
  minStock: 'Stok minimum wajib diisi',
};
const WHOLE_NUMBER_MESSAGE = 'Isi dengan bilangan bulat, minimal 0';

/** API field name -> form control, for VALIDATION_ERROR and duplicate errors. */
const CONTROL_BY_API_FIELD: Record<string, string> = {
  name: 'name',
  sku: 'sku',
  barcode: 'barcode',
  category_id: 'categoryId',
  unit: 'unit',
  cost_price: 'costPrice',
  sell_price: 'sellPrice',
  initial_stock: 'initialStock',
  min_stock: 'minStock',
};

/** Add/edit product form, shown inside a drawer (PRD 9.5). */
@Component({
  selector: 'app-product-form',
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.css',
  standalone: false,
})
export class ProductFormComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly fb = inject(FormBuilder).nonNullable;

  /** Null means adding a new product. */
  @Input() product: Product | null = null;
  @Input() categories: readonly Category[] = [];

  @Output() saved = new EventEmitter<ProductSaved>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() submittingChange = new EventEmitter<boolean>();

  @ViewChild('nameInput') private nameInput?: ElementRef<HTMLInputElement>;

  readonly unitOptions = UNIT_OPTIONS;
  readonly form = this.fb.group({
    name: ['', notBlank],
    sku: ['', notBlank],
    barcode: [''],
    categoryId: this.fb.control<number | null>(null, Validators.required),
    unit: this.fb.control<ProductUnit | null>(null, Validators.required),
    costPrice: this.fb.control<number | null>(null, Validators.required),
    sellPrice: this.fb.control<number | null>(null, Validators.required),
    initialStock: this.fb.control<number | null>(0, WHOLE_NUMBER),
    minStock: this.fb.control<number | null>(null, [Validators.required, WHOLE_NUMBER]),
    isActive: [true],
  });

  readonly margin$ = this.form.valueChanges.pipe(
    startWith(null),
    map((): Margin | null => {
      const { costPrice, sellPrice } = this.form.getRawValue();
      return costPrice === null || sellPrice === null ? null : marginOf(costPrice, sellPrice);
    }),
  );

  submitting = false;
  formError: string | null = null;

  get isEdit(): boolean {
    return this.product !== null;
  }

  ngOnInit(): void {
    if (this.product) {
      this.form.patchValue({
        name: this.product.name,
        sku: this.product.sku,
        barcode: this.product.barcode ?? '',
        categoryId: this.product.category.id,
        unit: this.product.unit,
        costPrice: this.product.costPrice,
        sellPrice: this.product.sellPrice,
        minStock: this.product.minStock,
        isActive: this.product.isActive,
      });
    }
  }

  /** Called by the drawer once it is on screen; before that the input cannot take focus. */
  focusFirstField(): void {
    this.nameInput?.nativeElement.focus();
  }

  fieldError(name: keyof typeof this.form.controls): string | null {
    const control: AbstractControl = this.form.controls[name];
    if (!control.touched || !control.errors) {
      return null;
    }
    const serverMessage: unknown = control.errors['server'];
    if (typeof serverMessage === 'string') {
      return serverMessage;
    }
    return control.errors['pattern'] ? WHOLE_NUMBER_MESSAGE : REQUIRED_MESSAGE[name];
  }

  submit(): void {
    if (this.submitting) {
      return;
    }
    this.formError = null;
    if (this.form.invalid) {
      this.revealErrors();
      return;
    }

    const value = this.formValue();
    const product = this.product;
    const request$ = product
      ? this.productService.update(product.id, value)
      : this.productService.create(value);

    this.setSubmitting(true);
    request$
      .pipe(
        finalize(() => this.setSubmitting(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => this.saved.emit({ product: result, created: product === null }),
        error: (err: unknown) => this.showServerError(err),
      });
  }

  private formValue(): ProductFormValue {
    const raw = this.form.getRawValue();
    return {
      name: raw.name.trim(),
      sku: raw.sku.trim(),
      barcode: raw.barcode.trim() || null,
      categoryId: raw.categoryId as number,
      unit: raw.unit as ProductUnit,
      costPrice: raw.costPrice as number,
      sellPrice: raw.sellPrice as number,
      initialStock: raw.initialStock ?? 0,
      minStock: raw.minStock as number,
      isActive: raw.isActive,
    };
  }

  private setSubmitting(submitting: boolean): void {
    this.submitting = submitting;
    this.submittingChange.emit(submitting);
  }

  private showServerError(err: unknown): void {
    if (!isAppError(err)) {
      this.formError = UNKNOWN_ERROR_MESSAGE;
      return;
    }
    if (err.code === 'DUPLICATE_SKU') {
      this.setServerError('sku', err.message);
    } else if (err.code === 'DUPLICATE_BARCODE') {
      this.setServerError('barcode', err.message);
    } else if (err.code === 'VALIDATION_ERROR') {
      for (const { field, message } of err.fieldErrors ?? []) {
        if (!this.setServerError(CONTROL_BY_API_FIELD[field], message)) {
          this.formError = message;
        }
      }
    }
    // Any other code was already shown as a toast by ErrorInterceptor.
    this.revealErrors();
  }

  private setServerError(controlName: string | undefined, message: string): boolean {
    const control = controlName ? this.form.get(controlName) : null;
    control?.setErrors({ server: message });
    return control !== null;
  }

  /** The first bad field may be scrolled out of view in the drawer, so move focus to it. */
  private revealErrors(): void {
    this.form.markAllAsTouched();
    Object.values(this.form.controls).forEach((control) => control.markAsDirty());
    this.changeDetector.detectChanges();
    this.host.nativeElement
      .querySelector<HTMLElement>(
        'input.ng-invalid, app-money-input.ng-invalid input, p-select.ng-invalid [role="combobox"]',
      )
      ?.focus();
  }
}
