import {
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
import { AbstractControl, FormControl, ValidationErrors } from '@angular/forms';
import { finalize } from 'rxjs';

import { UNKNOWN_ERROR_MESSAGE, isAppError } from '../../../../core/http/api-error.model';
import { Category } from '../../models/category.model';
import { CategoryService } from '../../services/category.service';

export interface CategorySaved {
  category: Category;
  created: boolean;
}

const REQUIRED_MESSAGE = 'Nama kategori wajib diisi';

/** Like Validators.required, but spaces alone do not count as filled in. */
function notBlank(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim() ? null : { required: true };
}

/** Add/edit category form, shown inside a small modal (PRD 9.6). */
@Component({
  selector: 'app-category-form',
  templateUrl: './category-form.component.html',
  styleUrl: './category-form.component.css',
  standalone: false,
})
export class CategoryFormComponent implements OnInit {
  private readonly categoryService = inject(CategoryService);
  private readonly destroyRef = inject(DestroyRef);

  /** Null means adding a new category. */
  @Input() category: Category | null = null;

  @Output() saved = new EventEmitter<CategorySaved>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() submittingChange = new EventEmitter<boolean>();

  @ViewChild('nameInput') private nameInput?: ElementRef<HTMLInputElement>;

  readonly name = new FormControl('', { nonNullable: true, validators: notBlank });

  submitting = false;
  formError: string | null = null;

  ngOnInit(): void {
    if (this.category) {
      this.name.setValue(this.category.name);
    }
  }

  /** Called by the dialog once it is on screen; before that the input cannot take focus. */
  focusFirstField(): void {
    this.nameInput?.nativeElement.select();
  }

  get nameError(): string | null {
    const errors = this.name.errors;
    if (!this.name.touched || !errors) {
      return null;
    }
    const serverMessage: unknown = errors['server'];
    return typeof serverMessage === 'string' ? serverMessage : REQUIRED_MESSAGE;
  }

  submit(): void {
    if (this.submitting) {
      return;
    }
    this.formError = null;
    if (this.name.invalid) {
      this.revealError();
      return;
    }

    const name = this.name.value.trim();
    const category = this.category;
    const request$ = category
      ? this.categoryService.update(category.id, name)
      : this.categoryService.create(name);

    this.setSubmitting(true);
    request$
      .pipe(
        finalize(() => this.setSubmitting(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => this.saved.emit({ category: result, created: category === null }),
        error: (err: unknown) => this.showServerError(err),
      });
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
    if (err.code === 'DUPLICATE_CATEGORY') {
      this.name.setErrors({ server: err.message });
    } else if (err.code === 'VALIDATION_ERROR') {
      for (const { field, message } of err.fieldErrors ?? []) {
        if (field === 'name') {
          this.name.setErrors({ server: message });
        } else {
          this.formError = message;
        }
      }
    }
    // Any other code was already shown as a toast by ErrorInterceptor.
    this.revealError();
  }

  private revealError(): void {
    this.name.markAsTouched();
    this.name.markAsDirty();
    this.nameInput?.nativeElement.focus();
  }
}
