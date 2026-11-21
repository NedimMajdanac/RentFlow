import { Component, ElementRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { PROPERTY_TYPE_OPTIONS, PropertyType } from '../../../property.models';
import { PropertyDraftService } from '../../property-draft.service';
import { WIZARD_BASE, WIZARD_STEPS } from '../../property-wizard.config';
import { parseDecimal, toNumberOrNull } from '../../shared/parse-number';
import { WizardStepComponent } from '../../shared/wizard-step.component';

type Field = 'areaM2' | 'plotAreaM2' | 'rooms' | 'bathrooms' | 'floor' | 'totalFloors' | 'yearBuilt';
type Rule = 'hidden' | 'optional' | 'required';
type Rules = Record<Field, Rule>;

const RULES: Record<PropertyType, Rules> = {
  Apartment: { areaM2: 'required', plotAreaM2: 'hidden', rooms: 'required', bathrooms: 'required', floor: 'required', totalFloors: 'required', yearBuilt: 'optional' },
  House: { areaM2: 'required', plotAreaM2: 'optional', rooms: 'required', bathrooms: 'required', floor: 'hidden', totalFloors: 'optional', yearBuilt: 'optional' },
  Commercial: { areaM2: 'required', plotAreaM2: 'hidden', rooms: 'optional', bathrooms: 'optional', floor: 'optional', totalFloors: 'optional', yearBuilt: 'optional' },
  Land: { areaM2: 'hidden', plotAreaM2: 'required', rooms: 'hidden', bathrooms: 'hidden', floor: 'hidden', totalFloors: 'hidden', yearBuilt: 'hidden' },
  Garage: { areaM2: 'required', plotAreaM2: 'hidden', rooms: 'hidden', bathrooms: 'hidden', floor: 'hidden', totalFloors: 'hidden', yearBuilt: 'optional' },
  Other: { areaM2: 'required', plotAreaM2: 'hidden', rooms: 'optional', bathrooms: 'optional', floor: 'optional', totalFloors: 'optional', yearBuilt: 'optional' },
};

const LABELS: Record<Field, string> = {
  areaM2: 'površinu',
  plotAreaM2: 'površinu zemljišta',
  rooms: 'broj soba',
  bathrooms: 'broj kupatila',
  floor: 'sprat',
  totalFloors: 'ukupan broj spratova',
  yearBuilt: 'godinu izgradnje',
};

const MAX_AREA = 100_000;     
const MAX_PLOT_AREA = 10_000_000;

function decimalValidator(required: boolean, max: number): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null => {
    const n = parseDecimal(c.value);
    if (n === null) return required ? { required: true } : null;
    if (Number.isNaN(n)) return { number: true };
    if (n <= 0) return { positive: true };
    if (n > max) return { max: true };
    return null;
  };
}

const floorVsTotal: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const floor = group.get('floor')?.value as number | null;
  const total = group.get('totalFloors')?.value as number | null;
  return floor !== null && total !== null && floor > total ? { floorAboveTotal: true } : null;
};

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const textOf = (n: number | null) => (n === null ? '' : String(n));

@Component({
  selector: 'app-property-step-features',
  standalone: true,
  imports: [ReactiveFormsModule, WizardStepComponent],
  templateUrl: './property-step-features.component.html',
  styleUrls: ['../../shared/wizard-form.css', './property-step-features.component.css'],
})
export class PropertyStepFeaturesComponent {
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly draft = inject(PropertyDraftService);

  readonly type: PropertyType = this.draft.draft().propertyType ?? 'Other';
  readonly typeLabel = PROPERTY_TYPE_OPTIONS.find((t) => t.value === this.type)?.label ?? '';
  readonly rules: Rules = RULES[this.type];

  readonly roomOptions = range(1, 15);
  readonly bathroomOptions = range(1, 6);
  readonly floorOptions = [
    { value: -1, label: 'Suteren' },
    { value: 0, label: 'Prizemlje' },
    ...range(1, 30).map((n) => ({ value: n, label: `${n}. sprat` })),
  ];
  readonly totalFloorOptions = range(1, 30);
  readonly yearOptions = range(1900, new Date().getFullYear() + 3).reverse();

  private readonly initial = this.draft.draft();

  readonly form = new FormGroup(
    {
      areaM2: new FormControl(textOf(this.initial.areaM2), { nonNullable: true }),
      plotAreaM2: new FormControl(textOf(this.initial.plotAreaM2), { nonNullable: true }),
      rooms: new FormControl<number | null>(this.initial.rooms),
      bathrooms: new FormControl<number | null>(this.initial.bathrooms),
      floor: new FormControl<number | null>(this.initial.floor),
      totalFloors: new FormControl<number | null>(this.initial.totalFloors),
      yearBuilt: new FormControl<number | null>(this.initial.yearBuilt),
    },
    { validators: [floorVsTotal] },
  );

  constructor() {
    this.form.controls.areaM2.setValidators(
      this.rules.areaM2 === 'hidden' ? [] : [decimalValidator(this.rules.areaM2 === 'required', MAX_AREA)],
    );
    this.form.controls.plotAreaM2.setValidators(
      this.rules.plotAreaM2 === 'hidden' ? [] : [decimalValidator(this.rules.plotAreaM2 === 'required', MAX_PLOT_AREA)],
    );
    for (const f of ['rooms', 'bathrooms', 'floor', 'totalFloors', 'yearBuilt'] as const) {
      this.form.controls[f].setValidators(this.rules[f] === 'required' ? [Validators.required] : []);
    }
    this.form.updateValueAndValidity({ emitEvent: false });

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.saveDraft();
      if (this.form.invalid) this.draft.unmarkCompleted(2);
    });
  }

  show(field: Field): boolean {
    return this.rules[field] !== 'hidden';
  }

  isOptional(field: Field): boolean {
    return this.rules[field] === 'optional';
  }

  fieldError(field: Field): string | null {
    const c = this.form.controls[field];
    if (!(c.touched || c.dirty)) return null;

    if (field === 'floor' && this.form.errors?.['floorAboveTotal']) {
      return 'Sprat ne može biti veći od ukupnog broja spratova.';
    }
    if (!c.errors) return null;
    if (c.errors['required']) return `Unesite ${LABELS[field]}.`;
    if (c.errors['number']) return 'Unesite ispravan broj.';
    if (c.errors['positive']) return 'Vrijednost mora biti veća od nule.';
    if (c.errors['max']) return 'Vrijednost je prevelika.';
    return 'Neispravna vrijednost.';
  }

  next(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      setTimeout(() => (this.host.nativeElement.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus());
      return;
    }

    this.saveDraft();
    this.draft.markCompleted(2);
    this.router.navigate([WIZARD_BASE, WIZARD_STEPS[3].path]);
  }

  private saveDraft(): void {
    const v = this.form.getRawValue();
    const r = this.rules;

    const plot = r.plotAreaM2 === 'hidden' ? null : toNumberOrNull(v.plotAreaM2);
    const area = this.type === 'Land' ? plot : r.areaM2 === 'hidden' ? null : toNumberOrNull(v.areaM2);

    this.draft.patch({
      areaM2: area,
      plotAreaM2: plot,
      rooms: r.rooms === 'hidden' ? null : v.rooms,
      bathrooms: r.bathrooms === 'hidden' ? null : v.bathrooms,
      floor: r.floor === 'hidden' ? null : v.floor,
      totalFloors: r.totalFloors === 'hidden' ? null : v.totalFloors,
      yearBuilt: r.yearBuilt === 'hidden' ? null : v.yearBuilt,
    });
  }
}