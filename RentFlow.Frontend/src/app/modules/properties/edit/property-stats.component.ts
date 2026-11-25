import { Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Subject, catchError, map, merge, of, switchMap, tap } from 'rxjs';
import { IconComponent } from '../../../shared/ui/icon.component';
import { PropertyStats } from '../property-edit.models';
import { PropertyService } from '../property.service';

const CURRENCY_LABELS: Record<string, string> = { BAM: 'KM', EUR: 'EUR' };

@Component({
  selector: 'app-property-stats',
  standalone: true,
  imports: [IconComponent],
  template: `
    <section class="stats" [attr.aria-busy]="loading()">
      <div class="toolbar">
        <span class="muted">@if (updatedAt()) { Ažurirano u {{ updatedAt() }} }</span>
        <button type="button" class="refresh" [disabled]="loading()" (click)="reload()">
          <app-icon name="refresh" [size]="16" /> Osvježi
        </button>
      </div>

      @if (error()) {
        <div class="alert" role="alert">
          Statistika se nije mogla učitati.
          <button type="button" class="text-btn" (click)="reload()">Pokušaj ponovo</button>
        </div>
      }

      @if (stats(); as s) {
        <div class="grid" [class.is-loading]="loading()">
          <article class="stat">
            <span class="stat__icon"><app-icon name="eye" [size]="26" /></span>
            <strong>{{ n(s.totalViews) }}</strong>
            <span class="stat__label">{{ plural(s.totalViews, 'Pregled', 'Pregleda', 'Pregleda') }}</span>
            <small>
              @if (s.totalViews) {
                {{ n(s.last30DaysViews) }} u zadnjih 30 dana · {{ n(s.uniqueViewers) }}
                {{ plural(s.uniqueViewers, 'korisnik', 'korisnika', 'korisnika') }}
              } @else {
                Pregledi se broje kad oglas otvore drugi korisnici.
              }
            </small>
          </article>

          <article class="stat">
            <span class="stat__icon"><app-icon name="send" [size]="26" /></span>
            <strong>{{ n(s.totalRequests) }}</strong>
            <span class="stat__label">{{ plural(s.totalRequests, 'Zahtjev', 'Zahtjeva', 'Zahtjeva') }}</span>
            <small>{{ s.pendingRequests ? n(s.pendingRequests) + ' na čekanju' : 'Nema zahtjeva na čekanju' }}</small>
          </article>

          <article class="stat">
            <span class="stat__icon"><app-icon name="file" [size]="26" /></span>
            <strong>{{ n(s.activeContracts) }}</strong>
            <span class="stat__label">{{ plural(s.activeContracts, 'Aktivan ugovor', 'Aktivna ugovora', 'Aktivnih ugovora') }}</span>
            <small>Ukupno ugovora: {{ n(s.totalContracts) }}</small>
          </article>

          <article class="stat">
            <span class="stat__icon"><app-icon name="cash" [size]="26" /></span>
            @if (s.payments.length) {
              @for (p of s.payments; track p.currencyCode; let i = $index) {
                <strong [class.stat__extra]="i > 0">{{ money(p.amount, p.currencyCode) }}</strong>
              }
            } @else {
              <strong>0</strong>
            }
            <span class="stat__label">Evidentiranih uplata</span>
            <small>{{ s.paymentsCount ? n(s.paymentsCount) + ' ' + plural(s.paymentsCount, 'uplata', 'uplate', 'uplata') : 'Još nema uplata' }}</small>
          </article>
        </div>

        <section class="chart" aria-labelledby="chart-title">
          <div class="chart__head">
            <h3 id="chart-title">Pregledi u zadnjih 14 dana</h3>
            <span class="muted">{{ n(chartTotal()) }} ukupno</span>
          </div>
          <ol class="bars" role="img" [attr.aria-label]="'Pregledi po danima, ukupno ' + chartTotal() + ' u zadnjih 14 dana'">
            @for (d of s.viewsPerDay; track d.date; let i = $index) {
              <li class="bar" [attr.title]="dayLabel(d.date) + ': ' + d.count">
                <span class="bar__count" aria-hidden="true">{{ d.count || '' }}</span>
                <span class="bar__fill" [class.bar__fill--zero]="!d.count" [style.height.%]="barHeight(d.count)"></span>
                <span class="bar__day" aria-hidden="true">{{ i % 2 === 0 ? dayLabel(d.date) : '' }}</span>
              </li>
            }
          </ol>
        </section>
      } @else if (loading()) {
        <div class="grid" aria-label="Učitavanje statistike">
          @for (i of [1, 2, 3, 4]; track i) { <div class="sk"></div> }
        </div>
      }
    </section>
  `,
  styles: `
    :host { display: block; color: #14213d; }
    * { box-sizing: border-box; }
    h3 { margin: 0; }
    .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
    .muted { color: #5d6b8a; font-size: 13px; }
    .refresh { display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 14px; border: 1px solid #e3e8f3; border-radius: 8px; background: #fff; color: #14213d; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
    .refresh:hover:not(:disabled) { background: #f4f7fd; }
    .refresh:disabled { opacity: .6; cursor: progress; }
    .alert { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; padding: 12px 16px; border-radius: 10px; background: #fdecea; color: #a1261b; font-size: 14px; }
    .text-btn { padding: 0; border: 0; background: none; color: #2158d8; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
    .text-btn:hover { text-decoration: underline; }

    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; transition: opacity .15s; }
    .grid.is-loading { opacity: .55; }
    .stat { display: flex; flex-direction: column; gap: 2px; min-height: 170px; padding: 22px 26px; border: 1px solid #e3e8f3; border-radius: 12px; background: #fff; }
    .stat__icon { display: grid; place-items: center; width: 46px; height: 46px; margin-bottom: 10px; border-radius: 12px; background: #e9f0fd; color: #2158d8; }
    .stat strong { font-size: 34px; line-height: 1.15; font-weight: 800; letter-spacing: -0.01em; }
    .stat__extra { font-size: 22px !important; color: #44506b; }
    .stat__label { color: #44506b; font-size: 20px; }
    .stat small { margin-top: 8px; color: #5d6b8a; font-size: 13px; }

    .chart { margin-top: 24px; padding: 22px 26px 18px; border: 1px solid #e3e8f3; border-radius: 12px; background: #fff; }
    .chart__head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
    .chart__head h3 { font-size: 18px; font-weight: 800; }
    .bars { display: grid; grid-template-columns: repeat(14, minmax(0, 1fr)); gap: 8px; height: 170px; margin: 0; padding: 0; list-style: none; }
    .bar { display: grid; grid-template-rows: 16px 1fr 18px; justify-items: center; align-items: end; min-width: 0; }
    .bar__count { color: #5d6b8a; font-size: 11px; font-weight: 600; }
    .bar__fill { width: 100%; max-width: 34px; min-height: 3px; border-radius: 6px 6px 0 0; background: #2158d8; transition: height .25s; }
    .bar__fill--zero { background: #dbe3f3; }
    .bar:hover .bar__fill { background: #1b47b0; }
    .bar__day { color: #5d6b8a; font-size: 11px; white-space: nowrap; }

    .sk { min-height: 170px; border-radius: 12px; background: linear-gradient(90deg, #eef1f8, #f6f8fd, #eef1f8); background-size: 200% 100%; animation: shimmer 1.4s infinite linear; }
    @keyframes shimmer { to { background-position: -200% 0; } }

    @media (max-width: 800px) {
      .grid { grid-template-columns: 1fr; gap: 14px; }
      .stat { min-height: 0; padding: 18px 20px; }
      .bars { gap: 4px; height: 140px; }
      .bar__count { font-size: 10px; }
    }
    @media (prefers-reduced-motion: reduce) { .sk { animation: none; } .bar__fill { transition: none; } }
  `,
})
export class PropertyStatsComponent {
  private readonly api = inject(PropertyService);

