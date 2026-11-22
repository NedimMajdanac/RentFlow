import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, catchError, debounceTime, of, switchMap, tap } from 'rxjs';
import { extractFieldErrors } from '../../../core/http/api-error';
import { Amenity, AmenityService } from '../../../core/services/amenity.service';
import { City, CityService } from '../../../core/services/city.service';
import { Currency, CurrencyService } from '../../../core/services/currency.service';
import { mediaUrl } from '../../../core/utils/media-url';
import { LISTING_KIND_OPTIONS, ListingKind, PROPERTY_TYPE_OPTIONS, PropertyType } from '../../properties/property.models';
import { BrowseListing, BrowseQuery, LISTING_SORT_OPTIONS, ListingSort } from '../listing.models';
import { ListingService } from '../services/listing.service';

const PAGE_SIZE = 12;
const VIEW_KEY = 'rentflow.listingsView';
const FALLBACK_GRADIENT = 'linear-gradient(135deg, #b9cdf3, #5b7fc7)';
const CURRENCY_LABELS: Record<string, string> = { BAM: 'KM', EUR: 'EUR' };
const KIND_LABELS: Record<ListingKind, string> = { Rent: 'Iznajmljivanje', Sale: 'Prodaja' };

type ViewMode = 'cards' | 'list';

