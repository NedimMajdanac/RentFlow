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
import { AuthApiService } from '../../../api-services/auth-api.service';

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
  private readonly auth = inject(AuthApiService);
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
        this.router.navigateByUrl('/'); 
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.serverError.set(
          err.status === 400 || err.status === 409
            ? 'Registracija nije uspjela. Provjerite podatke (email možda već postoji).'
            : 'Došlo je do greške. Pokušajte ponovo.',
        );
      },
    });
  }

  signInWithGoogle(): void {
    // backend doesnt support google sign in - design only
  }
}