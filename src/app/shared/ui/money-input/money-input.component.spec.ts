import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { SharedModule } from '../../shared.module';
import { MoneyInputComponent } from './money-input.component';

describe('MoneyInputComponent', () => {
  let fixture: ComponentFixture<MoneyInputComponent>;
  let component: MoneyInputComponent;
  let input: HTMLInputElement;
  let emitted: (number | null)[];

  function type(value: string, caret = value.length): void {
    input.value = value;
    input.setSelectionRange(caret, caret);
    input.dispatchEvent(new Event('input'));
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SharedModule] }).compileComponents();
    fixture = TestBed.createComponent(MoneyInputComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('inputId', 'price');
    emitted = [];
    component.registerOnChange((value) => emitted.push(value));
    fixture.detectChanges();
    input = fixture.debugElement.query(By.css('input')).nativeElement as HTMLInputElement;
  });

  it('formats thousands while typing and emits the integer', () => {
    type('36500');

    expect(input.value).toBe('36.500');
    expect(emitted).toEqual([36500]);
  });

  it('ignores anything that is not a digit', () => {
    type('12a3,5');

    expect(input.value).toBe('1.235');
    expect(emitted).toEqual([1235]);
  });

  it('emits null when cleared', () => {
    type('');

    expect(emitted).toEqual([null]);
  });

  it('keeps zero as a value', () => {
    type('0');

    expect(input.value).toBe('0');
    expect(emitted).toEqual([0]);
  });

  it('keeps the caret next to the same digit when editing in the middle', () => {
    // A 9 typed after the 1 of "1.500": the caret stays right after the 9.
    type('19.500', 2);

    expect(input.value).toBe('19.500');
    expect(input.selectionStart).toBe(2);

    // A 7 typed after the 5 of "19.500": the dot moves, the caret stays after the 7.
    type('19.5700', 5);

    expect(input.value).toBe('195.700');
    expect(input.selectionStart).toBe(5);
  });

  it('shows a value written by the form', () => {
    component.writeValue(1500);
    fixture.detectChanges();

    expect(input.value).toBe('1.500');

    component.writeValue(null);
    fixture.detectChanges();

    expect(input.value).toBe('');
  });
});
