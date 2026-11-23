import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, catchError, map, of, switchMap, tap } from 'rxjs';
import { HasUnsavedChanges } from '../../../core/guards/unsaved-changes.guard';
import { extractFieldErrors } from '../../../core/http/api-error';
import { Amenity, AmenityService } from '../../../core/services/amenity.service';
import { Currency, CurrencyService } from '../../../core/services/currency.service';
import { mediaUrl } from '../../../core/utils/media-url';
import { IconComponent } from '../../../shared/ui/icon.component';
import { AmenityPickerComponent } from '../../../shared/ui/amenity-picker.component';
import { ListingStatus } from '../../listings/listing.models';
import { ListingService } from '../../listings/services/listing.service';
import { ListingUpdateRequest, PropertyDetails, PropertyListingSummary } from '../property-edit.models';
import {
  CONDITION_OPTIONS,
  FURNISHED_OPTIONS,
  FurnishedStatus,
  HEATING_OPTIONS,
  HeatingType,
  LISTING_KIND_OPTIONS,
  ListingKind,
  PropertyCondition,
  PropertyImage,
  PropertyRequest,
} from '../property.models';
import { PropertyService } from '../property.service';
import { FIELD_RULES, PropertyField } from '../shared/property-field-rules';
import { MAX_AMOUNT, decimalValidator, floorVsTotal, moneyValidator, notBlank } from '../shared/form-validators';
import { parseDecimal, toNumberOrNull } from '../wizard/shared/parse-number';
import { PropertyPhotosDialogComponent } from './property-photos-dialog.component';

type TabKey = 'details' | 'price' | 'stats' | 'requests' | 'contracts';
type DetailsField = PropertyField | 'description' | 'amenityIds';
type ListingField = 'listingType' | 'title' | 'price' | 'currencyId' | 'deposit';
type StatusAction = 'publish' | 'unpublish' | 'close';

interface ConfirmState {
  action: Exclude<StatusAction, 'publish'>;
  title: string;
  text: string;
  label: string;
}

const MAX_PLOT_AREA = 10_000_000; // same limits as the backend validator
const MAX_AREA = 100_000;

const TAB_KEYS: TabKey[] = ['details', 'price', 'stats', 'requests', 'contracts'];

const STATUS_LABELS: Record<ListingStatus, string> = {
  Draft: 'U pripremi',
  Active: 'Objavljen',
  Reserved: 'Rezervisano',
  Rented: 'Iznajmljeno',
  Sold: 'Prodano',
  Closed: 'Zatvoreno',
};

const FIELD_LABELS: Record<DetailsField, string> = {
  description: 'opis',
  areaM2: 'površinu',
  plotAreaM2: 'površinu zemljišta',
  rooms: 'broj soba',
  bathrooms: 'broj kupatila',
  floor: 'sprat',
  totalFloors: 'ukupan broj spratova',
  yearBuilt: 'godinu izgradnje',
  heatingType: 'vrstu grijanja',
  furnishedStatus: 'stanje namještenosti',
  condition: 'stanje nekretnine',
  amenityIds: 'pogodnosti',
};
const SELECT_FIELDS: DetailsField[] = ['rooms', 'bathrooms', 'floor', 'totalFloors', 'yearBuilt', 'heatingType', 'furnishedStatus', 'condition'];

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const text = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n));

/** Makes sure the currently saved value is selectable even if it is outside the usual range. */
const withCurrent = (base: number[], current: number | null | undefined): number[] =>
  current === null || current === undefined || base.includes(current) ? base : [...base, current].sort((a, b) => a - b);

const floorLabel = (n: number) => (n < 0 ? 'Suteren' : n === 0 ? 'Prizemlje' : `${n}. sprat`);