  readonly propertyId = input.required<number>();

  readonly stats = signal<PropertyStats | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly updatedAt = signal('');

  private readonly refresh$ = new Subject<void>();

  readonly maxDaily = computed(() => Math.max(1, ...(this.stats()?.viewsPerDay.map((d) => d.count) ?? [0])));
  readonly chartTotal = computed(() => this.stats()?.viewsPerDay.reduce((sum, d) => sum + d.count, 0) ?? 0);

  constructor() {
    // Loads when the component appears (and when the property id changes) and again on every manual refresh.
    // Each new request cancels the previous one, so a slow response cannot overwrite a newer one.
    merge(toObservable(this.propertyId), this.refresh$.pipe(map(() => this.propertyId())))
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(false);
        }),
        switchMap((id) =>
          this.api.stats(id).pipe(
            catchError(() => {
              this.error.set(true);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((s) => {
        this.loading.set(false);
        if (!s) return; // on error the previous numbers (if any) stay visible next to the message
        this.stats.set(s);
        this.updatedAt.set(new Date().toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit' }));
      });
  }

  reload(): void {
    this.refresh$.next();
  }

  // ---------- display helpers ----------
  n(value: number): string {
    return value.toLocaleString('bs-BA');
  }

  money(amount: number, code: string): string {
    const text = amount.toLocaleString('bs-BA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return `${text} ${CURRENCY_LABELS[code] ?? code}`;
  }

  /** Bosnian plural: 1 pregled, 2-4 pregleda, 5+ pregleda (11-14 always take the "many" form). */
  plural(count: number, one: string, few: string, many: string): string {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  }

  /** Bar height in percent of the tallest bar; days without views keep a thin baseline. */
  barHeight(count: number): number {
    return count === 0 ? 0 : Math.max(6, (count / this.maxDaily()) * 100);
  }

  dayLabel(date: string): string {
    const [, month, day] = date.split('-');
    return `${Number(day)}.${Number(month)}.`;
  }
}