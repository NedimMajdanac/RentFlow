import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, HostListener, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import * as L from 'leaflet';
import { Subject, catchError, map, of, switchMap, tap } from 'rxjs';
import { mediaUrl } from '../../../core/utils/media-url';
import { IconComponent, amenityIconName } from '../../../shared/ui/icon.component';
import {
  CONDITION_OPTIONS,
  FURNISHED_OPTIONS,
  HEATING_OPTIONS,
  LISTING_KIND_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  PropertyType,
  ListingKind,
} from '../../properties/property.models';
import { ListingDetails, ListingStatus } from '../listing.models';
import { ListingService } from '../services/listing.service';
import { SendRequestDialogComponent } from '../../requests/send/send-request-dialog.component';
import { CreateRequestResult } from '../../requests/request.models';

const FALLBACK_GRADIENT = 'linear-gradient(135deg, #b9cdf3, #5b7fc7)';
const CURRENCY_LABELS: Record<string, string> = { BAM: 'KM', EUR: 'EUR' };
const KIND_LABELS: Record<ListingKind, string> = { Rent: 'Iznajmljivanje', Sale: 'Prodaja' };
const STATUS_LABELS: Record<ListingStatus, string> = {
  Draft: 'U pripremi',
  Active: 'Aktivan',
  Reserved: 'Rezervisano',
  Rented: 'Iznajmljeno',
  Sold: 'Prodano',
  Closed: 'Zatvoreno',
};
const EMPTY = '/'; // shown for values the owner did not enter

const PIN_HTML =
  '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">' +
  '<path d="M17 0C7.6 0 0 7.4 0 16.6 0 29 17 44 17 44s17-15 17-27.4C34 7.4 26.4 0 17 0z" fill="#2158d8"/>' +
  '<circle cx="17" cy="16.5" r="6.5" fill="#fff"/></svg>';

interface Fact { icon: string; label: string; value: string; }
interface Row { label: string; value: string; }

