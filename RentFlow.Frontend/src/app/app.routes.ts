import { Routes } from '@angular/router';
import { myAuthGuard } from './core/guards/my-auth-guard';

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
  path: 'profile',
  canActivate: [myAuthGuard],
  loadComponent: () => import('./modules/profile/profile.component').then(m => m.ProfileComponent),
},
];
