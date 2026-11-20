import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, catchError, debounceTime, of, switchMap, tap } from 'rxjs';
import { extractFieldErrors } from '../../../core/http/api-error';
import { City, CityService } from '../../../core/services/city.service';
import { mediaUrl } from '../../../core/utils/media-url';
import {
  ListingKind,
  PROPERTY_STATUS_LABELS,
  PROPERTY_STATUS_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  PropertyListItem,
  PropertyListQuery,
  PropertySort,
  PropertyStatus,
  PropertySummary,
  PropertyType,
  SORT_OPTIONS,
} from '../property.models';
import { PropertyService } from '../property.service';
import { PropertyDraftService } from '../wizard/property-draft.service';

const PAGE_SIZE = 8;
const VIEW_KEY = 'rentflow.propertiesView';
const CURRENCIES: Record<string, string> = { BAM: 'KM', EUR: 'EUR' };

type ViewMode = 'list' | 'cards';

@Component({
  selector: 'app-my-properties',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './my-properties.component.html',
  styleUrl: './my-properties.component.css',
})
export class MyPropertiesComponent {
  private readonly api = inject(PropertyService);
  private readonly cityService = inject(CityService);
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly draft = inject(PropertyDraftService);

  readonly statusOptions = PROPERTY_STATUS_OPTIONS;
  readonly typeOptions = PROPERTY_TYPE_OPTIONS;
  readonly sortOptions = SORT_OPTIONS;
  readonly cities = signal<City[]>([]);

  readonly items = signal<PropertyListItem[]>([]);
  readonly total = signal(0);
  readonly totalPages = signal(1);
  readonly page = signal(1);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly summary = signal<PropertySummary | null>(null);
  readonly summaryError = signal(false);

  readonly view = signal<ViewMode>(this.readView());
  readonly moreOpen = signal(false);
  readonly activeFilters = signal(0);
  readonly extraFilters = signal(0);
  readonly openMenu = signal<number | null>(null);

