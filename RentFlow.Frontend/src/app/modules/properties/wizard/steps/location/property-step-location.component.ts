import { Component, DestroyRef, ElementRef, ViewChild, afterNextRender, inject, signal } from '@angular/core';
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
import * as L from 'leaflet';
import { Subject, debounceTime } from 'rxjs';
import { City, CityService } from '../../../../../core/services/city.service';
import { GeocodingService } from '../../../../../core/services/geocoding.service';
import { PropertyDraftService } from '../../property-draft.service';
import { WIZARD_BASE, WIZARD_STEPS } from '../../property-wizard.config';
import { WizardStepComponent } from '../../shared/wizard-step.component';

const BIH_CENTER: L.LatLngTuple = [43.9159, 17.6791];

const PIN_HTML =
  '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">' +
  '<path d="M17 0C7.6 0 0 7.4 0 16.6 0 29 17 44 17 44s17-15 17-27.4C34 7.4 26.4 0 17 0z" fill="#2158d8"/>' +
  '<circle cx="17" cy="16.5" r="6.5" fill="#fff"/></svg>';

type BusyKind = 'reverse' | 'forward' | 'city';

function notBlank(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim() ? null : { required: true };
}

function parseCoord(value: string): number | null {
  const t = String(value ?? '').trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

const coordinatesValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const lat = parseCoord(group.get('latitude')?.value);
  const lng = parseCoord(group.get('longitude')?.value);

  if (lat === null && lng === null) return null;
  if (lat === null || lng === null) return { coordsPair: true };
  if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { coordsInvalid: true };
  }
  return null;
};

function toDraftNumber(value: string): number | null {
  const n = parseCoord(value);
  return n === null || Number.isNaN(n) ? null : n;
}

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim()
    .replace(/^(grad|opcina|opstina)\s+/, '');
}

@Component({
  selector: 'app-property-step-location',
  standalone: true,
  imports: [ReactiveFormsModule, WizardStepComponent],
  templateUrl: './property-step-location.component.html',
  styleUrls: ['../../shared/wizard-form.css', './property-step-location.component.css'],
})
export class PropertyStepLocationComponent {
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly draft = inject(PropertyDraftService);
  private readonly cityService = inject(CityService);
  private readonly geo = inject(GeocodingService);

  @ViewChild('mapEl', { static: true }) private mapEl!: ElementRef<HTMLDivElement>;

  readonly cities = signal<City[]>([]);
  readonly citiesError = signal(false);
  readonly busy = signal<BusyKind | null>(null);
  readonly hasMarker = signal(false);
  readonly note = signal<{ text: string; kind: 'info' | 'warn' } | null>(null);

  readonly coordsTyped$ = new Subject<void>();

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;
  private abort: AbortController | null = null;
  private requestId = 0;

  readonly form = new FormGroup(
    {
      cityId: new FormControl<number | null>(this.draft.draft().cityId, { validators: [Validators.required] }),
      address: new FormControl(this.draft.draft().address, {
        nonNullable: true,
        validators: [notBlank, Validators.maxLength(200)],
      }),
      latitude: new FormControl(this.draft.draft().latitude?.toString() ?? '', { nonNullable: true }),
      longitude: new FormControl(this.draft.draft().longitude?.toString() ?? '', { nonNullable: true }),
    },
    { validators: [coordinatesValidator] },
  );

