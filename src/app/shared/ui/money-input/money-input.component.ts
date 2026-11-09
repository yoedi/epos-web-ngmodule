import { Component, ElementRef, Input, ViewChild, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { formatThousands, parseDigits } from '../../utils/money';

/** Whole rupiah up to 14 digits, with its dots. Stays inside Number.MAX_SAFE_INTEGER. */
const MAX_FORMATTED_LENGTH = 18;

/** Rupiah input that formats thousands while typing; its value is an integer or null. */
@Component({
  selector: 'app-money-input',
  templateUrl: './money-input.component.html',
  styleUrl: './money-input.component.css',
  standalone: false,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MoneyInputComponent),
      multi: true,
    },
  ],
})
export class MoneyInputComponent implements ControlValueAccessor {
  @Input({ required: true }) inputId!: string;
  @Input() invalid = false;
  @Input() describedBy: string | null = null;

  @ViewChild('input', { static: true }) private input!: ElementRef<HTMLInputElement>;

  readonly maxLength = MAX_FORMATTED_LENGTH;
  text = '';
  disabled = false;

  private onChange: (value: number | null) => void = () => undefined;
  onTouched: () => void = () => undefined;

  writeValue(value: number | null): void {
    this.text = value === null ? '' : formatThousands(value);
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
  }

  handleInput(): void {
    const element = this.input.nativeElement;
    const digitsBeforeCaret = countDigits(element.value.slice(0, element.selectionStart ?? 0));

    const value = parseDigits(element.value);
    this.text = value === null ? '' : formatThousands(value);
    element.value = this.text;

    const caret = caretAfterDigits(this.text, digitsBeforeCaret);
    element.setSelectionRange(caret, caret);
    this.onChange(value);
  }
}

function countDigits(text: string): number {
  return text.replace(/\D/g, '').length;
}

/** Position right after the n-th digit, so inserted dots do not move the caret. */
function caretAfterDigits(text: string, digits: number): number {
  let seen = 0;
  for (let i = 0; i < text.length && seen < digits; i++) {
    if (/\d/.test(text[i])) {
      seen++;
    }
    if (seen === digits) {
      return i + 1;
    }
  }
  return digits === 0 ? 0 : text.length;
}
