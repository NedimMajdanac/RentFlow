import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PropertyDraftService } from './property-draft.service';
import { WIZARD_BASE, WIZARD_STEPS } from './property-wizard.config';

export const wizardStepGuard =
  (index: number): CanActivateFn =>
  () => {
    const draft = inject(PropertyDraftService);
    const router = inject(Router);

    for (let i = 0; i < index; i++) {
      if (!draft.isCompleted(i)) {
        return router.createUrlTree([WIZARD_BASE, WIZARD_STEPS[i].path]);
      }
    }
    return true;
  };