@Component({
  selector: 'app-property-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, IconComponent, AmenityPickerComponent, PropertyPhotosDialogComponent],
  templateUrl: './property-edit.component.html',
  styleUrl: './property-edit.component.css',
})
export class PropertyEditComponent implements HasUnsavedChanges {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly properties = inject(PropertyService);
  private readonly listings = inject(ListingService);
  private readonly amenityService = inject(AmenityService);
  private readonly currencyService = inject(CurrencyService);

  readonly tabs: { key: TabKey; label: string }[] = [
    { key: 'details', label: 'Detalji' },
    { key: 'price', label: 'Cijena' },
    { key: 'stats', label: 'Statistika' },
    { key: 'requests', label: 'Zahtjevi' },
    { key: 'contracts', label: 'Ugovori' },
  ];

  readonly heatingOptions = HEATING_OPTIONS;
  readonly furnishedOptions = FURNISHED_OPTIONS;
  readonly conditionOptions = CONDITION_OPTIONS;
  readonly kindOptions = LISTING_KIND_OPTIONS;

  // ---------- state ----------
  readonly tab = signal<TabKey>('details');
  readonly property = signal<PropertyDetails | null>(null);
  readonly loading = signal(true);
  readonly error = signal<'notFound' | 'failed' | null>(null);

  readonly amenities = signal<Amenity[]>([]);
  readonly amenitiesError = signal(false);
  readonly currencies = signal<Currency[]>([]);

  readonly photosOpen = signal(false);
  readonly savingDetails = signal(false);
  readonly detailsError = signal<string | null>(null);
  readonly savingListing = signal(false);
  readonly listingError = signal<string | null>(null);
  readonly statusBusy = signal(false);
  readonly confirm = signal<ConfirmState | null>(null);
  readonly toast = signal<{ text: string; kind: 'success' | 'error' } | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  private currentId = 0;
  private readonly load$ = new Subject<number>();

