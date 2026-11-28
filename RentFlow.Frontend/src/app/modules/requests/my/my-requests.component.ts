import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, catchError, of, switchMap, tap } from 'rxjs';
import { extractFieldErrors } from '../../../core/http/api-error';
import { mediaUrl } from '../../../core/utils/media-url';
import { daysBetween, formatDateOnly, formatTimestamp } from '../../../core/utils/date-utils';
import { LISTING_KIND_OPTIONS, ListingKind, PROPERTY_TYPE_OPTIONS, PropertyType } from '../../properties/property.models';
import {
  MyRequest,
  REQUEST_STATUS_HINTS,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_OPTIONS,
  RequestStatus,
} from '../request.models';
import { RequestService } from '../services/request.service';

const PAGE_SIZE = 10;
const FALLBACK_GRADIENT = 'linear-gradient(135deg, #b9cdf3, #5b7fc7)';
const CURRENCY_LABELS: Record<string, string> = { BAM: 'KM', EUR: 'EUR' };
const KIND_LABELS: Record<ListingKind, string> = { Rent: 'Iznajmljivanje', Sale: 'Prodaja' };

@Component({
  selector: 'app-my-requests',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './my-requests.component.html',
  styleUrl: './my-requests.component.css',
})
export class MyRequestsComponent {
  private readonly api = inject(RequestService);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly statusOptions = REQUEST_STATUS_OPTIONS;
  readonly kindOptions = LISTING_KIND_OPTIONS;

  readonly items = signal<MyRequest[]>([]);
  readonly total = signal(0);
  readonly totalPages = signal(1);
  readonly page = signal(1);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly expanded = signal<number[]>([]);

  readonly filters = new FormGroup({
    status: new FormControl<RequestStatus | ''>('', { nonNullable: true }),
    listingType: new FormControl<ListingKind | ''>('', { nonNullable: true }),
  });
  readonly activeFilters = signal(0);

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
          this.api
            .mine({ ...this.filters.getRawValue(), pageNumber: this.page(), pageSize: PAGE_SIZE })
            .pipe(
              catchError((err: HttpErrorResponse) => {
                this.error.set(this.errorMessage(err));
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

    this.filters.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      const f = this.filters.getRawValue();
      this.activeFilters.set((f.status ? 1 : 0) + (f.listingType ? 1 : 0));
      this.page.set(1);
      this.reload$.next();
    });

    this.reload$.next();
  }

  retry(): void {
    this.reload$.next();
  }

  clearFilters(): void {
    this.filters.reset({ status: '', listingType: '' });
  }

  goTo(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page()) return;
    this.page.set(page);
    this.reload$.next();
    this.host.nativeElement.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  isExpanded(id: number): boolean {
    return this.expanded().includes(id);
  }

  toggle(id: number): void {
    this.expanded.update((list) => (list.includes(id) ? list.filter((i) => i !== id) : [...list, id]));
  }

  private errorMessage(err: HttpErrorResponse): string {
    if (err.status === 0) return 'Server nije dostupan. Provjerite vezu i pokušajte ponovo.';
    return Object.values(extractFieldErrors(err)).flat()[0] ?? 'Zahtjevi se nisu mogli učitati.';
  }

  image(r: MyRequest): string {
    const url = mediaUrl(r.listing.mainImageUrl);
    return url ? `url("${url}"), ${FALLBACK_GRADIENT}` : FALLBACK_GRADIENT;
  }

  isPublic(r: MyRequest): boolean {
    return r.listing.status === 'Active' || r.listing.status === 'Reserved';
  }

  statusLabel(status: RequestStatus): string {
    return REQUEST_STATUS_LABELS[status];
  }

  statusHint(status: RequestStatus): string {
    return REQUEST_STATUS_HINTS[status];
  }

  kindLabel(kind: ListingKind): string {
    return KIND_LABELS[kind];
  }

  typeLabel(type: PropertyType): string {
    return PROPERTY_TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type;
  }

  price(r: MyRequest): string {
    const n = r.listing.price.toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${n} ${CURRENCY_LABELS[r.listing.currencyCode] ?? r.listing.currencyCode}`;
  }

  submitted(r: MyRequest): string {
    return formatTimestamp(r.createdAtUtc);
  }

  answered(r: MyRequest): string {
    return r.respondedAtUtc ? formatTimestamp(r.respondedAtUtc) : '';
  }

  period(r: MyRequest): string {
    if (!r.desiredStartDate || !r.desiredEndDate) return '';
    const days = daysBetween(r.desiredStartDate, r.desiredEndDate);
    return `${formatDateOnly(r.desiredStartDate)} – ${formatDateOnly(r.desiredEndDate)} (${days} ${days % 10 === 1 && days % 100 !== 11 ? 'dan' : 'dana'})`;
  }
}