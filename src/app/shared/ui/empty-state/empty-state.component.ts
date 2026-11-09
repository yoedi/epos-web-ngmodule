import { Component, Input } from '@angular/core';

/** Centered message for empty and error states; the action goes in as content. */
@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.css',
  standalone: false,
})
export class EmptyStateComponent {
  @Input() icon = 'pi-inbox';
  @Input({ required: true }) title!: string;
  @Input() description: string | null = null;
  @Input() danger = false;
}
