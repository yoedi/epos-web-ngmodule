import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * TEMPORARY: stands in for feature pages inside the shell until each
 * feature module exists. Delete once the last one is built.
 */
@Component({
  selector: 'app-placeholder',
  templateUrl: './placeholder.component.html',
  styleUrl: './placeholder.component.css',
  standalone: false,
})
export class PlaceholderComponent {
  readonly title: string = inject(ActivatedRoute).snapshot.data['title'] ?? '';
}
