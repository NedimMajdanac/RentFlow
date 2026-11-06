import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthApiService } from '../../../api-services/auth-api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly showPassword = signal(false);
  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    rememberMe: [false],
  });

  invalid(name: 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  submit(): void {
    this.serverError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.submitting.set(true);

    // TODO: uskladi potpis sa tvojim AuthService-om (POST /api/auth/login).
    // Servis treba sačuvati tokene; "rememberMe" se ne šalje backendu.
    this.auth.login({ email: email.trim().toLowerCase(), password }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigate(['/login-success'], {
          queryParams: { returnUrl: this.safeReturnUrl() },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.serverError.set(this.toMessage(err));
      },
    });
  }

  signInWithGoogle(): void {
    // Backend nema Google prijavu; dugme je samo dio dizajna.
  }

  private toMessage(err: HttpErrorResponse): string {
    switch (err.status) {
      case 0:
        return 'Server nije dostupan. Provjerite vezu i pokušajte ponovo.';
      case 400:
      case 401:
        // namjerno ista poruka za pogrešan email i pogrešnu lozinku
        return 'Pogrešan email ili lozinka.';
      case 403:
        return 'Vaš račun je onemogućen. Obratite se administratoru.';
      case 429:
        return 'Previše pokušaja. Pokušajte ponovo za nekoliko minuta.';
      default:
        return 'Došlo je do greške. Pokušajte ponovo.';
    }
  }

  /** Dozvoljava samo interne putanje (zaštita od open redirecta). */
  private safeReturnUrl(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
    return url.startsWith('/') && !url.startsWith('//') ? url : '/';
  }
}