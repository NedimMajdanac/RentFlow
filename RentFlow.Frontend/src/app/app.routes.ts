import { Routes } from '@angular/router';
import { myAuthGuard } from './core/guards/my-auth-guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: 'register', loadComponent: () => import('./modules/auth/register/register.component').then(m => m.RegisterComponent) },
  {
    path: 'login',
    loadComponent: () => import('./modules/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'login-success',
    canActivate: [myAuthGuard],
    loadComponent: () =>
      import('./modules/auth/login-success/login-success.component').then(m => m.LoginSuccessComponent),
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./modules/public/landing/landing.component').then(m => m.LandingComponent),
  },
  {
    path: '',
    canActivate: [myAuthGuard],
    loadComponent: () => import('./core/layout/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'profile',
        data: { title: 'Moj profil' },
        loadComponent: () => import('./modules/profile/profile.component').then((m) => m.ProfileComponent),
      },
      ...[
        ['dashboard', 'Pregled'],
        ['my-properties', 'Moje nekretnine'],
        ['listings', 'Pregledaj nekretnine'],
        ['requests', 'Moji zahtjevi'],
        ['transactions', 'Transakcije'],
        ['contracts', 'Ugovori'],
        ['settings', 'Postavke'],
        ['help', 'Centar za pomoć'],
      ].map(([path, title]) => ({
        path,
        data: { title },
        loadComponent: () => import('./core/layout/placeholder.component').then((m) => m.PlaceholderComponent),
      })),
      {
        path: 'admin',
        canActivate: [adminGuard],
        data: { title: 'Admin dashboard' },
        loadComponent: () =>
          import('./modules/admin/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
      },
      {
        path: 'forbidden',
        data: { title: 'Pristup odbijen' },
        loadComponent: () =>
          import('./modules/errors/forbidden.component').then((m) => m.ForbiddenComponent),
      },
    ],
  },
];