/** "" -> null, invalid -> NaN, otherwise a number (comma is accepted as the decimal separator). */
function parseAmount(value: string): number | null {
  const t = String(value ?? '').trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

const toQueryNumber = (value: string): number | null => {
  const n = parseAmount(value);
  return n === null || Number.isNaN(n) ? null : n;
};

/** Optional, non-negative number. */
function optionalAmount(c: AbstractControl): ValidationErrors | null {
  const n = parseAmount(c.value);
  if (n === null) return null;
  return Number.isNaN(n) || n < 0 ? { number: true } : null;
}

/** "From" must not be greater than "to" (price and area). */
const rangeValidator: ValidatorFn = (g: AbstractControl): ValidationErrors | null => {
  const errors: ValidationErrors = {};
  const check = (from: string, to: string, key: string) => {
    const lo = parseAmount(g.get(from)?.value ?? '');
    const hi = parseAmount(g.get(to)?.value ?? '');
    if (lo !== null && hi !== null && !Number.isNaN(lo) && !Number.isNaN(hi) && hi < lo) errors[key] = true;
  };
  check('minPrice', 'maxPrice', 'priceRange');
  check('minArea', 'maxArea', 'areaRange');
  return Object.keys(errors).length ? errors : null;
};

@Component({
  selector: 'app-browse-listings',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './browse-listings.component.html',
  styleUrl: './browse-listings.component.css',
})
export class BrowseListingsComponent {
  private readonly api = inject(ListingService);
  private readonly cityService = inject(CityService);
  private readonly currencyService = inject(CurrencyService);
  private readonly amenityService = inject(AmenityService);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly kindOptions = LISTING_KIND_OPTIONS;
  readonly typeOptions = PROPERTY_TYPE_OPTIONS;
  readonly sortOptions = LISTING_SORT_OPTIONS;
  readonly roomOptions = [1, 2, 3, 4, 5];

  readonly cities = signal<City[]>([]);
  readonly currencies = signal<Currency[]>([]);
  readonly amenities = signal<Amenity[]>([]);
  private defaultCurrencyId: number | null = null;

  // ---------- data ----------
  readonly items = signal<BrowseListing[]>([]);
  readonly total = signal(0);
  readonly totalPages = signal(1);
  readonly page = signal(1);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  // ---------- view ----------
  readonly view = signal<ViewMode>(this.readView());
  readonly moreOpen = signal(false);
  readonly activeFilters = signal(0);
  readonly extraFilters = signal(0);
  /** True when a price filter or price sort is active, so listings are compared in one currency. */
  readonly usesCurrency = signal(false);

  // ---------- favorites and notifications ----------
  readonly favBusy = signal<number[]>([]);
  readonly toast = signal<{ text: string; kind: 'success' | 'error' } | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  readonly filters = new FormGroup(
    {
      search: new FormControl('', { nonNullable: true }),
      listingType: new FormControl<ListingKind | ''>('', { nonNullable: true }),
      propertyType: new FormControl<PropertyType | ''>('', { nonNullable: true }),
      sort: new FormControl<ListingSort>('Newest', { nonNullable: true }),
      cityId: new FormControl<number | null>(null),
      currencyId: new FormControl<number | null>(null),
      minPrice: new FormControl('', { nonNullable: true, validators: [optionalAmount] }),
      maxPrice: new FormControl('', { nonNullable: true, validators: [optionalAmount] }),
      minRooms: new FormControl<number | null>(null),
      minArea: new FormControl('', { nonNullable: true, validators: [optionalAmount] }),
      maxArea: new FormControl('', { nonNullable: true, validators: [optionalAmount] }),
      amenityIds: new FormControl<number[]>([], { nonNullable: true }),
    },
    { validators: [rangeValidator] },
  );

  readonly showEmptyAll = computed(
    () => !this.loading() && !this.error() && this.total() === 0 && this.activeFilters() === 0,
  );
  readonly showNoResults = computed(
    () => !this.loading() && !this.error() && this.total() === 0 && this.activeFilters() > 0,
  );

  /** Page numbers with ellipses for big result sets: 1 … 4 5 6 … 20 */
  readonly pageItems = computed<(number | '…')[]>(() => {
    const total = this.totalPages();
    const current = this.page();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const items: (number | '…')[] = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    if (start > 2) items.push('…');
    for (let i = start; i <= end; i++) items.push(i);
    if (end < total - 1) items.push('…');
    items.push(total);
    return items;
  });

  private readonly reload$ = new Subject<void>();

  constructor() {
    // Each new request cancels the previous one, so a slow response cannot overwrite a newer one.
    this.reload$
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(() =>
          this.api.browse(this.buildQuery()).pipe(
            catchError((err: HttpErrorResponse) => {
              this.error.set(this.loadErrorMessage(err));
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((res) => {
        this.loading.set(false);
        if (!res) return;

        // The last item of the last page disappeared (e.g. unpublished meanwhile): go to the last existing page.
        if (res.items.length === 0 && this.page() > 1) {
          this.page.set(Math.max(1, res.totalPages));
          this.reload$.next();
          return;
        }

        this.items.set(res.items);
        this.total.set(res.totalCount);
        this.totalPages.set(Math.max(1, res.totalPages));
      });

    // The filter counter updates immediately, the request waits for a pause in typing.
    this.filters.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.countFilters());
    this.filters.valueChanges.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => {
      if (this.filters.invalid) return; // invalid ranges are explained under the fields, no request is sent
      this.page.set(1);
      this.reload$.next();
    });

    this.countFilters();
    this.reload$.next();
    this.loadLookups();
  }

  // ---------- loading ----------
  retry(): void {
    this.reload$.next();
  }

  private loadLookups(): void {
    this.cityService.getAll().subscribe({ next: (c) => this.cities.set(c), error: () => {} });
    this.amenityService.getAll().subscribe({ next: (a) => this.amenities.set(a), error: () => {} });

    this.currencyService.getAll().subscribe({
      next: (list) => {
        this.currencies.set(list);
        this.defaultCurrencyId = (list.find((c) => c.code === 'BAM') ?? list[0])?.id ?? null;

        const control = this.filters.controls.currencyId;
        if (control.value === null && this.defaultCurrencyId !== null) {
          control.setValue(this.defaultCurrencyId, { emitEvent: false });
          // A price sort or filter was already chosen before currencies arrived: reload with the currency.
          if (this.usesCurrency()) this.reload$.next();
        }
      },
      error: () => {},
    });
  }

  private buildQuery(): BrowseQuery {
    const f = this.filters.getRawValue();
    return {
      search: f.search.trim(),
      listingType: f.listingType,
      propertyType: f.propertyType,
      cityId: f.cityId,
      // The backend requires a currency for price filtering and sorting; otherwise all currencies are shown.
      currencyId: this.usesCurrency() ? f.currencyId : null,
      minPrice: toQueryNumber(f.minPrice),
      maxPrice: toQueryNumber(f.maxPrice),
      minRooms: f.minRooms,
      minAreaM2: toQueryNumber(f.minArea),
      maxAreaM2: toQueryNumber(f.maxArea),
      amenityIds: f.amenityIds,
      sort: f.sort,
      pageNumber: this.page(),
      pageSize: PAGE_SIZE,
    };
  }

  private countFilters(): void {
    const f = this.filters.getRawValue();
    const hasPrice = !!(f.minPrice.trim() || f.maxPrice.trim());
    const hasArea = !!(f.minArea.trim() || f.maxArea.trim());

    const extra =
      (f.cityId !== null ? 1 : 0) +
      (hasPrice ? 1 : 0) +
      (f.minRooms !== null ? 1 : 0) +
      (hasArea ? 1 : 0) +
      (f.amenityIds.length ? 1 : 0);

    this.extraFilters.set(extra);
    this.activeFilters.set((f.search.trim() ? 1 : 0) + (f.listingType ? 1 : 0) + (f.propertyType ? 1 : 0) + extra);
    this.usesCurrency.set(hasPrice || f.sort !== 'Newest');
  }

  clearFilters(): void {
    // The sort order is kept; everything else goes back to the defaults.
    this.filters.reset({
      search: '',
      listingType: '',
      propertyType: '',
      sort: this.filters.controls.sort.value,
      cityId: null,
      currencyId: this.defaultCurrencyId,
      minPrice: '',
      maxPrice: '',
      minRooms: null,
      minArea: '',
      maxArea: '',
      amenityIds: [],
    });
  }

  // ---------- filter helpers ----------
  amountError(name: 'minPrice' | 'maxPrice' | 'minArea' | 'maxArea'): boolean {
    const c = this.filters.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  rangeError(key: 'priceRange' | 'areaRange'): boolean {
    return !!this.filters.errors?.[key];
  }

  currencyCode(): string {
    const id = this.filters.controls.currencyId.value;
    return this.currencies().find((c) => c.id === id)?.code ?? '';
  }

  isAmenityOn(id: number): boolean {
    return this.filters.controls.amenityIds.value.includes(id);
  }

  toggleAmenity(id: number): void {
    const control = this.filters.controls.amenityIds;
    const ids = control.value;
    control.setValue(ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]);
  }

  // ---------- paging and view ----------
  goTo(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page()) return;
    this.page.set(page);
    this.reload$.next();
    this.host.nativeElement.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  setView(mode: ViewMode): void {
    this.view.set(mode);
    try {
      localStorage.setItem(VIEW_KEY, mode);
    } catch {}
  }

  private readView(): ViewMode {
    try {
      return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'cards';
    } catch {
      return 'cards';
    }
  }

  // ---------- favorites ----------
  isBusy(id: number): boolean {
    return this.favBusy().includes(id);
  }

  /** Optimistic update: the heart flips at once and is rolled back if the server call fails. */
  toggleFavorite(item: BrowseListing): void {
    if (this.isBusy(item.id)) return;

    const next = !item.isFavorite;
    this.setFavorite(item.id, next);
    this.favBusy.update((list) => [...list, item.id]);

    const call$ = next ? this.api.addFavorite(item.id) : this.api.removeFavorite(item.id);
    call$.subscribe({
      next: () => this.favBusy.update((list) => list.filter((i) => i !== item.id)),
      error: (err: HttpErrorResponse) => {
        this.setFavorite(item.id, !next);
        this.favBusy.update((list) => list.filter((i) => i !== item.id));

        if (err.status === 404) {
          // The listing is no longer public: refresh the list.
          this.showToast('Oglas više nije dostupan.', 'error');
          this.reload$.next();
        } else {
          this.showToast('Promjena nije sačuvana. Pokušajte ponovo.', 'error');
        }
      },
    });
  }

  private setFavorite(id: number, value: boolean): void {
    this.items.update((list) => list.map((i) => (i.id === id ? { ...i, isFavorite: value } : i)));
  }

  private showToast(text: string, kind: 'success' | 'error'): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ text, kind });
    this.toastTimer = setTimeout(() => this.toast.set(null), 4000);
  }

  private loadErrorMessage(err: HttpErrorResponse): string {
    if (err.status === 0) return 'Server nije dostupan. Provjerite vezu i pokušajte ponovo.';
    const messages = Object.values(extractFieldErrors(err)).flat();
    return messages[0] ?? 'Oglasi se nisu mogli učitati.';
  }

  // ---------- display helpers ----------
  image(item: { mainImageUrl: string | null }): string | null {
    const url = mediaUrl(item.mainImageUrl);
    // The gradient sits behind the photo, so a missing file still shows a neat placeholder.
    return url ? `url("${url}"), ${FALLBACK_GRADIENT}` : null;
  }

  typeLabel(type: PropertyType): string {
    return PROPERTY_TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type;
  }

  kindLabel(kind: ListingKind): string {
    return KIND_LABELS[kind];
  }

  price(item: BrowseListing): string {
    const n = item.price.toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${n} ${CURRENCY_LABELS[item.currencyCode] ?? item.currencyCode}`;
  }
}