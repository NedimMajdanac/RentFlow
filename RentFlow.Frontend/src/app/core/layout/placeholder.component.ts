import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  template: `
    <div class="ph">
      <h1>{{ title }}</h1>
      <p>Ova stranica još nije napravljena.</p>
    </div>
  `,
  styles: `
    .ph { padding: 40px 32px; color: #14213d; font-family: Inter, 'Segoe UI', system-ui, sans-serif; }
    h1 { margin: 0 0 8px; font-size: 32px; font-weight: 800; }
    p { margin: 0; color: #6b7a99; }
  `,
})
export class PlaceholderComponent {
  readonly title = inject(ActivatedRoute).snapshot.data['title'] ?? '';
}