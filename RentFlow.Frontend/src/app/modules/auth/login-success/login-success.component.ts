import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-login-success',
  standalone: true,
  template: `
    <div class="page">
      <div class="card" role="status" aria-live="polite">
        <div class="check">
          <svg viewBox="0 0 52 52" width="72" height="72">
            <circle class="check__circle" cx="26" cy="26" r="24" />
            <path class="check__mark" d="M15 27l7 7 15-16" />
          </svg>
        </div>

        <h1>Uspješno ste prijavljeni</h1>
        <p>Dobro došli nazad u RentFlow. Preusmjeravamo vas...</p>

        <button type="button" (click)="continue()">Nastavi</button>
        <div class="progress"><span></span></div>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .page {
      display: grid; place-items: center; min-height: 100vh; padding: 24px;
      background: #f4f6fb;
      font-family: Inter, 'Segoe UI', system-ui, -apple-system, Roboto, Arial, sans-serif;
    }
    .card {
      width: 100%; max-width: 420px; padding: 48px 40px 32px; text-align: center;
      background: #fff; border-radius: 20px;
      box-shadow: 0 10px 40px rgba(15, 29, 59, 0.08);
    }
    h1 { margin: 20px 0 8px; font-size: 24px; color: #14213d; }
    p { margin: 0 0 28px; color: #6b7a99; font-size: 14px; }

    .check { display: grid; place-items: center; }
    .check__circle {
      fill: #e8f7ee; stroke: #22a55b; stroke-width: 2.5;
      stroke-dasharray: 151; stroke-dashoffset: 151;
      animation: draw .6s ease-out forwards;
    }
    .check__mark {
      fill: none; stroke: #22a55b; stroke-width: 4;
      stroke-linecap: round; stroke-linejoin: round;
      stroke-dasharray: 40; stroke-dashoffset: 40;
      animation: draw .4s ease-out .5s forwards;
    }
    @keyframes draw { to { stroke-dashoffset: 0; } }

    button {
      width: 100%; height: 46px; border: 0; border-radius: 10px;
      background: #2158d8; color: #fff; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;
    }
    button:hover { background: #1b47b0; }

    .progress { height: 4px; margin-top: 28px; overflow: hidden; border-radius: 2px; background: #e9edf6; }
    .progress span {
      display: block; height: 100%; background: #22a55b;
      transform-origin: left; animation: fill 3s linear forwards;
    }
    @keyframes fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }

    @media (prefers-reduced-motion: reduce) {
      .check__circle, .check__mark { animation: none; stroke-dashoffset: 0; }
    }
  `,
})
export class LoginSuccessComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private timer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.timer = setTimeout(() => this.continue(), 3000);
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }

  continue(): void {
    clearTimeout(this.timer);
    const url = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/profile';
    this.router.navigateByUrl(url.startsWith('/') && !url.startsWith('//') ? url : '/profile');
  }
}