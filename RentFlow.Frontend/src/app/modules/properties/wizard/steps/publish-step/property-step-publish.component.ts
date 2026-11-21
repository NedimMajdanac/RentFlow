import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
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
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { extractFieldErrors } from '../../../../../core/http/api-error';
import { Currency, CurrencyService } from '../../../../../core/services/currency.service';
import { ListingService } from '../../../../listings/services/listing.service';
import { LISTING_KIND_OPTIONS, ListingKind, PROPERTY_TYPE_OPTIONS } from '../../../property.models';
import { PropertyDraftService } from '../../property-draft.service';
import { PropertyService } from '../../../property.service';
import { buildPropertyRequest, missingForProperty } from '../../shared/draft-mappers';
import { parseDecimal, toNumberOrNull } from '../../shared/parse-number';
import { WizardStepComponent } from '../../shared/wizard-step.component';

type Field = 'listingType' | 'title' | 'price' | 'currencyId' | 'deposit';
type StepKey = 'property' | 'photos' | 'listing';
type StepState = 'pending' | 'active' | 'done' | 'error';

interface ProgressStep {
  key: StepKey;
  label: string;
  state: StepState;
  detail: string;
}

const MAX_AMOUNT = 100_000_000; // same limit as the backend validator

/** required that also rejects whitespace-only input */
function notBlank(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim() ? null : { required: true };
}

/** Money input: comma or dot as decimal separator, at most two decimals, within the allowed range. */
function moneyValidator(opts: { required: boolean; allowZero: boolean }): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null => {
    const text = String(c.value ?? '').trim().replace(',', '.');
    if (!text) return opts.required ? { required: true } : null;
    if (!/^\d+(\.\d+)?$/.test(text)) return { number: true };
    if ((text.split('.')[1]?.length ?? 0) > 2) return { decimals: true };

    const n = parseDecimal(text);
    if (n === null || Number.isNaN(n)) return { number: true };
    if (n > MAX_AMOUNT) return { max: true };
    if (!opts.allowZero && n <= 0) return { positive: true };
    return null;
  };
}

const textOf = (n: number | null) => (n === null ? '' : String(n));

@Component({
  selector: 'app-property-step-publish',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, WizardStepComponent],
  templateUrl: './property-step-publish.component.html',
  styleUrls: ['../../shared/wizard-form.css', './property-step-publish.component.css'],
})
export class PropertyStepPublishComponent {
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly draft = inject(PropertyDraftService);
  private readonly properties = inject(PropertyService);
  private readonly listings = inject(ListingService);
  private readonly currencyService = inject(CurrencyService);

  readonly kindOptions = LISTING_KIND_OPTIONS;
  readonly currencies = signal<Currency[]>([]);
  readonly currenciesError = signal(false);

  // ---------- publishing state ----------
  readonly running = signal(false);
  readonly steps = signal<ProgressStep[]>([]);
  readonly failure = signal<string | null>(null);
  readonly outcome = signal<{ published: boolean; title: string } | null>(null);
  readonly formError = signal<string | null>(null);
  readonly isRent = signal(false);

  /** Which view is shown: the form, the progress/failure panel or the success screen. */
  readonly view = computed<'form' | 'progress' | 'success'>(() => {
    if (this.outcome()) return 'success';
    return this.running() || this.failure() ? 'progress' : 'form';
  });

  private lastPublish = true;
  private readonly initial = this.draft.draft();

  readonly form = new FormGroup({
    listingType: new FormControl<ListingKind | ''>(this.initial.listingType ?? '', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    title: new FormControl(this.initial.title || this.suggestTitle(), {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(200)],
    }),
    price: new FormControl(textOf(this.initial.price), {
      nonNullable: true,
      validators: [moneyValidator({ required: true, allowZero: false })],
    }),
    currencyId: new FormControl<number | null>(this.initial.currencyId, { validators: [Validators.required] }),
    isNegotiable: new FormControl(this.initial.isNegotiable, { nonNullable: true }),
    deposit: new FormControl(textOf(this.initial.deposit), {
      nonNullable: true,
      validators: [moneyValidator({ required: false, allowZero: true })],
    }),
  });

  constructor() {
    this.syncDepositState();

    this.form.controls.listingType.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.syncDepositState());

