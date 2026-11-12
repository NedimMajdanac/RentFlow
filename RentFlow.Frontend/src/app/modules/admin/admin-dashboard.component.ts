import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  template: `
    <div class="page">
      <header>
        <h1>Admin dashboard</h1>
        <p>Pregled i nadzor nad platformom.</p>
      </header>

      <section class="card">
        <span class="badge">SAMO ZA ADMINISTRATORE</span>

        <div class="icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor"
               stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>

        <h2>Uskoro</h2>
        <p class="lead">Administratorski alati su u izradi. Ovdje ćete upravljati sadržajem platforme.</p>

        <ul class="plans">
          <li>Pregled i upravljanje korisnicima</li>
          <li>Pregled i nadzor nad oglasima i zahtjevima</li>
          <li>Pregled ugovora i finansijskih transakcija</li>
        </ul>
      </section>
    </div>
  `,
  styles: `
    :host { display: block; color: #14213d; font-family: Inter, 'Segoe UI', system-ui, sans-serif; }
    .page { max-width: 1180px; margin: 0 auto; padding: 32px 24px 64px; }
    h1 { margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.01em; }
    header p { margin: 4px 0 0; color: #6b7a99; font-size: 15px; }

    .card {
      display: flex; flex-direction: column; align-items: center; margin-top: 28px;
      padding: 56px 24px; text-align: center;
      background: #fff; border: 1px solid #e3e8f3; border-radius: 14px;
    }
    .badge {
      padding: 6px 12px; border-radius: 999px; background: #e9f0fd; color: #2158d8;
      font-size: 10px; font-weight: 700; letter-spacing: 0.05em;
    }
    .icon {
      display: grid; place-items: center; width: 84px; height: 84px; margin: 24px 0 18px;
      border-radius: 50%; background: #e9f0fd; color: #2158d8;
    }
    h2 { margin: 0 0 8px; font-size: 28px; font-weight: 800; }
    .lead { max-width: 440px; margin: 0 0 24px; color: #6b7a99; font-size: 15px; line-height: 1.6; }
    .plans { margin: 0; padding: 0; list-style: none; display: grid; gap: 10px; text-align: left; }
    .plans li { position: relative; padding-left: 22px; font-size: 14px; }
    .plans li::before {
      content: ''; position: absolute; left: 0; top: 7px; width: 8px; height: 8px;
      border-radius: 50%; background: #2158d8;
    }
  `,
})
export class AdminDashboardComponent {}