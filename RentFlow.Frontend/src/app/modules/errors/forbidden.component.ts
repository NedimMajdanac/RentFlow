import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="box">
      <span class="code">403</span>
      <h1>Pristup odbijen</h1>
      <p>Nemate dozvolu za pristup ovoj stranici.</p>
      <a routerLink="/profile">Nazad na moj profil</a>
    </div>
  `,
  styles: `
    :host { display: block; color: #14213d; font-family: Inter, 'Segoe UI', system-ui, sans-serif; }
    .box { display: flex; flex-direction: column; align-items: center; padding: 96px 24px; text-align: center; }
    .code { color: #2158d8; font-size: 64px; font-weight: 800; line-height: 1; }
    h1 { margin: 12px 0 8px; font-size: 28px; font-weight: 800; }
    p { margin: 0 0 24px; color: #6b7a99; }
    a {
      padding: 12px 22px; border-radius: 10px; background: #2158d8; color: #fff;
      font-size: 14px; font-weight: 600; text-decoration: none;
    }
    a:hover { background: #1b47b0; }
  `,
})
export class ForbiddenComponent {}