  constructor() {
    this.loadCities();

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.saveDraft();
      if (this.form.invalid) this.draft.unmarkCompleted(1);
    });

    this.coordsTyped$.pipe(debounceTime(500), takeUntilDestroyed()).subscribe(() => this.syncMarkerFromInputs());

    afterNextRender(() => this.initMap());

    inject(DestroyRef).onDestroy(() => {
      this.abort?.abort();
      this.map?.remove();
      this.map = null;
    });
  }

  fieldError(name: 'cityId' | 'address'): string | null {
    const c = this.form.controls[name];
    if (!c.errors || !(c.touched || c.dirty)) return null;
    if (c.errors['required']) return name === 'cityId' ? 'Odaberite grad.' : 'Unesite adresu nekretnine.';
    if (c.errors['maxlength']) return `Najviše ${c.errors['maxlength'].requiredLength} znakova.`;
    return 'Neispravna vrijednost.';
  }

  coordsError(): string | null {
    const { latitude, longitude } = this.form.controls;
    const touched = latitude.touched || latitude.dirty || longitude.touched || longitude.dirty;
    if (!touched || !this.form.errors) return null;
    if (this.form.errors['coordsPair']) return 'Unesite i geografsku širinu i geografsku dužinu.';
    if (this.form.errors['coordsInvalid']) {
      return 'Koordinate nisu ispravne (širina od −90 do 90, dužina od −180 do 180).';
    }
    return null;
  }

  async locate(event?: Event): Promise<void> {
    event?.preventDefault(); 
    const cityName = this.selectedCityName();
    const address = this.form.controls.address.value.trim();

    if (!cityName || !address) {
      this.form.controls.cityId.markAsTouched();
      this.form.controls.address.markAsTouched();
      return;
    }

    const { id, signal } = this.begin('forward');
    try {
      const result = await this.geo.search(`${address}, ${cityName}, Bosna i Hercegovina`, signal);
      if (id !== this.requestId) return;

      if (!result) {
        this.note.set({
          text: 'Adresa nije pronađena na mapi. Provjerite unos ili kliknite na mapu.',
          kind: 'warn',
        });
        return;
      }

      this.placeMarker(result.lat, result.lng, result.hasHouseNumber ? 18 : 16);
      this.setCoords(result.lat, result.lng);
      this.note.set({ text: 'Provjerite stoji li oznaka na pravom mjestu. Možete je povući.', kind: 'info' });
    } catch (e) {
      this.handleLookupError(e, id);
    } finally {
      this.finish(id);
    }
  }

  async onCityChanged(): Promise<void> {
    const name = this.selectedCityName();
    if (!name || this.hasMarker() || !this.map) return;

    const { id, signal } = this.begin('city');
    try {
      const result = await this.geo.search(`${name}, Bosna i Hercegovina`, signal);
      if (id === this.requestId && result) this.map?.setView([result.lat, result.lng], 13);
    } catch {
    } finally {
      this.finish(id);
    }
  }

  clearLocation(): void {
    this.abort?.abort();
    this.removeMarker();
    this.form.patchValue({ latitude: '', longitude: '' });
    this.note.set(null);
  }

  retryCities(): void {
    this.loadCities();
  }

  next(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      setTimeout(() => (this.host.nativeElement.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus());
      return;
    }

    this.saveDraft();
    this.draft.markCompleted(1);
    this.router.navigate([WIZARD_BASE, WIZARD_STEPS[2].path]);
  }

  private initMap(): void {
    this.map = L.map(this.mapEl.nativeElement, { center: BIH_CENTER, zoom: 7 });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => this.pickOnMap(e.latlng.lat, e.latlng.lng));

    const { latitude, longitude } = this.draft.draft();
    if (latitude !== null && longitude !== null) {
      this.placeMarker(latitude, longitude, 16);
    }

    setTimeout(() => this.map?.invalidateSize());
  }

  private placeMarker(lat: number, lng: number, zoom?: number): void {
    if (!this.map) return;

    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = L.marker([lat, lng], {
        draggable: true,
        icon: L.divIcon({ html: PIN_HTML, className: '', iconSize: [34, 44], iconAnchor: [17, 44] }),
      }).addTo(this.map);

      this.marker.on('dragend', () => {
        const p = this.marker!.getLatLng();
        this.setCoords(p.lat, p.lng);
        this.note.set(null);
      });
      this.hasMarker.set(true);
    }

    if (zoom !== undefined) this.map.setView([lat, lng], zoom);
  }

  private removeMarker(): void {
    this.marker?.remove();
    this.marker = null;
    this.hasMarker.set(false);
  }

  private async pickOnMap(lat: number, lng: number): Promise<void> {
    this.placeMarker(lat, lng);
    this.setCoords(lat, lng);

    const { id, signal } = this.begin('reverse');
    try {
      const result = await this.geo.reverse(lat, lng, signal);
      if (id !== this.requestId) return;

      if (!result) {
        this.note.set({ text: 'Za ovu tačku nije pronađena adresa. Unesite je ručno.', kind: 'warn' });
        return;
      }

      if (result.countryCode && result.countryCode !== 'ba') {
        this.removeMarker();
        this.form.patchValue({ latitude: '', longitude: '' });
        this.note.set({ text: 'Odaberite lokaciju u Bosni i Hercegovini.', kind: 'warn' });
        return;
      }

      const messages: string[] = [];

      const cityId = this.matchCity(result.cityCandidates);
      if (cityId !== null) {
        this.form.controls.cityId.setValue(cityId);
      } else {
        const name = result.cityCandidates[0];
        messages.push(
          name
            ? `Grad „${name}“ nije u listi gradova. Odaberite najbliži grad ručno.`
            : 'Grad nije prepoznat. Odaberite ga ručno.',
        );
      }

      if (result.address) {
        this.form.controls.address.setValue(result.address);
      } else {
        messages.push('Ulica nije pronađena, unesite adresu ručno.');
      }

      this.note.set(messages.length ? { text: messages.join(' '), kind: 'warn' } : null);
    } catch (e) {
      this.handleLookupError(e, id);
    } finally {
      this.finish(id);
    }
  }

  private syncMarkerFromInputs(): void {
    const { latitude, longitude } = this.form.getRawValue();
    const lat = parseCoord(latitude);
    const lng = parseCoord(longitude);

    if (lat === null && lng === null) {
      this.removeMarker();
      return;
    }
    if (this.form.errors || lat === null || lng === null) return; // čeka ispravan unos

    this.placeMarker(lat, lng);
    this.map?.setView([lat, lng], Math.max(this.map.getZoom(), 15));
  }

  private setCoords(lat: number, lng: number): void {
    this.form.controls.latitude.setValue(lat.toFixed(6), { emitEvent: false });
    this.form.controls.longitude.setValue(lng.toFixed(6), { emitEvent: false });
    this.form.updateValueAndValidity({ emitEvent: false });
    this.saveDraft();
  }

  private matchCity(candidates: string[]): number | null {
    const cities = this.cities();
    for (const candidate of candidates) {
      const wanted = normalizeName(candidate);
      const found = cities.find((c) => normalizeName(c.name) === wanted);
      if (found) return found.id;
    }
    return null;
  }

  private selectedCityName(): string | null {
    const id = this.form.controls.cityId.value;
    return this.cities().find((c) => c.id === id)?.name ?? null;
  }

  private saveDraft(): void {
    const v = this.form.getRawValue();
    this.draft.patch({
      cityId: v.cityId,
      address: v.address.trim(),
      latitude: toDraftNumber(v.latitude),
      longitude: toDraftNumber(v.longitude),
    });
  }

  private loadCities(): void {
    this.citiesError.set(false);
    this.cityService.getAll().subscribe({
      next: (list) => this.cities.set(list),
      error: () => this.citiesError.set(true),
    });
  }

  private begin(kind: BusyKind): { id: number; signal: AbortSignal } {
    this.abort?.abort();
    this.abort = new AbortController();
    this.busy.set(kind);
    this.note.set(null);
    return { id: ++this.requestId, signal: this.abort.signal };
  }

  private finish(id: number): void {
    if (id === this.requestId) this.busy.set(null);
  }

  private handleLookupError(error: unknown, id: number): void {
    if ((error as DOMException)?.name === 'AbortError' || id !== this.requestId) return;
    this.note.set({
      text: 'Pretraga lokacije trenutno nije dostupna. Podatke možete unijeti ručno.',
      kind: 'warn',
    });
  }
}