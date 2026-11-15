import { Component, input } from '@angular/core';

@Component({
  selector: 'app-wizard-step',
  standalone: true,
  template: `
    <header class="head">
      <h2>{{ title() }}</h2>
      @if (subtitle()) { <p>{{ subtitle() }}</p> }
    </header>
    <div class="body"><ng-content /></div>
    <footer class="foot"><ng-content select="[footer]" /></footer>
  `,
  styles: `
    :host { display: block; }
    .head { padding: 36px 44px 24px; border-bottom: 1px solid #e3e8f3; }
    h2 { margin: 0; font-size: 30px; font-weight: 800; letter-spacing: -0.01em; }
    p { margin: 6px 0 0; color: #5d6b8a; font-size: 17px; }
    .body { padding: 32px 44px 8px; }
    .foot { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 24px 44px 36px; }
    .foot:empty { display: none; }
    @media (max-width: 600px) {
      .head, .body, .foot { padding-left: 20px; padding-right: 20px; }
      h2 { font-size: 24px; }
    }
  `,
})
export class WizardStepComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
}