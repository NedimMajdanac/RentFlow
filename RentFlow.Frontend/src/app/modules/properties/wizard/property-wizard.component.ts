import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { PropertyDraftService } from './property-draft.service';
import { WIZARD_BASE, WIZARD_STEPS } from './property-wizard.config';

@Component({
  selector: 'app-property-wizard',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './property-wizard.component.html',
  styleUrl: './property-wizard.component.css',
})
export class PropertyWizardComponent {
  private readonly router = inject(Router);
  private readonly draft = inject(PropertyDraftService);

  readonly steps = WIZARD_STEPS;
  readonly base = WIZARD_BASE;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly currentIndex = computed(() => {
    const path = this.url().split('?')[0].split('#')[0];
    const i = this.steps.findIndex((s) => path.endsWith('/' + s.path));
    return i < 0 ? 0 : i;
  });

  readonly stepNumber = computed(() => this.currentIndex() + 1);
  readonly progress = computed(() => (this.stepNumber() / this.steps.length) * 100);

  reachable(index: number): boolean {
    for (let i = 0; i < index; i++) {
      if (!this.draft.isCompleted(i)) return false;
    }
    return true;
  }

  isDone(index: number): boolean {
    return this.draft.isCompleted(index) && index !== this.currentIndex();
  }
}