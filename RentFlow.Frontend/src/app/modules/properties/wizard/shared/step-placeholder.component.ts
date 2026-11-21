import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { WizardStepComponent } from './wizard-step.component';

@Component({
  selector: 'app-step-placeholder',
  standalone: true,
  imports: [WizardStepComponent],
  template: `
    <app-wizard-step [title]="title" subtitle="Ovaj korak još nije napravljen.">
      <p class="note">Uskoro.</p>
    </app-wizard-step>
  `,
  styles: `.note { margin: 0 0 32px; color: #5d6b8a; }`,
})
export class StepPlaceholderComponent {
  readonly title = inject(ActivatedRoute).snapshot.data['stepTitle'] ?? '';
}