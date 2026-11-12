import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { AuthFacadeService } from './auth-facade.service';
import { CurrentUserDto, MeResponse } from './current-user.dto';

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private readonly auth = inject(AuthFacadeService);
  private readonly http = inject(HttpClient);

  private readonly meUrl = `${environment.apiUrl}/api/auth/me`;

  private readonly profile = signal<MeResponse | null>(null);

  readonly currentUser = computed<CurrentUserDto | null>(() => {
    const identity = this.auth.currentUser();
    if (!identity) return null;

    const p = this.profile();
    if (!p || p.id !== identity.userId) return identity;

    return {
      ...identity,
      firstname: p.firstname,
      lastname: p.lastname,
      phone: p.phone,
      address: p.address,
      city: p.city,
    };
  });

  readonly isAuthenticated = computed(() => this.auth.isAuthenticated());
  readonly isAdmin = computed(() => this.auth.isAdmin());

  readonly fullName = computed(() => {
    const u = this.currentUser();
    return u?.firstname ? `${u.firstname} ${u.lastname ?? ''}`.trim() : '';
  });

  readonly initials = computed(() => {
    const u = this.currentUser();
    if (!u) return '';
    if (u.firstname) {
      return `${u.firstname.charAt(0)}${(u.lastname ?? '').charAt(0)}`.toUpperCase();
    }
    return u.email.charAt(0).toUpperCase(); // dok se profil ne učita
  });

  readonly roleLabel = computed(() => (this.isAdmin() ? 'Administrator' : 'Vlasnik nekretnina'));

  get snapshot(): CurrentUserDto | null {
    return this.currentUser();
  }

  getDefaultRoute(): string {
    const user = this.snapshot;
    if (!user) return '/auth/login'; 
    return user.isAdmin ? '/admin' : '/profile';
  }

  refresh(): void {
    if (!this.auth.isAuthenticated()) return;

    this.http.get<MeResponse>(this.meUrl).subscribe({
      next: (p) => this.profile.set(p),
      error: () => {}, 
    });
  }

  clear(): void {
    this.profile.set(null);
  }
}