import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ImageKind,MyProfile } from '../../core/models/profile.models';
import { ProfileService } from '../../core/services/profile.service';
import { extractFieldErrors } from '../../core/http/api-error';

type FieldName = 'fullName' | 'phone' | 'city' | 'address' | 'profileDescription';

const PROPERTY_TYPES: Record<string, string> = {
  Apartment: 'Stan', House: 'Kuća', Commercial: 'Poslovni prostor',
  Land: 'Zemljište', Garage: 'Garaža', Other: 'Ostalo',
};
const LISTING_TYPES: Record<string, string> = { Rent: 'Iznajmljivanje', Sale: 'Prodaja' };
const CURRENCIES: Record<string, string> = { BAM: 'KM', EUR: 'EUR' };

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function fullNameValidator(control: AbstractControl): ValidationErrors | null {
  const parts = String(control.value ?? '').trim().split(/\s+/).filter(Boolean);
  return parts.length >= 2 ? null : { fullName: true };
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit {
  private readonly api = inject(ProfileService);
  private readonly fb = inject(FormBuilder);
  private readonly document = inject(DOCUMENT);

  readonly profile = signal<MyProfile | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly cities = signal<string[]>([]);
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly uploading = signal<ImageKind | null>(null);
  readonly toast = signal<{ text: string; kind: 'success' | 'error' } | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(201), fullNameValidator]],
    phone: ['', [Validators.maxLength(30), Validators.pattern(/^(\+?[0-9\s\-/()]{6,})?$/)]],
    city: ['', [Validators.maxLength(100)]],
    address: ['', [Validators.maxLength(200)]],
    profileDescription: ['', [Validators.maxLength(1000)]],
  });

  readonly fullName = computed(() => {
    const p = this.profile();
    return p ? `${p.firstname} ${p.lastname}`.trim() : '';
  });

  readonly initials = computed(() => {
    const p = this.profile();
    return p ? `${p.firstname.charAt(0)}${p.lastname.charAt(0)}`.toUpperCase() : '';
  });

  readonly memberSince = computed(() => {
    const p = this.profile();
    if (!p) return '';
    const d = new Date(p.memberSinceUtc);
    const years = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
    if (years >= 1) return `${years}+ godina`;
    return `Član od ${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  });

  readonly cityOptions = computed(() => {
    const current = this.profile()?.city;
    const list = this.cities();
    return current && !list.includes(current) ? [current, ...list] : list;
  });

  readonly avatarUrl = computed(() => this.api.mediaUrl(this.profile()?.profileImageUrl));
  readonly coverBg = computed(() => {
    const url = this.api.mediaUrl(this.profile()?.coverImageUrl);
    return url ? `url("${url}")` : null;
  });
  readonly featuredImage = computed(() => this.api.mediaUrl(this.profile()?.featuredListing?.mainImageUrl));

  ngOnInit(): void {
    this.load();
    this.api.getCities().subscribe({ next: (c) => this.cities.set(c), error: () => {} });
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.getMe().subscribe({
      next: (p) => {
        this.profile.set(p);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.loadError.set(
          err.status === 0
            ? 'Server nije dostupan. Provjerite vezu i pokušajte ponovo.'
            : 'Profil se nije mogao učitati.',
        );
      },
    });
  }

  openEdit(focus: FieldName = 'fullName'): void {
    const p = this.profile();
    if (!p) return;

    if (!this.editing()) {
      this.form.reset({
        fullName: `${p.firstname} ${p.lastname}`.trim(),
        phone: p.phone ?? '',
        city: p.city ?? '',
        address: p.address ?? '',
        profileDescription: p.profileDescription ?? '',
      });
      this.editing.set(true);
    }
    setTimeout(() => this.document.getElementById(`f-${focus}`)?.focus());
  }

  @HostListener('document:keydown.escape')
  cancelEdit(): void {
    if (this.editing() && !this.saving()) this.editing.set(false);
  }

  get willBeVerified(): boolean {
    const v = this.form.getRawValue();
    return !!(v.phone.trim() && v.city.trim() && v.address.trim());
  }

  fieldError(name: FieldName): string | null {
    const c = this.form.controls[name];
    if (!c.errors || !(c.touched || c.dirty)) return null;
    if (c.errors['server']) return c.errors['server'];
    if (c.errors['required'] || c.errors['fullName']) return 'Unesite ime i prezime.';
    if (c.errors['maxlength']) return `Najviše ${c.errors['maxlength'].requiredLength} znakova.`;
    if (c.errors['pattern']) return 'Unesite ispravan broj telefona.';
    return 'Neispravna vrijednost.';
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const [firstname, ...rest] = v.fullName.trim().split(/\s+/);
    const body = {
      firstname,
      lastname: rest.join(' '),
      phone: v.phone.trim() || null,
      city: v.city.trim() || null,
      address: v.address.trim() || null,
      profileDescription: v.profileDescription.trim() || null,
    };

    this.saving.set(true);
    this.api.update(body).subscribe({
      next: (res) => {
        this.profile.update((p) => (p ? { ...p, ...body, isVerified: res.isVerified } : p));
        this.saving.set(false);
        this.editing.set(false);
        this.showToast(res.isVerified ? 'Profil je sačuvan i verifikovan.' : 'Profil je sačuvan.', 'success');
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        let handled = false;
        for (const [field, messages] of Object.entries(extractFieldErrors(err))) {
          const name = field === 'firstname' || field === 'lastname' ? 'fullName' : field;
          const control = this.form.get(name);
          if (control) {
            control.setErrors({ server: messages[0] });
            control.markAsTouched();
            handled = true;
          }
        }
        if (!handled) this.showToast('Čuvanje nije uspjelo. Pokušajte ponovo.', 'error');
      },
    });
  }

  onFileSelected(kind: ImageKind, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; 
    if (!file) return;

    if (!IMAGE_TYPES.includes(file.type)) {
      this.showToast('Dozvoljeni formati su JPG, PNG i WebP.', 'error');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      this.showToast('Slika može imati najviše 5 MB.', 'error');
      return;
    }

    this.uploading.set(kind);
    this.api.uploadImage(kind, file).subscribe({
      next: ({ url }) => {
        this.profile.update((p) =>
          p ? (kind === 'profile' ? { ...p, profileImageUrl: url } : { ...p, coverImageUrl: url }) : p,
        );
        this.uploading.set(null);
        this.showToast('Slika je ažurirana.', 'success');
      },
      error: () => {
        this.uploading.set(null);
        this.showToast('Slanje slike nije uspjelo.', 'error');
      },
    });
  }

  formatPrice(price: number, currencyCode: string): string {
    const n = price.toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${n} ${CURRENCIES[currencyCode] ?? currencyCode}`;
  }
  propertyTypeLabel(t: string): string { return PROPERTY_TYPES[t] ?? t; }
  listingTypeLabel(t: string): string { return LISTING_TYPES[t] ?? t; }
  media(url: string | null): string | null { return this.api.mediaUrl(url); }

  private showToast(text: string, kind: 'success' | 'error'): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ text, kind });
    this.toastTimer = setTimeout(() => this.toast.set(null), 4000);
  }
}