  // ---------- forms ----------
  readonly details = new FormGroup(
    {
      description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(4000)] }),
      areaM2: new FormControl('', { nonNullable: true }),
      plotAreaM2: new FormControl('', { nonNullable: true }),
      rooms: new FormControl<number | null>(null),
      bathrooms: new FormControl<number | null>(null),
      floor: new FormControl<number | null>(null),
      totalFloors: new FormControl<number | null>(null),
      yearBuilt: new FormControl<number | null>(null),
      heatingType: new FormControl<HeatingType | null>(null),
      furnishedStatus: new FormControl<FurnishedStatus | null>(null),
      condition: new FormControl<PropertyCondition | null>(null),
      amenityIds: new FormControl<number[]>([], { nonNullable: true }),
    },
    { validators: [floorVsTotal] },
  );

  readonly listingForm = new FormGroup({
    listingType: new FormControl<ListingKind | ''>('', { nonNullable: true, validators: [Validators.required] }),
    title: new FormControl('', { nonNullable: true, validators: [notBlank, Validators.maxLength(200)] }),
    price: new FormControl('', { nonNullable: true, validators: [moneyValidator({ required: true, allowZero: false })] }),
    currencyId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    isNegotiable: new FormControl(false, { nonNullable: true }),
    deposit: new FormControl('', { nonNullable: true, validators: [moneyValidator({ required: false, allowZero: true })] }),
  });

  // ---------- derived data ----------
  readonly listing = computed(() => this.property()?.currentListing ?? null);
  readonly rules = computed(() => FIELD_RULES[this.property()?.propertyType ?? 'Other']);

  /** Draft and Active listings are editable; Reserved, Rented and Sold are not (same rule as the backend). */
  readonly listingEditable = computed(() => {
    const l = this.listing();
    return !l || l.status === 'Draft' || l.status === 'Active';
  });
  /** The listing type (rent or sale) can be changed only while the listing is a draft. */
  readonly typeLocked = computed(() => {
    const l = this.listing();
    return !!l && l.status !== 'Draft';
  });

  readonly title = computed(() => this.listing()?.title ?? this.property()?.address ?? '');
  readonly images = computed(() =>
    [...(this.property()?.images ?? [])].sort((a, b) => Number(b.isMain) - Number(a.isMain) || a.sortOrder - b.sortOrder),
  );
  readonly tiles = computed(() => this.images().slice(1, 5));
  readonly pickerAmenities = computed(() => (this.amenities().length ? this.amenities() : (this.property()?.amenities ?? [])));

  readonly roomOptions = computed(() => withCurrent(range(1, 15), this.property()?.rooms));
  readonly bathroomOptions = computed(() => withCurrent(range(1, 6), this.property()?.bathrooms));
  readonly totalFloorOptions = computed(() => withCurrent(range(1, 30), this.property()?.totalFloors));
  readonly yearOptions = computed(() => {
    const base = range(1900, new Date().getFullYear() + 3).reverse();
    const current = this.property()?.yearBuilt;
    return current && !base.includes(current) ? [current, ...base] : base;
  });
  readonly floorOptions = computed(() =>
    withCurrent(range(-1, 30), this.property()?.floor).map((value) => ({ value, label: floorLabel(value) })),
  );

  constructor() {
    this.load$
      .pipe(
        tap(() => {
          this.property.set(null);
          this.error.set(null);
          this.loading.set(true);
          this.photosOpen.set(false);
        }),
        switchMap((id) => {
          if (!Number.isInteger(id) || id <= 0) {
            this.error.set('notFound');
            return of(null);
          }
          return this.properties.getById(id).pipe(
            catchError((err: HttpErrorResponse) => {
              // 404 also covers other people's properties: their existence is not revealed
              this.error.set(err.status === 404 ? 'notFound' : 'failed');
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((p) => {
        this.loading.set(false);
        if (!p) return;
        this.property.set(p);
        this.applyLoaded(p);
      });

    this.route.paramMap
      .pipe(map((params) => Number(params.get('id'))), takeUntilDestroyed())
      .subscribe((id) => {
        this.currentId = id;
        this.load$.next(id);
      });

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((q) => {
      const t = q.get('tab') as TabKey | null;
      this.tab.set(t && TAB_KEYS.includes(t) ? t : 'details');
    });

    // the deposit exists only for rentals
    this.listingForm.controls.listingType.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.syncDeposit());

    this.loadAmenities();
    this.loadCurrencies();
  }

  // ---------- unsaved changes ----------
  hasUnsavedChanges(): boolean {
    return this.details.dirty || this.listingForm.dirty;
  }

  @HostListener('window:beforeunload', ['$event'])
  warnBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }

  // ---------- loading ----------
  retry(): void {
    this.load$.next(this.currentId);
  }

  loadAmenities(): void {
    this.amenitiesError.set(false);
    this.amenityService.getAll().subscribe({
      next: (list) => this.amenities.set(list),
      error: () => this.amenitiesError.set(true),
    });
  }

  private loadCurrencies(): void {
    this.currencyService.getAll().subscribe({
      next: (list) => {
        this.currencies.set(list);
        // creating a new listing: preselect the default currency once the list arrives
        const control = this.listingForm.controls.currencyId;
        if (!this.listing() && control.value === null) control.setValue(this.defaultCurrencyId(), { emitEvent: false });
      },
      error: () => {},
    });
  }

  private defaultCurrencyId(): number | null {
    const list = this.currencies();
    return (list.find((c) => c.code === 'BAM') ?? list[0])?.id ?? null;
  }

  /** Reloads only the photos (after a photo change failed half-way) without touching the forms. */
  reloadImages(): void {
    this.properties.getById(this.currentId).subscribe({
      next: (p) => this.property.update((cur) => (cur ? { ...cur, images: p.images } : cur)),
      error: () => {},
    });
  }

  onImagesChange(images: PropertyImage[]): void {
    this.property.update((cur) => (cur ? { ...cur, images } : cur));
  }

  // ---------- filling the forms ----------
  private applyLoaded(p: PropertyDetails): void {
    this.detailsError.set(null);
    this.listingError.set(null);

    const r = FIELD_RULES[p.propertyType];
    const c = this.details.controls;
    c.areaM2.setValidators(r.areaM2 === 'hidden' ? [] : [decimalValidator(r.areaM2 === 'required', MAX_AREA)]);
    c.plotAreaM2.setValidators(r.plotAreaM2 === 'hidden' ? [] : [decimalValidator(r.plotAreaM2 === 'required', MAX_PLOT_AREA)]);
    for (const f of ['rooms', 'bathrooms', 'floor', 'totalFloors', 'yearBuilt', 'heatingType', 'furnishedStatus', 'condition'] as const) {
      c[f].setValidators(r[f] === 'required' ? [Validators.required] : []);
    }

    this.details.reset({
      description: p.description ?? '',
      areaM2: p.propertyType === 'Land' ? '' : text(p.areaM2),
      plotAreaM2: text(p.plotAreaM2 ?? (p.propertyType === 'Land' ? p.areaM2 : null)),
      rooms: p.rooms,
      bathrooms: p.bathrooms,
      floor: p.floor,
      totalFloors: p.totalFloors,
      yearBuilt: p.yearBuilt,
      heatingType: p.heatingType,
      furnishedStatus: p.furnishedStatus,
      condition: p.condition,
      amenityIds: p.amenities.map((a) => a.id),
    });

    this.resetListingForm(p.currentListing, p);
  }

  private resetListingForm(l: PropertyListingSummary | null, p: PropertyDetails): void {
    this.listingForm.enable({ emitEvent: false });
    this.listingForm.reset(
      l
        ? {
            listingType: l.listingType,
            title: l.title,
            price: text(l.price),
            currencyId: l.currencyId,
            isNegotiable: l.isNegotiable,
            deposit: text(l.deposit),
          }
        : {
            listingType: '',
            title: this.suggestTitle(p),
            price: '',
            currencyId: this.defaultCurrencyId(),
            isNegotiable: false,
            deposit: '',
          },
      { emitEvent: false },
    );
    this.syncListingState();
  }

  private suggestTitle(p: PropertyDetails): string {
    return p.address.slice(0, 200);
  }

  /** Applies the editing rules: read-only statuses, locked listing type and the rental-only deposit. */
  private syncListingState(): void {
    const c = this.listingForm.controls;

    if (!this.listingEditable()) {
      this.listingForm.disable({ emitEvent: false });
      return;
    }

    this.listingForm.enable({ emitEvent: false });
    if (this.typeLocked()) c.listingType.disable({ emitEvent: false });
    this.syncDeposit();
  }

  private syncDeposit(): void {
    if (!this.listingEditable()) return;
    const deposit = this.listingForm.controls.deposit;
    const rent = this.listingForm.controls.listingType.value === 'Rent';

    if (rent && deposit.disabled) deposit.enable({ emitEvent: false });
    if (!rent && deposit.enabled) {
      deposit.setValue('', { emitEvent: false });
      deposit.disable({ emitEvent: false });
    }
  }

  // ---------- tabs ----------
  selectTab(key: TabKey): void {
    this.tab.set(key);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: key === 'details' ? null : key },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  onTabKey(event: KeyboardEvent, index: number): void {
    const last = this.tabs.length - 1;
    let next = index;
    switch (event.key) {
      case 'ArrowRight': next = index === last ? 0 : index + 1; break;
      case 'ArrowLeft': next = index === 0 ? last : index - 1; break;
      case 'Home': next = 0; break;
      case 'End': next = last; break;
      default: return;
    }
    event.preventDefault();
    const key = this.tabs[next].key;
    this.selectTab(key);
    setTimeout(() => (this.host.nativeElement.querySelector(`#tab-${key}`) as HTMLElement | null)?.focus());
  }

  tabDirty(key: TabKey): boolean {
    return (key === 'details' && this.details.dirty) || (key === 'price' && this.listingForm.dirty);
  }

  // ---------- field helpers ----------
  show(field: PropertyField): boolean {
    return this.rules()[field] !== 'hidden';
  }

  optional(field: PropertyField): boolean {
    return this.rules()[field] === 'optional';
  }

  onAmenities(ids: number[]): void {
    const control = this.details.controls.amenityIds;
    control.setValue(ids);
    control.markAsDirty();
    control.markAsTouched();
  }

  fieldError(name: DetailsField): string | null {
    const c = this.details.controls[name] as AbstractControl;
    if (!(c.touched || c.dirty)) return null;

    if (name === 'floor' && this.details.errors?.['floorAboveTotal']) {
      return 'Sprat ne može biti veći od ukupnog broja spratova.';
    }
    if (!c.errors) return null;
    if (c.errors['server']) return c.errors['server'];
    if (c.errors['required']) {
      return `${SELECT_FIELDS.includes(name) ? 'Odaberite' : 'Unesite'} ${FIELD_LABELS[name]}.`;
    }
    if (c.errors['maxlength']) return `Najviše ${c.errors['maxlength'].requiredLength} znakova.`;
    if (c.errors['number']) return 'Unesite ispravan broj.';
    if (c.errors['positive']) return 'Vrijednost mora biti veća od nule.';
    if (c.errors['max']) return 'Vrijednost je prevelika.';
    return 'Neispravna vrijednost.';
  }

  listingFieldError(name: ListingField): string | null {
    const c = this.listingForm.controls[name];
    if (!c.errors || !(c.touched || c.dirty)) return null;

    if (c.errors['server']) return c.errors['server'];
    if (c.errors['required']) {
      return {
        listingType: 'Odaberite vrstu oglasa.',
        title: 'Unesite naslov oglasa.',
        price: 'Unesite cijenu.',
        currencyId: 'Odaberite valutu.',
        deposit: 'Unesite iznos.',
      }[name];
    }
    if (c.errors['maxlength']) return `Najviše ${c.errors['maxlength'].requiredLength} znakova.`;
    if (c.errors['number']) return 'Unesite ispravan iznos.';
    if (c.errors['decimals']) return 'Najviše dvije decimale.';
    if (c.errors['positive']) return 'Iznos mora biti veći od nule.';
    if (c.errors['max']) return 'Iznos je prevelik.';
    return 'Neispravna vrijednost.';
  }

  // ---------- save: details (the property) ----------
  saveDetails(): void {
    const p = this.property();
    if (!p || this.savingDetails() || !this.details.dirty) return;
    this.detailsError.set(null);

    if (this.details.invalid) {
      this.details.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }

    const body = this.buildPropertyRequest(p);
    this.savingDetails.set(true);

    this.properties.update(p.id, body).subscribe({
      next: () => {
        const byId = new Map(this.pickerAmenities().map((a) => [a.id, a]));
        this.property.update((cur) =>
          cur && {
            ...cur,
            description: body.description,
            areaM2: body.areaM2,
            plotAreaM2: body.plotAreaM2,
            rooms: body.rooms,
            bathrooms: body.bathrooms,
            floor: body.floor,
            totalFloors: body.totalFloors,
            yearBuilt: body.yearBuilt,
            heatingType: body.heatingType,
            furnishedStatus: body.furnishedStatus,
            condition: body.condition,
            amenities: body.amenityIds.map((id) => byId.get(id)).filter((a): a is { id: number; name: string } => !!a),
          },
        );
        this.details.markAsPristine();
        this.savingDetails.set(false);
        this.showToast('Promjene su sačuvane.', 'success');
      },
      error: (err: HttpErrorResponse) => {
        this.savingDetails.set(false);
        this.detailsError.set(this.applyServerErrors(err, this.details));
        this.focusFirstInvalid();
      },
    });
  }

  /** Fields that are not on this screen (city, address, type, coordinates) are sent exactly as loaded. */
  private buildPropertyRequest(p: PropertyDetails): PropertyRequest {
    const v = this.details.getRawValue();
    const r = FIELD_RULES[p.propertyType];
    const when = <T>(field: PropertyField, value: T | null): T | null => (r[field] === 'hidden' ? null : value);

    const plot = when('plotAreaM2', toNumberOrNull(v.plotAreaM2));
    // land has no built area, but the backend needs a positive one, so it equals the plot area
    const area = p.propertyType === 'Land' ? plot : toNumberOrNull(v.areaM2);

    return {
      cityId: p.cityId,
      propertyType: p.propertyType,
      address: p.address,
      description: v.description.trim() || null,
      areaM2: area as number,
      plotAreaM2: plot,
      rooms: when('rooms', v.rooms),
      bathrooms: when('bathrooms', v.bathrooms),
      floor: when('floor', v.floor),
      totalFloors: when('totalFloors', v.totalFloors),
      yearBuilt: when('yearBuilt', v.yearBuilt),
      heatingType: when('heatingType', v.heatingType),
      furnishedStatus: when('furnishedStatus', v.furnishedStatus),
      condition: when('condition', v.condition),
      latitude: p.latitude,
      longitude: p.longitude,
      amenityIds: v.amenityIds,
    };
  }

  // ---------- save: price (the listing) ----------
  /** Saves changes of an existing listing. */
  saveListing(): void {
    const l = this.listing();
    if (!l || this.savingListing() || !this.listingForm.dirty || !this.listingEditable()) return;
    if (!this.validateListing()) return;

    const body = this.buildListingRequest();
    this.savingListing.set(true);

    this.listings.update(l.id, body).subscribe({
      next: () => {
        this.patchListing({ ...body, currencyCode: this.currencyCode(body.currencyId, l.currencyCode) });
        this.listingForm.markAsPristine();
        this.savingListing.set(false);
        this.showToast('Promjene su sačuvane.', 'success');
      },
      error: (err: HttpErrorResponse) => {
        this.savingListing.set(false);
        this.listingError.set(this.applyServerErrors(err, this.listingForm));
        this.focusFirstInvalid();
      },
    });
  }

  /** Creates a new listing for a property that has none. */
  createListing(publish: boolean): void {
    const p = this.property();
    if (!p || this.savingListing() || this.listing()) return;
    if (!this.validateListing()) return;

    const body = this.buildListingRequest();
    this.savingListing.set(true);

    this.listings.create({ propertyId: p.id, ...body, publish }).subscribe({
      next: (res) => {
        const created: PropertyListingSummary = {
          id: res.id,
          ...body,
          currencyCode: this.currencyCode(body.currencyId, ''),
          status: res.status,
          publishedAtUtc: res.status === 'Active' ? new Date().toISOString() : null,
        };
        this.property.update((cur) => cur && { ...cur, currentListing: created });
        this.resetListingForm(created, this.property()!);
        this.savingListing.set(false);
        this.showToast(publish ? 'Oglas je objavljen.' : 'Nacrt oglasa je sačuvan.', 'success');
      },
      error: (err: HttpErrorResponse) => {
        this.savingListing.set(false);
        this.listingError.set(this.applyServerErrors(err, this.listingForm));
        this.focusFirstInvalid();
      },
    });
  }

  private validateListing(): boolean {
    this.listingError.set(null);
    if (this.listingForm.invalid) {
      this.listingForm.markAllAsTouched();
      this.focusFirstInvalid();
      return false;
    }
    return true;
  }

  private buildListingRequest(): ListingUpdateRequest {
    const v = this.listingForm.getRawValue(); // includes disabled controls (locked type, deposit of sales)
    return {
      listingType: v.listingType as ListingKind,
      title: v.title.trim(),
      price: parseDecimal(v.price) as number,
      currencyId: v.currencyId as number,
      deposit: v.listingType === 'Rent' ? toNumberOrNull(v.deposit) : null,
      isNegotiable: v.isNegotiable,
    };
  }

  private patchListing(changes: Partial<PropertyListingSummary>): void {
    this.property.update((cur) => cur && cur.currentListing && { ...cur, currentListing: { ...cur.currentListing, ...changes } });
  }

  private currencyCode(id: number, fallback: string): string {
    return this.currencies().find((c) => c.id === id)?.code ?? fallback;
  }

  // ---------- listing status ----------
  askStatus(action: Exclude<StatusAction, 'publish'>): void {
    this.confirm.set(
      action === 'unpublish'
        ? {
            action,
            title: 'Povući oglas?',
            text: 'Oglas više neće biti vidljiv drugim korisnicima i vraća se u pripremu. Zahtjevi na čekanju bit će odbijeni.',
            label: 'Povuci oglas',
          }
        : {
            action,
            title: 'Zatvoriti oglas?',
            text: 'Zatvoren oglas nije vidljiv drugim korisnicima. Zahtjevi na čekanju bit će odbijeni, a poslije možete napraviti novi oglas.',
            label: 'Zatvori oglas',
          },
    );
  }

  cancelConfirm(): void {
    if (!this.statusBusy()) this.confirm.set(null);
  }

  confirmStatus(): void {
    const c = this.confirm();
    if (c) this.changeStatus(c.action);
  }

  changeStatus(action: StatusAction): void {
    const l = this.listing();
    if (!l || this.statusBusy()) return;

    this.statusBusy.set(true);
    this.listingError.set(null);

    this.listings.changeStatus(l.id, action).subscribe({
      next: (res) => {
        this.statusBusy.set(false);
        this.confirm.set(null);

        if (res.status === 'Closed') {
          // the closed listing disappears from this screen; the tab offers to create a new one
          const p = this.property();
          this.property.update((cur) => cur && { ...cur, currentListing: null });
          if (p) this.resetListingForm(null, p);
          this.showToast('Oglas je zatvoren.', 'success');
          return;
        }

        this.patchListing({
          status: res.status,
          publishedAtUtc: action === 'publish' ? new Date().toISOString() : l.publishedAtUtc,
        });
        this.syncListingState();
        this.showToast(action === 'publish' ? 'Oglas je objavljen.' : 'Oglas je povučen.', 'success');
      },
      error: (err: HttpErrorResponse) => {
        this.statusBusy.set(false);
        this.confirm.set(null);
        this.listingError.set(this.applyServerErrors(err, this.listingForm) ?? 'Promjena statusa nije uspjela.');
      },
    });
  }

  // ---------- shared helpers ----------
  /** Puts backend validation messages under the matching fields; returns text for the rest (or null). */
  private applyServerErrors(err: HttpErrorResponse, form: FormGroup): string | null {
    const fieldErrors = extractFieldErrors(err);
    const unmatched: string[] = [];

    for (const [field, messages] of Object.entries(fieldErrors)) {
      const control = form.get(field);
      if (control) {
        control.setErrors({ server: messages[0] });
        control.markAsTouched();
      } else {
        unmatched.push(...messages);
      }
    }

    if (unmatched.length) return unmatched.join(' ');
    if (Object.keys(fieldErrors).length) return null;

    if (err.status === 0) return 'Server nije dostupan. Pokušajte ponovo.';
    if (err.status === 404) return 'Nekretnina ili oglas više ne postoji.';
    return err.error?.message ?? err.error?.detail ?? 'Snimanje nije uspjelo. Pokušajte ponovo.';
  }

  private focusFirstInvalid(): void {
    setTimeout(() => (this.host.nativeElement.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus());
  }

  private showToast(message: string, kind: 'success' | 'error'): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ text: message, kind });
    this.toastTimer = setTimeout(() => this.toast.set(null), 4000);
  }

  // ---------- display helpers ----------
  media(url: string | null | undefined): string | null {
    return mediaUrl(url);
  }

  hideBroken(event: Event): void {
    (event.target as HTMLElement).style.visibility = 'hidden';
  }

  statusLabel(status: ListingStatus): string {
    return STATUS_LABELS[status];
  }
}