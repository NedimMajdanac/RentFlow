import { Routes } from '@angular/router';
import { myAuthGuard } from './core/guards/my-auth-guard';

export const routes: Routes = [
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
];
