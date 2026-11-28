import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, HostListener, OnInit, afterNextRender, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { extractFieldErrors } from '../../../core/http/api-error';
import { daysBetween, formatTimestamp, todayIso } from '../../../core/utils/date-utils';
import { ListingKind } from '../../properties/property.models';
import { CreateRequestResult } from '../request.models';
import { RequestService } from '../services/request.service';

const MAX_RENTAL_DAYS = 3650; // same limit as the backend (10 years)
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])';

const SERVER_FIELDS: Record<string, 'start' | 'end' | 'message'> = {
  desiredStartDate: 'start',
  desiredEndDate: 'end',
  message: 'message',
};

const periodValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const start = group.get('start')?.value as string;
  const end = group.get('end')?.value as string;
  if (!start || !end) return null;

  const days = daysBetween(start, end);
  if (days <= 0) return { endBeforeStart: true };
  if (days > MAX_RENTAL_DAYS) return { tooLong: true };
  return null;
};

const notInPast = (today: string): ValidatorFn => (c: AbstractControl): ValidationErrors | null =>
  c.value && String(c.value) < today ? { past: true } : null;

const dayWord = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? 'dan' : 'dana');

@Component({
  selector: 'app-send-request-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="overlay" (click)="onOverlayClick()">
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="req-title"
           (click)="$event.stopPropagation()" (keydown)="trapTab($event)">

        @if (result(); as r) {
          <!-- ============ SUCCESS ============ -->
          <div class="done" role="status">
            <span class="done__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10" /></svg>
            </span>
            <h2 id="req-title">Zahtjev je poslan</h2>
            <p>Vlasnik će pregledati vaš zahtjev. Odgovor i status pratite u dijelu „Moji zahtjevi“.</p>
            <small>Poslano: {{ sentOn(r) }}</small>
            <div class="actions">
              <button type="button" class="btn btn--light" (click)="close()">Zatvori</button>
              <a class="btn" routerLink="/requests">Moji zahtjevi</a>
            </div>
          </div>
        } @else {
          <!-- ============ FORM ============ -->
          <header class="head">
            <h2 id="req-title">{{ isRent() ? 'Zahtjev za najam' : 'Zahtjev za kupovinu' }}</h2>
            <p class="summary"><strong>{{ title() }}</strong><span>{{ priceText() }}</span></p>
          </header>

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            @if (error(); as e) { <div class="alert" role="alert">{{ e }}</div> }

            @if (isRent()) {
              <div class="grid2">
                <div class="field">
                  <label for="req-start">Željeni početak</label>
                  <input id="req-start" type="date" formControlName="start" [min]="today"
                         [class.is-invalid]="fieldError('start')" [attr.aria-invalid]="fieldError('start') ? true : null" />
                  @if (fieldError('start'); as e) { <small class="error" role="alert">{{ e }}</small> }
                </div>
                <div class="field">
                  <label for="req-end">Željeni kraj</label>
                  <input id="req-end" type="date" formControlName="end" [min]="form.controls.start.value || today"
                         [class.is-invalid]="fieldError('end')" [attr.aria-invalid]="fieldError('end') ? true : null" />
                  @if (fieldError('end'); as e) { <small class="error" role="alert">{{ e }}</small> }
                </div>
              </div>
              @if (duration()) { <p class="duration">{{ duration() }}</p> }
            }

            <div class="field">
              <label for="req-message">Poruka vlasniku <span class="opt">opcionalno</span></label>
              <textarea id="req-message" rows="5" formControlName="message"
                        [placeholder]="isRent() ? 'Predstavite se i navedite ko će živjeti u stanu' : 'Napišite vlasniku nešto o sebi i svojoj ponudi'"
                        [class.is-invalid]="fieldError('message')" [attr.aria-invalid]="fieldError('message') ? true : null"></textarea>
              <div class="counter">{{ form.controls.message.value.length }} / 2000</div>
              @if (fieldError('message'); as e) { <small class="error" role="alert">{{ e }}</small> }
            </div>

            <p class="note">Telefon i email vlasnika vam nisu potrebni: odgovor ćete vidjeti u „Moji zahtjevi“.</p>

            <div class="actions">
              <button type="button" class="btn btn--light" (click)="close()" [disabled]="submitting()">Odustani</button>
              <button type="submit" class="btn" [disabled]="submitting()">
                {{ submitting() ? 'Slanje...' : 'Pošalji zahtjev' }}
              </button>
            </div>
          </form>
        }
      </div>
    </div>
  `,
  styles: `
    :host { color: #14213d; font-family: Inter, 'Segoe UI', system-ui, sans-serif; }
    * { box-sizing: border-box; }
    h2, p { margin: 0; }
    .overlay { position: fixed; inset: 0; z-index: 300; display: grid; place-items: center; padding: 24px; background: rgba(15, 29, 59, .55); overflow-y: auto; }
    .dialog { width: 100%; max-width: 520px; padding: 28px; border-radius: 16px; background: #fff; box-shadow: 0 20px 60px rgba(0, 0, 0, .3); }
    .head h2 { font-size: 22px; font-weight: 800; letter-spacing: -0.01em; }
    .summary { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-top: 14px; padding: 12px 16px; border-radius: 10px; background: #f4f7fd; font-size: 14px; }
    .summary strong { overflow-wrap: anywhere; }
    .summary span { flex: none; color: #2158d8; font-weight: 700; }
    form { margin-top: 20px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .field { margin-bottom: 16px; }
    .field label { display: block; margin-bottom: 6px; font-size: 14px; font-weight: 700; }
    input, textarea { width: 100%; border: 1px solid #e3e8f3; border-radius: 8px; background: #fff; color: #14213d; font: inherit; font-size: 15px; outline: none; transition: border-color .15s, box-shadow .15s; }
    input { height: 44px; padding: 0 12px; }
    textarea { padding: 12px; resize: vertical; line-height: 1.5; }
    input:focus, textarea:focus { border-color: #2158d8; box-shadow: 0 0 0 3px rgba(33, 88, 216, .12); }
    .is-invalid { border-color: #d93025 !important; }
    .opt { margin-left: 8px; padding: 2px 9px; border-radius: 999px; background: #eef2f8; color: #5d6b8a; font-size: 12px; font-weight: 600; }
    .counter { margin-top: 4px; text-align: right; color: #5d6b8a; font-size: 12px; }
    .error { display: block; margin-top: 6px; color: #d93025; font-size: 13px; }
    .alert { margin-bottom: 16px; padding: 12px 14px; border-radius: 10px; background: #fdecea; color: #a1261b; font-size: 14px; }
    .duration { margin: -6px 0 16px; color: #1b47b0; font-size: 14px; font-weight: 600; }
    .note { margin: 0 0 4px; color: #5d6b8a; font-size: 13px; line-height: 1.5; }
    .actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; }
    .btn { display: inline-flex; align-items: center; justify-content: center; height: 44px; padding: 0 22px; border: 0; border-radius: 10px; background: #2158d8; color: #fff; font: inherit; font-size: 15px; font-weight: 600; text-decoration: none; cursor: pointer; transition: background .15s; }
    .btn:hover:not(:disabled) { background: #1b47b0; }
    .btn:disabled { opacity: .6; cursor: not-allowed; }
    .btn--light { border: 1px solid #e3e8f3; background: #fff; color: #14213d; }
    .btn--light:hover:not(:disabled) { background: #f4f7fd; }
    .done { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 8px 0 0; }
    .done__icon { display: grid; place-items: center; width: 76px; height: 76px; border-radius: 50%; background: #e3f6ec; color: #16a34a; }
    .done h2 { margin-top: 18px; font-size: 22px; font-weight: 800; }
    .done p { margin-top: 8px; color: #5d6b8a; font-size: 15px; line-height: 1.55; }
    .done small { margin-top: 10px; color: #5d6b8a; font-size: 13px; }
    @media (max-width: 560px) { .overlay { padding: 12px; } .dialog { padding: 20px; } .grid2 { grid-template-columns: 1fr; gap: 0; } .actions { flex-direction: column-reverse; } .btn { width: 100%; } }
  `,
})
export class SendRequestDialogComponent implements OnInit {
  private readonly api = inject(RequestService);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly listingId = input.required<number>();
  readonly listingType = input.required<ListingKind>();
  readonly title = input.required<string>();
  readonly priceText = input.required<string>();

  readonly sent = output<CreateRequestResult>();
  readonly stale = output<void>();
  readonly closed = output<void>();

  readonly today = todayIso();
  readonly isRent = computed(() => this.listingType() === 'Rent');
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<CreateRequestResult | null>(null);
  readonly duration = signal('');

  readonly form = new FormGroup(
    {
      start: new FormControl('', { nonNullable: true }),
      end: new FormControl('', { nonNullable: true }),
      message: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] }),
    },
    { validators: [periodValidator] },
  );

  constructor() {
    const opener = this.document.activeElement as HTMLElement | null;
    this.document.body.style.overflow = 'hidden';
    inject(DestroyRef).onDestroy(() => {
      this.document.body.style.overflow = '';
      opener?.focus?.(); 
    });

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.updateDuration());
    afterNextRender(() => (this.host.nativeElement.querySelector('#req-start, #req-message') as HTMLElement | null)?.focus());
  }

  ngOnInit(): void {
    if (this.isRent()) {
      this.form.controls.start.setValidators([Validators.required, notInPast(this.today)]);
      this.form.controls.end.setValidators([Validators.required]);
      this.form.updateValueAndValidity({ emitEvent: false });
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  close(): void {
    if (!this.submitting()) this.closed.emit();
  }

  onOverlayClick(): void {
    if (!this.form.dirty || this.result()) this.close();
  }

  trapTab(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const items = Array.from(
      this.host.nativeElement.querySelectorAll(FOCUSABLE) as NodeListOf<HTMLElement>,
    );
    if (!items.length) return;

    const first = items[0];
    const last = items[items.length - 1];
    const active = this.document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  fieldError(name: 'start' | 'end' | 'message'): string | null {
    const c = this.form.controls[name];
    if (!(c.touched || c.dirty)) return null;

    if (c.errors?.['server']) return c.errors['server'];
    if (name === 'start') {
      if (c.errors?.['required']) return 'Unesite željeni početak najma.';
      if (c.errors?.['past']) return 'Početak najma ne može biti u prošlosti.';
    }
    if (name === 'end') {
      if (c.errors?.['required']) return 'Unesite željeni kraj najma.';
      if (this.form.errors?.['endBeforeStart']) return 'Kraj najma mora biti poslije početka.';
      if (this.form.errors?.['tooLong']) return 'Najam može trajati najviše 10 godina.';
    }
    if (name === 'message' && c.errors?.['maxlength']) return 'Najviše 2000 znakova.';
    return null;
  }

  private updateDuration(): void {
    const { start, end } = this.form.getRawValue();
    if (!start || !end) return this.duration.set('');
    const days = daysBetween(start, end);
    this.duration.set(days > 0 && days <= MAX_RENTAL_DAYS ? `Trajanje: ${days} ${dayWord(days)}` : '');
  }

  sentOn(r: CreateRequestResult): string {
    return formatTimestamp(r.createdAtUtc);
  }

  submit(): void {
    if (this.submitting() || this.result()) return;
    this.error.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }

    const v = this.form.getRawValue();
    const rent = this.isRent();
    this.submitting.set(true);

    this.api
      .create({
        listingId: this.listingId(),
        message: v.message.trim() || null,
        desiredStartDate: rent ? v.start : null,
        desiredEndDate: rent ? v.end : null,
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.result.set(res);
          this.sent.emit(res);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.handleError(err);
        },
      });
  }

  private handleError(err: HttpErrorResponse): void {
    const rest: string[] = [];
    let matched = false;

    for (const [key, messages] of Object.entries(extractFieldErrors(err))) {
      const control = SERVER_FIELDS[key] ? this.form.controls[SERVER_FIELDS[key]] : null;
      if (control) {
        control.setErrors({ server: messages[0] });
        control.markAsTouched();
        matched = true;
      } else {
        rest.push(...messages);
      }
    }

    if (rest.length) this.error.set(rest.join(' '));
    else if (!matched) this.error.set(this.messageFor(err));

    if (err.status === 404 || err.status === 409) this.stale.emit();
    this.focusFirstInvalid();
  }

  private messageFor(err: HttpErrorResponse): string {
    if (err.status === 0) return 'Server nije dostupan. Provjerite vezu i pokušajte ponovo.';
    const fromServer = err.error?.detail ?? err.error?.message ?? err.error?.title;
    if (err.status === 404) return 'Oglas više nije dostupan.';
    if (err.status === 409) return fromServer ?? 'Zahtjev trenutno nije moguće poslati. Oglas je možda rezervisan ili već imate aktivan zahtjev.';
    return fromServer ?? 'Slanje nije uspjelo. Pokušajte ponovo.';
  }

  private focusFirstInvalid(): void {
    setTimeout(() => {
      const invalid = this.host.nativeElement.querySelector('[aria-invalid="true"]') as HTMLElement | null;
      invalid?.focus();
    });
  }
}