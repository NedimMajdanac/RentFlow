import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthFacadeService } from '../../../core/services/auth-facade.service';
import { extractFieldErrors } from '../../../core/http/api-error';

function fullNameValidator(control: AbstractControl): ValidationErrors | null {
  const parts = String(control.value ?? '').trim().split(/\s+/).filter(Boolean);
  return parts.length >= 2 ? null : { fullName: true };
}

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthFacadeService);
  private readonly router = inject(Router);

  readonly showPassword = signal(false);
  readonly showConfirm = signal(false);
  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.maxLength(201), fullNameValidator]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(200)]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/), // at least one char and one number
        ],
      ],
      confirmPassword: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]],
    },
    { validators: passwordsMatch },
  );

  
  invalid(name: 'fullName' | 'email' | 'password' | 'confirmPassword' | 'acceptTerms'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  get mismatch(): boolean {
    const c = this.form.controls.confirmPassword;
    return this.form.hasError('passwordsMismatch') && (c.touched || c.dirty);
  }

  submit(): void {
    this.serverError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { fullName, email, password } = this.form.getRawValue();
    const [firstname, ...rest] = fullName.trim().split(/\s+/);
    const lastname = rest.join(' ');

      this.submitting.set(true);
      
    this.auth.register({ firstname, lastname, email, password }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigateByUrl('/profile');
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);

        const fieldErrors = extractFieldErrors(err);
        let handled = false;

        for (const [field, messages] of Object.entries(fieldErrors)) {
          const control = this.form.get(field);
          if (control) {
            control.setErrors({ server: messages[0] });
            control.markAsTouched();
            handled = true;
          }
        }

        if (!handled) {
          // 409 without detail
          if (err.status === 409) {
            this.form.controls.email.setErrors({ server: 'Račun s ovom email adresom već postoji.' });
            this.form.controls.email.markAsTouched();
          } else {
            this.serverError.set(
              err.status === 0
                ? 'Server nije dostupan. Provjerite vezu i pokušajte ponovo.'
                : 'Došlo je do greške. Pokušajte ponovo.',
            );
          }
        }
      },
    });
  }

  signInWithGoogle(): void {
    // backend doesnt support google sign in - design only
  }
}