  readonly toDelete = signal<PropertyListItem | null>(null);
  readonly deleting = signal(false);
  readonly deleteError = signal<string | null>(null);
  readonly toast = signal<{ text: string; kind: 'success' | 'error' } | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  readonly filters = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    status: new FormControl<PropertyStatus | ''>('', { nonNullable: true }),
    propertyType: new FormControl<PropertyType | ''>('', { nonNullable: true }),
    sort: new FormControl<PropertySort>('Newest', { nonNullable: true }),
    cityId: new FormControl<number | null>(null),
    listingType: new FormControl<ListingKind | ''>('', { nonNullable: true }),
  });

  readonly showEmptyAll = computed(
    () => !this.loading() && !this.error() && this.total() === 0 && this.activeFilters() === 0,
  );
  readonly showNoResults = computed(
    () => !this.loading() && !this.error() && this.total() === 0 && this.activeFilters() > 0,
  );

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
    this.reload$
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(() =>
          this.api.list(this.buildQuery()).pipe(
            catchError((err: HttpErrorResponse) => {
              this.error.set(
                err.status === 0
                  ? 'Server nije dostupan. Provjerite vezu i pokušajte ponovo.'
                  : 'Nekretnine se nisu mogle učitati.',
              );
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((res) => {
        this.loading.set(false);
        if (!res) return;

        if (res.items.length === 0 && this.page() > 1) {
          this.page.set(Math.max(1, res.totalPages));
          this.reload$.next();
          return;
        }

        this.items.set(res.items);
        this.total.set(res.totalCount);
        this.totalPages.set(Math.max(1, res.totalPages));
      });

    this.filters.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.countFilters());
    this.filters.valueChanges.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => {
      this.page.set(1);
      this.reload$.next();
    });

    this.reload$.next();
    this.loadSummary();
    this.cityService.getAll().subscribe({ next: (c) => this.cities.set(c), error: () => {} });
  }

  retry(): void {
    this.reload$.next();
    if (this.summaryError()) this.loadSummary();
  }

  private loadSummary(): void {
    this.summaryError.set(false);
    this.api.summary().subscribe({
      next: (s) => this.summary.set(s),
      error: () => this.summaryError.set(true),
    });
  }

  private buildQuery(): PropertyListQuery {
    const f = this.filters.getRawValue();
    return { ...f, pageNumber: this.page(), pageSize: PAGE_SIZE };
  }

  private countFilters(): void {
    const f = this.filters.getRawValue();
    const extra = (f.cityId !== null ? 1 : 0) + (f.listingType ? 1 : 0);
    this.extraFilters.set(extra);
    this.activeFilters.set((f.search.trim() ? 1 : 0) + (f.status ? 1 : 0) + (f.propertyType ? 1 : 0) + extra);
  }

  clearFilters(): void {
    this.filters.reset({ search: '', status: '', propertyType: '', sort: this.filters.controls.sort.value, cityId: null, listingType: '' });
  }

  goTo(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page()) return;
    this.page.set(page);
    this.openMenu.set(null);
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
      return localStorage.getItem(VIEW_KEY) === 'cards' ? 'cards' : 'list';
    } catch {
      return 'list';
    }
  }

  toggleMenu(id: number): void {
    this.openMenu.update((current) => (current === id ? null : id));
  }

  @HostListener('document:click', ['$event'])
  closeMenuOnOutsideClick(event: MouseEvent): void {
    if (this.openMenu() !== null && !(event.target as HTMLElement).closest('[data-menu]')) {
      this.openMenu.set(null);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.toDelete() && !this.deleting()) this.cancelDelete();
    else this.openMenu.set(null);
  }

  askDelete(item: PropertyListItem): void {
    this.openMenu.set(null);
    this.deleteError.set(null);
    this.toDelete.set(item);
    setTimeout(() => (this.host.nativeElement.querySelector('#delete-cancel') as HTMLElement | null)?.focus());
  }

  cancelDelete(): void {
    if (!this.deleting()) this.toDelete.set(null);
  }

  confirmDelete(): void {
    const item = this.toDelete();
    if (!item || this.deleting()) return;

    this.deleting.set(true);
    this.deleteError.set(null);
    this.api.delete(item.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.toDelete.set(null);
        this.showToast('Nekretnina je obrisana.', 'success');
        this.reload$.next();
        this.loadSummary();
      },
      error: (err: HttpErrorResponse) => {
        this.deleting.set(false);
        this.deleteError.set(this.errorMessage(err));
      },
    });
  }

  private errorMessage(err: HttpErrorResponse): string {
    if (err.status === 0) return 'Server nije dostupan. Pokušajte ponovo.';
    if (err.status === 404) return 'Nekretnina više ne postoji.';
    const fieldMessages = Object.values(extractFieldErrors(err)).flat();
    return fieldMessages[0] ?? err.error?.message ?? err.error?.detail ?? 'Brisanje nije uspjelo. Pokušajte ponovo.';
  }

  private showToast(text: string, kind: 'success' | 'error'): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ text, kind });
    this.toastTimer = setTimeout(() => this.toast.set(null), 4000);
  }

  image(item: PropertyListItem): string | null {
    const url = mediaUrl(item.mainImageUrl);
    return url ? `url("${url}")` : null;
  }

  typeLabel(type: PropertyType): string {
    return PROPERTY_TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type;
  }

  statusLabel(status: PropertyStatus): string {
    return PROPERTY_STATUS_LABELS[status];
  }

  price(item: PropertyListItem): string | null {
    if (item.price === null) return null;
    const n = item.price.toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${n} ${CURRENCIES[item.currencyCode ?? ''] ?? item.currencyCode ?? ''}`.trim();
  }

  initials(name: string | null): string {
    if (!name) return '';
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join('');
  }

  count(value: number | undefined): string {
    return this.summaryError() ? '–' : value === undefined ? '…' : String(value);
  }
}