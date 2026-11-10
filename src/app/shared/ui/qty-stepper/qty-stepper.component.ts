import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * − / qty / + control (PRD section 10, design-system.md "Stepper qty").
 * Emits the requested qty and leaves validation to the parent: a typed value
 * may be anything, so the field shows `value` again until the parent accepts it.
 */
@Component({
  selector: 'app-qty-stepper',
  templateUrl: './qty-stepper.component.html',
  styleUrl: './qty-stepper.component.css',
  standalone: false,
})
export class QtyStepperComponent {
  @Input({ required: true }) value!: number;
  /** Item name for the button labels: "Tambah Kopi Sachet". */
  @Input({ required: true }) label!: string;
  @Input() min = 1;

  @Output() readonly valueChange = new EventEmitter<number>();

  commit(input: HTMLInputElement): void {
    const typed = Number(input.value.trim());
    input.value = String(this.value);
    if (typed !== this.value) {
      this.valueChange.emit(typed);
    }
  }
}