    // The draft is saved while the user types, so going back and forth never loses data.
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.saveDraft();
      if (this.form.invalid) this.draft.unmarkCompleted(5);
    });

    this.loadCurrencies();
  }

  // Warn before closing the tab while the upload sequence is running.
  @HostListener('window:beforeunload', ['$event'])
  warnBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.running()) event.preventDefault();
  }

  // ---------- form helpers ----------
  fieldError(field: Field): string | null {
    const c = this.form.controls[field];
    if (!c.errors || !(c.touched || c.dirty)) return null;

    if (c.errors['required']) {
      return {
        listingType: 'Odaberite vrstu oglasa.',
        title: 'Unesite naslov oglasa.',
        price: 'Unesite cijenu.',
        currencyId: 'Odaberite valutu.',
        deposit: '',
      }[field];
    }
    if (c.errors['maxlength']) return `Najviše ${c.errors['maxlength'].requiredLength} znakova.`;
    if (c.errors['number']) return 'Unesite ispravan iznos.';
    if (c.errors['decimals']) return 'Najviše dvije decimale.';
    if (c.errors['positive']) return 'Iznos mora biti veći od nule.';
    if (c.errors['max']) return 'Iznos je prevelik.';
    return 'Neispravna vrijednost.';
  }

  retryCurrencies(): void {
    this.loadCurrencies();
  }

  private loadCurrencies(): void {
    this.currenciesError.set(false);
    this.currencyService.getAll().subscribe({
      next: (list) => {
        this.currencies.set(list);
        // Preselect BAM (or the first currency) when the user has not chosen one yet.
        const control = this.form.controls.currencyId;
        if (control.value === null && list.length) {
          control.setValue((list.find((c) => c.code === 'BAM') ?? list[0]).id);
        }
      },
      error: () => this.currenciesError.set(true),
    });
  }

  /** The deposit only makes sense for rentals, so it is disabled (and cleared) for sales. */
  private syncDepositState(): void {
    const rent = this.form.controls.listingType.value === 'Rent';
    this.isRent.set(rent);

    const deposit = this.form.controls.deposit;
    if (rent && deposit.disabled) deposit.enable({ emitEvent: false });
    if (!rent && deposit.enabled) {
      deposit.setValue('', { emitEvent: false });
      deposit.disable({ emitEvent: false });
    }
  }

  private suggestTitle(): string {
    const d = this.draft.draft();
    const type = PROPERTY_TYPE_OPTIONS.find((t) => t.value === d.propertyType)?.label ?? '';
    return [type, d.address].filter(Boolean).join(', ').slice(0, 200);
  }

  private saveDraft(): void {
    const v = this.form.getRawValue();
    this.draft.patch({
      listingType: v.listingType || null,
      title: v.title.trim(),
      price: toNumberOrNull(v.price),
      currencyId: v.currencyId,
      isNegotiable: v.isNegotiable,
      deposit: v.listingType === 'Rent' ? toNumberOrNull(v.deposit) : null,
    });
  }

  async submit(publish: boolean): Promise<void> {
    if (this.running()) return;
    this.formError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      setTimeout(() => (this.host.nativeElement.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus());
      return;
    }

    this.saveDraft();

    const missing = missingForProperty(this.draft.draft());
    if (missing.length) {
      this.formError.set(`Prije objave dopunite: ${missing.join(', ')}.`);
      return;
    }

    this.lastPublish = publish;
    await this.run();
  }

  /** Resumes from the point of failure: finished stages are skipped because the draft remembers them. */
  async retry(): Promise<void> {
    if (!this.running()) await this.run();
  }

  backToForm(): void {
    if (!this.running()) this.failure.set(null);
  }

  private async run(): Promise<void> {
    this.running.set(true);
    this.failure.set(null);
    this.initSteps();

    let stage: StepKey = 'property';
    try {
      this.setStep('property', 'active');
      await this.saveProperty();
      this.setStep('property', 'done');

      stage = 'photos';
      this.setStep('photos', 'active');
      await this.uploadPhotos();
      this.setStep('photos', 'done');

      stage = 'listing';
      this.setStep('listing', 'active');
      const d = this.draft.draft();
      await firstValueFrom(
        this.listings.create({
          propertyId: d.propertyId!,
          listingType: d.listingType!,
          title: d.title,
          price: d.price!,
          currencyId: d.currencyId!,
          deposit: d.listingType === 'Rent' ? d.deposit : null,
          isNegotiable: d.isNegotiable,
          publish: this.lastPublish,
        }),
      );
      this.setStep('listing', 'done');

      // Everything is saved on the server, so the local draft is no longer needed.
      this.outcome.set({ published: this.lastPublish, title: d.title });
      this.draft.reset();
    } catch (err) {
      this.setStep(stage, 'error');

      // The property was deleted in the meantime: the next attempt starts from scratch.
      if (stage === 'listing' && err instanceof HttpErrorResponse && err.status === 404) {
        this.draft.patch({ propertyId: null });
        this.draft.resetUploads();
        this.failure.set('Nekretnina više ne postoji na serveru. Pokušajte ponovo da se snimi ispočetka.');
      } else {
        this.failure.set(this.messageFor(err));
      }
    } finally {
      this.running.set(false);
    }
  }

  /** Creates the property, or updates it when an earlier attempt already created it. */
  private async saveProperty(): Promise<void> {
    const d = this.draft.draft();
    const body = buildPropertyRequest(d);

    if (d.propertyId) {
      try {
        await firstValueFrom(this.properties.update(d.propertyId, body));
        return;
      } catch (err) {
        if (!(err instanceof HttpErrorResponse && err.status === 404)) throw err;
        // Deleted on the server: fall through and create it again, with all photos pending.
        this.draft.patch({ propertyId: null });
        this.draft.resetUploads();
      }
    }

    const created = await firstValueFrom(this.properties.create(body));
    this.draft.patch({ propertyId: created.id });
  }

  private async uploadPhotos(): Promise<void> {
    const propertyId = this.draft.draft().propertyId!;
    const deletes = this.draft.pendingImageDeletes();

    // 1. Remove server images the user removed locally after they were uploaded.
    for (const imageId of deletes) {
      try {
        await firstValueFrom(this.properties.deleteImage(propertyId, imageId));
      } catch (err) {
        if (!(err instanceof HttpErrorResponse && err.status === 404)) throw err; // already gone is fine
      }
      this.draft.clearPendingDelete(imageId);
    }

    const photos = this.draft.photos();
    if (!photos.length) {
      this.setStep('photos', 'done', 'Bez fotografija');
      return;
    }

    // 2. Upload what is not on the server yet, in order (the backend makes the first image the main one).
    const resumed = deletes.length > 0 || photos.some((p) => p.remoteId !== null);
    let done = photos.filter((p) => p.remoteId !== null).length;

    for (const photo of photos) {
      if (photo.remoteId !== null) continue;
      this.setStep('photos', 'active', `${done + 1} od ${photos.length}`);
      const image = await firstValueFrom(this.properties.uploadImage(propertyId, photo.file));
      this.draft.markPhotoUploaded(photo.id, image.id);
      done++;
    }

    // 3. After a resumed attempt, make the server order and the main image match the local order.
    if (resumed) {
      const ids = this.draft.photos().map((p) => p.remoteId!);
      try {
        if (ids.length > 1) await firstValueFrom(this.properties.reorderImages(propertyId, ids));
        await firstValueFrom(this.properties.setMainImage(propertyId, ids[0]));
      } catch {
        // Best effort: a mismatch here (e.g. after a page refresh lost the local list) must not block publishing.
      }
    }

    this.setStep('photos', 'done', `${photos.length} od ${photos.length}`);
  }

  private initSteps(): void {
    const photoCount = this.draft.photos().length;
    this.steps.set([
      { key: 'property', label: 'Snimanje nekretnine', state: 'pending', detail: '' },
      { key: 'photos', label: photoCount ? 'Slanje fotografija' : 'Fotografije (nisu dodane)', state: 'pending', detail: '' },
      { key: 'listing', label: this.lastPublish ? 'Objava oglasa' : 'Čuvanje nacrta oglasa', state: 'pending', detail: '' },
    ]);
  }

  private setStep(key: StepKey, state: StepState, detail?: string): void {
    this.steps.update((list) =>
      list.map((s) => (s.key === key ? { ...s, state, detail: detail ?? (state === 'active' ? '' : s.detail) } : s)),
    );
  }

  private messageFor(err: unknown): string {
    if (!(err instanceof HttpErrorResponse)) return 'Došlo je do neočekivane greške. Pokušajte ponovo.';
    if (err.status === 0) return 'Server nije dostupan. Provjerite vezu i pokušajte ponovo.';

    const fieldMessages = Object.values(extractFieldErrors(err)).flat();
    if (fieldMessages.length) return fieldMessages.join(' ');

    return err.error?.message ?? err.error?.detail ?? 'Snimanje nije uspjelo. Pokušajte ponovo.';
  }
}