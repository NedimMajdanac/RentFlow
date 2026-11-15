import { Component, ElementRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PROPERTY_TYPE_OPTIONS, PropertyType } from '../../../property.models';
import { PropertyDraftService } from '../../property-draft.service';
import { WIZARD_BASE, WIZARD_STEPS } from '../../property-wizard.config';
import { WizardStepComponent } from '../../shared/wizard-step.component';

type FieldName = 'propertyType' | 'address' | 'description';

function notBlank(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim() ? null : { required: true };
}

@Component({
  selector: 'app-property-step-basic',
  standalone: true,
  imports: [ReactiveFormsModule, WizardStepComponent],
  templateUrl: './property-step-basic.component.html',
  styleUrl: './property-step-basic.component.css',
})
export class PropertyStepBasicComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly draft = inject(PropertyDraftService);

  readonly typeOptions = PROPERTY_TYPE_OPTIONS;

  readonly form = this.fb.nonNullable.group({
    propertyType: [(this.draft.draft().propertyType ?? '') as PropertyType | '', [Validators.required]],
    address: [this.draft.draft().address, [notBlank, Validators.maxLength(200)]],
    description: [this.draft.draft().description, [Validators.maxLength(4000)]],
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.saveDraft();
      if (this.form.invalid) this.draft.unmarkCompleted(0);
    });
  }

  fieldError(name: FieldName): string | null {
    const c = this.form.controls[name];
    if (!c.errors || !(c.touched || c.dirty)) return null;

    if (c.errors['required']) {
      return name === 'propertyType' ? 'Odaberite tip nekretnine.' : 'Unesite adresu nekretnine.';
    }
    if (c.errors['maxlength']) return `Najviše ${c.errors['maxlength'].requiredLength} znakova.`;
    return 'Neispravna vrijednost.';
  }

  next(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      setTimeout(() => (this.host.nativeElement.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus());
      return;
    }

    this.saveDraft();
    this.draft.markCompleted(0);
    this.router.navigate([WIZARD_BASE, WIZARD_STEPS[1].path]);
  }

  private saveDraft(): void {
    const v = this.form.getRawValue();
    this.draft.patch({
      propertyType: v.propertyType || null,
      address: v.address.trim(),
      description: v.description.trim(),
    });
  }
}