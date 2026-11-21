import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, HostListener, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { map } from 'rxjs';
import { extractFieldErrors } from '../../../../../core/http/api-error';
import { Amenity, AmenityService } from '../../../../../core/services/amenity.service';
import {
  CONDITION_OPTIONS,
  FURNISHED_OPTIONS,
  FurnishedStatus,
  HEATING_OPTIONS,
  HeatingType,
  PROPERTY_TYPE_OPTIONS,
  PropertyCondition,
  PropertyRequest,
  PropertyType,
} from '../../../property.models';
import { PropertyService } from '../../../property.service';
import { PropertyDraft, PropertyDraftService } from '../../property-draft.service';
import { WIZARD_BASE, WIZARD_STEPS } from '../../property-wizard.config';
import { WizardStepComponent } from '../../shared/wizard-step.component';



type Field = 'heatingType' | 'furnishedStatus' | 'condition';
type Rule = 'hidden' | 'optional' | 'required';
type Rules = Record<Field, Rule>;

const RULES: Record<PropertyType, Rules> = {
  Apartment: { heatingType: 'required', furnishedStatus: 'required', condition: 'required' },
  House: { heatingType: 'required', furnishedStatus: 'optional', condition: 'required' },
  Commercial: { heatingType: 'optional', furnishedStatus: 'optional', condition: 'optional' },
  Garage: { heatingType: 'hidden', furnishedStatus: 'hidden', condition: 'optional' },
  Land: { heatingType: 'hidden', furnishedStatus: 'hidden', condition: 'hidden' },
  Other: { heatingType: 'optional', furnishedStatus: 'optional', condition: 'optional' },
};

const REQUIRED_MESSAGES: Record<Field, string> = {
  heatingType: 'Odaberite vrstu grijanja.',
  furnishedStatus: 'Odaberite stanje namještenosti.',
  condition: 'Odaberite stanje nekretnine.',
};

@Component({
  selector: 'app-property-step-details',
  standalone: true,
  imports: [ReactiveFormsModule, WizardStepComponent],
  templateUrl: './property-step-details.component.html',
  styleUrls: ['../../shared/wizard-form.css', './property-step-details.component.css'],
})
export class PropertyStepDetailsComponent {
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly draft = inject(PropertyDraftService);
  private readonly amenityService = inject(AmenityService);

  @ViewChild('amenityBox') private amenityBox?: ElementRef<HTMLElement>;
  @ViewChild('amenityBtn') private amenityBtn?: ElementRef<HTMLButtonElement>;

  readonly type: PropertyType = this.draft.draft().propertyType ?? 'Other';
  readonly typeLabel = PROPERTY_TYPE_OPTIONS.find((t) => t.value === this.type)?.label ?? '';
  readonly rules: Rules = RULES[this.type];

  readonly heatingOptions = HEATING_OPTIONS;
  readonly furnishedOptions = FURNISHED_OPTIONS;
  readonly conditionOptions = CONDITION_OPTIONS;

  readonly amenities = signal<Amenity[]>([]);
  readonly amenitiesError = signal(false);
  readonly selectedIds = signal<number[]>(this.draft.draft().amenityIds);
  readonly panelOpen = signal(false);

  readonly selectedAmenities = computed(() => {
    const ids = new Set(this.selectedIds());
    return this.amenities().filter((a) => ids.has(a.id));
  });
  readonly summary = computed(() => {
    const n = this.selectedIds().length;
    return n === 0 ? 'Odaberite pogodnosti nekretnine' : `Odabrano pogodnosti: ${n}`;
  });

  private readonly initial = this.draft.draft();

  readonly form = new FormGroup({
    heatingType: new FormControl<HeatingType | null>(this.initial.heatingType),
    furnishedStatus: new FormControl<FurnishedStatus | null>(this.initial.furnishedStatus),
    condition: new FormControl<PropertyCondition | null>(this.initial.condition),
  });

  constructor() {
    for (const f of ['heatingType', 'furnishedStatus', 'condition'] as const) {
      this.form.controls[f].setValidators(this.rules[f] === 'required' ? [Validators.required] : []);
    }
    this.form.updateValueAndValidity({ emitEvent: false });

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.saveDraft();
      if (this.form.invalid) this.draft.unmarkCompleted(3);
    });

    this.loadAmenities();
  }

  show(field: Field): boolean {
    return this.rules[field] !== 'hidden';
  }

  isOptional(field: Field): boolean {
    return this.rules[field] === 'optional';
  }

  fieldError(field: Field): string | null {
    const c = this.form.controls[field];
    return c.errors?.['required'] && (c.touched || c.dirty) ? REQUIRED_MESSAGES[field] : null;
  }

  toggleAmenityPanel(): void {
    this.panelOpen.update((open) => !open);
  }

  isSelected(id: number): boolean {
    return this.selectedIds().includes(id);
  }

  toggleAmenity(id: number): void {
    this.selectedIds.update((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
    this.saveDraft();
  }

  clearAmenities(): void {
    this.selectedIds.set([]);
    this.saveDraft();
  }

  retryAmenities(): void {
    this.loadAmenities();
  }

  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: MouseEvent): void {
    if (this.panelOpen() && !this.amenityBox?.nativeElement.contains(event.target as Node)) {
      this.panelOpen.set(false);
    }
  }

  @HostListener('keydown.escape')
  closeOnEscape(): void {
    if (!this.panelOpen()) return;
    this.panelOpen.set(false);
    this.amenityBtn?.nativeElement.focus();
  }

  next(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      setTimeout(() => (this.host.nativeElement.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus());
      return;
    }

    this.saveDraft();
    this.draft.markCompleted(3);
    this.router.navigate([WIZARD_BASE, WIZARD_STEPS[4].path]);
  }

  private saveDraft(): void {
    const v = this.form.getRawValue();
    const r = this.rules;
    this.draft.patch({
      heatingType: r.heatingType === 'hidden' ? null : v.heatingType,
      furnishedStatus: r.furnishedStatus === 'hidden' ? null : v.furnishedStatus,
      condition: r.condition === 'hidden' ? null : v.condition,
      amenityIds: this.selectedIds(),
    });
  }

  private loadAmenities(): void {
    this.amenitiesError.set(false);
    this.amenityService.getAll().subscribe({
      next: (list) => {
        this.amenities.set(list);
        const valid = new Set(list.map((a) => a.id));
        const kept = this.selectedIds().filter((id) => valid.has(id));
        if (kept.length !== this.selectedIds().length) {
          this.selectedIds.set(kept);
          this.saveDraft();
        }
      },
      error: () => this.amenitiesError.set(true),
    });
  }
}