@Component({
  selector: 'app-listing-details',
  standalone: true,
  imports: [RouterLink, IconComponent, SendRequestDialogComponent],
  templateUrl: './listing-details.component.html',
  styleUrl: './listing-details.component.css',
})
export class ListingDetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ListingService);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly listing = signal<ListingDetails | null>(null);
  readonly loading = signal(true);
  readonly error = signal<'notFound' | 'failed' | null>(null);

  // ---------- lightbox ----------
  readonly lightboxIndex = signal<number | null>(null);
  private opener: HTMLElement | null = null;

  private map: L.Map | null = null;
  private currentId = 0;
  private readonly load$ = new Subject<number>();

  @ViewChild('scroller') private scroller?: ElementRef<HTMLElement>;

  /** The map element only exists when the listing has coordinates; the setter creates and destroys the map with it. */
  @ViewChild('mapEl')
  set mapEl(ref: ElementRef<HTMLDivElement> | undefined) {
    if (!ref) {
      this.destroyMap();
      return;
    }
    this.initMap(ref.nativeElement);
  }

  // ---------- derived data ----------
  /** Main photo first, then by the owner's order. */
  readonly images = computed(() => {
    const l = this.listing();
    if (!l) return [];
    return [...l.property.images].sort((a, b) => Number(b.isMain) - Number(a.isMain) || a.sortOrder - b.sortOrder);
  });
  readonly gallerySide = computed(() => this.images().slice(1, 3));
  readonly extraPhotos = computed(() => Math.max(0, this.images().length - 3));
  readonly lightboxImage = computed(() => {
    const i = this.lightboxIndex();
    return i === null ? null : (this.images()[i] ?? null);
  });

  readonly facts = computed<Fact[]>(() => {
    const p = this.listing()?.property;
    if (!p) return [];

    const facts: Fact[] = [{ icon: 'area', label: 'Broj kvadrata', value: `${this.num(p.areaM2)} m²` }];
    if (p.rooms !== null) facts.push({ icon: 'rooms', label: 'Broj soba', value: String(p.rooms) });
    if (p.floor !== null) facts.push({ icon: 'floor', label: 'Sprat', value: this.floorLabel(p.floor) });
    if (p.bathrooms !== null) facts.push({ icon: 'bath', label: 'Broj kupatila', value: String(p.bathrooms) });
    return facts;
  });

  readonly specsLeft = computed<Row[]>(() => {
    const l = this.listing();
    if (!l) return [];
    const p = l.property;
    return [
      { label: 'Tip nekretnine', value: this.typeLabel(p.propertyType) },
      { label: 'Vrsta ponude', value: KIND_LABELS[l.listingType] },
      { label: 'Površina', value: `${this.num(p.areaM2)} m²` },
      { label: 'Broj soba', value: p.rooms !== null ? String(p.rooms) : EMPTY },
      { label: 'Broj kupatila', value: p.bathrooms !== null ? String(p.bathrooms) : EMPTY },
      { label: 'Sprat', value: p.floor !== null ? this.floorLabel(p.floor) : EMPTY },
    ];
  });

  readonly specsRight = computed<Row[]>(() => {
    const p = this.listing()?.property;
    if (!p) return [];
    return [
      { label: 'Ukupno spratova', value: p.totalFloors !== null ? String(p.totalFloors) : EMPTY },
      { label: 'Godina izgradnje', value: p.yearBuilt !== null ? String(p.yearBuilt) : EMPTY },
      { label: 'Stanje', value: CONDITION_OPTIONS.find((o) => o.value === p.condition)?.label ?? EMPTY },
      { label: 'Namještenost', value: FURNISHED_OPTIONS.find((o) => o.value === p.furnishedStatus)?.label ?? EMPTY },
      { label: 'Grijanje', value: HEATING_OPTIONS.find((o) => o.value === p.heatingType)?.label ?? EMPTY },
      { label: 'Površina zemljišta', value: p.plotAreaM2 !== null ? `${this.num(p.plotAreaM2)} m²` : EMPTY },
    ];
  });

  readonly amenities = computed(
    () => this.listing()?.property.amenities.map((a) => ({ ...a, icon: amenityIconName(a.name) })) ?? [],
  );

  readonly hasCoordinates = computed(() => {
    const p = this.listing()?.property;
    return !!p && p.latitude !== null && p.longitude !== null;
  });

  readonly initials = computed(() => {
    const name = this.listing()?.owner.name ?? '';
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('');
  });
  readonly ownerAvatar = computed(() => mediaUrl(this.listing()?.owner.profileImageUrl));
  readonly memberSince = computed(() => {
    const d = new Date(this.listing()?.owner.memberSinceUtc ?? '');
    return Number.isNaN(d.getTime()) ? '' : `Član od ${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  });

  constructor() {
    // Each load cancels the previous one, so a slow response cannot overwrite a newer one.
    this.load$
      .pipe(
        tap(() => {
          this.listing.set(null); // also removes the map element, which destroys the map
          this.error.set(null);
          this.loading.set(true);
          this.closeLightbox();
          this.requestOpen.set(false);
        }),
        switchMap((id) => {
          if (!Number.isInteger(id) || id <= 0) {
            this.error.set('notFound');
            return of(null);
          }
          return this.api.getById(id).pipe(
            catchError((err: HttpErrorResponse) => {
              // 404 also covers drafts and closed listings of other users: their existence is not revealed.
              this.error.set(err.status === 404 ? 'notFound' : 'failed');
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((res) => {
        this.loading.set(false);
        if (res) {
            this.listing.set(res);
            this.trackView(res);
        }
        this.document.defaultView?.scrollTo({ top: 0 });
      });

    // Listing cards at the bottom link to /listings/:id, which reuses this component, so react to param changes.
    this.route.paramMap
      .pipe(
        map((p) => Number(p.get('id'))),
        takeUntilDestroyed(),
      )
      .subscribe((id) => {
        this.currentId = id;
        this.load$.next(id);
      });

    inject(DestroyRef).onDestroy(() => {
      this.destroyMap();
      this.unlockScroll();
    });
  }

  retry(): void {
    this.load$.next(this.currentId);
  }

  // ---------- lightbox ----------
  openLightbox(index: number, event?: Event): void {
    this.opener = (event?.currentTarget as HTMLElement | undefined) ?? null;
    this.lightboxIndex.set(index);
    this.document.body.style.overflow = 'hidden';
    setTimeout(() => (this.host.nativeElement.querySelector('#lb-close') as HTMLElement | null)?.focus());
  }

  closeLightbox(): void {
    if (this.lightboxIndex() === null) return;
    this.lightboxIndex.set(null);
    this.unlockScroll();
    this.opener?.focus();
    this.opener = null;
  }

  step(direction: -1 | 1): void {
    const total = this.images().length;
    const current = this.lightboxIndex();
    if (current === null || total === 0) return;
    this.lightboxIndex.set((current + direction + total) % total);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.lightboxIndex() === null) return;
    if (event.key === 'Escape') this.closeLightbox();
    else if (event.key === 'ArrowLeft') this.step(-1);
    else if (event.key === 'ArrowRight') this.step(1);
  }

  private unlockScroll(): void {
    this.document.body.style.overflow = '';
  }

  // ---------- map ----------
  private initMap(el: HTMLDivElement): void {
    if (this.map && this.map.getContainer() === el) return;
    this.destroyMap();

    const p = this.listing()?.property;
    if (!p || p.latitude === null || p.longitude === null) return;

    const center: L.LatLngTuple = [p.latitude, p.longitude];
    // Wheel zoom is off so the map does not hijack page scrolling; the zoom buttons still work.
    this.map = L.map(el, { center, zoom: 15, scrollWheelZoom: false });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    L.marker(center, {
      keyboard: false,
      icon: L.divIcon({ html: PIN_HTML, className: '', iconSize: [34, 44], iconAnchor: [17, 44] }),
    }).addTo(this.map);

    // The container gets its final size only after the first render.
    setTimeout(() => this.map?.invalidateSize());
  }

  private destroyMap(): void {
    this.map?.remove();
    this.map = null;
  }

  // ---------- other listings carousel ----------
  scrollOthers(): void {
    const el = this.scroller?.nativeElement;
    if (!el) return;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + el.clientWidth * 0.8, behavior: 'smooth' });
  }

  // ---------- display helpers ----------
  media(url: string | null | undefined): string | null {
    return mediaUrl(url);
  }

  /** Cards use a background image with a gradient behind it, so a missing file still looks neat. */
  cardImage(url: string | null): string {
    const full = mediaUrl(url);
    return full ? `url("${full}"), ${FALLBACK_GRADIENT}` : FALLBACK_GRADIENT;
  }

  hideBroken(event: Event): void {
    (event.target as HTMLElement).style.visibility = 'hidden';
  }

  typeLabel(type: PropertyType): string {
    return PROPERTY_TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type;
  }

  kindLabel(kind: ListingKind): string {
    return KIND_LABELS[kind];
  }

  statusLabel(status: ListingStatus): string {
    return STATUS_LABELS[status];
  }

  price(amount: number, currencyCode: string): string {
    const n = amount.toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${n} ${CURRENCY_LABELS[currencyCode] ?? currencyCode}`;
  }

  private num(value: number): string {
    return value.toLocaleString('bs-BA', { maximumFractionDigits: 2 });
  }

  private floorLabel(floor: number): string {
    if (floor < 0) return 'Suteren';
    if (floor === 0) return 'Prizemlje';
    return `${floor}. sprat`;
    }
    /** Fire-and-forget: a failed or ignored count must never affect the page. */
    private trackView(l: ListingDetails): void {
        if (l.isOwner || (l.status !== 'Active' && l.status !== 'Reserved')) return;
        this.api.recordView(l.id).subscribe({ error: () => {} });
  }
  // ---------- request dialog ----------
readonly requestOpen = signal(false);

/** What the button in the owner card does: open the form, link to my requests, or stay disabled. */
readonly cta = computed<'open' | 'sent' | 'unavailable'>(() => {
  const l = this.listing();
  if (!l) return 'unavailable';
  if (l.myActiveRequestId) return 'sent';
  return l.status === 'Active' ? 'open' : 'unavailable';
});

readonly ctaNote = computed(() =>
  this.listing()?.status === 'Reserved'
    ? 'Oglas je trenutno rezervisan i ne prima nove zahtjeve.'
    : 'Oglas trenutno nije dostupan za zahtjeve.',
);

onRequestSent(result: CreateRequestResult): void {
  this.listing.update((l) => l && { ...l, myActiveRequestId: result.id });
}

/** Silent reload (keeps the page and the open dialog) after the server said the listing changed. */
refreshListing(): void {
  this.api.getById(this.currentId).subscribe({ next: (l) => this.listing.set(l), error: () => {} });
}
}