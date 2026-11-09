import { Component, EventEmitter, Input, Output } from '@angular/core';

/** Small modal asking the user to confirm one action. */
@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  standalone: false,
})
export class ConfirmDialogComponent {
  @Input() visible = false;
  @Input({ required: true }) title!: string;
  @Input() confirmLabel = 'Ya';
  @Input() cancelLabel = 'Batal';
  @Input() danger = false;
  @Input() busy = false;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  readonly dialogStyle = { width: 'var(--dialog-w-sm)', maxWidth: '100%' };

  handleVisibleChange(visible: boolean): void {
    if (!visible) {
      this.cancelled.emit();
    }
  }
}
