// src/app/core/services/auth/current-user.service.ts
import { Injectable, inject, computed, signal } from '@angular/core';
import { AuthFacadeService } from './auth-facade.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.development';

export interface CurrentUser {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  isAdmin: boolean;
}

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private auth = inject(AuthFacadeService);

  /** Signal koji UI može čitati (readonly) */
  currentUser = computed(() => this.auth.currentUser());

  isAuthenticated = computed(() => this.auth.isAuthenticated());
  isAdmin = computed(() => this.auth.isAdmin());

  get snapshot() {
    return this.auth.currentUser();
  }

  /** Pravilo: admin > ostali → client */
  getDefaultRoute(): string {
    const user = this.snapshot;
    if (!user) return '/auth/login';

    if (user.isAdmin) return '/admin';
    return '/client';
  }
  private readonly http = inject(HttpClient);

  readonly user = signal<CurrentUser | null>(null);

  readonly fullName = computed(() => {
    const u = this.user();
    return u ? `${u.firstname} ${u.lastname}`.trim() : '';
  });

  readonly initials = computed(() => {
    const u = this.user();
    return u ? `${u.firstname.charAt(0)}${u.lastname.charAt(0)}`.toUpperCase() : '';
  });

  readonly roleLabel = computed(() => (this.user()?.isAdmin ? 'Administrator' : 'Vlasnik nekretnina'));

  /** Učitava podatke iz GetMe endpointa. Poziva se pri ulasku u aplikaciju i poslije izmjene profila. */
  refresh(): void {
    // TODO(starter): provjeri putanju GetMe endpointa (GetMeQuery)
    this.http.get<CurrentUser>(`${environment.apiUrl}/api/auth/me`).subscribe({
      next: (u) => this.user.set(u),
      error: () => {},
    });
  }

  clear(): void {
    this.user.set(null);
  }
}
