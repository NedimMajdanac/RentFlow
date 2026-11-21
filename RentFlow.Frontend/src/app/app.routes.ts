import { Routes } from '@angular/router';

import { myAuthGuard } from './core/guards/my-auth-guard';
import { adminGuard } from './core/guards/admin.guard';
import { WIZARD_STEPS } from './modules/properties/wizard/property-wizard.config';
import { wizardStepGuard } from './modules/properties/wizard/wizard-step.guard';

const PLACEHOLDERS: [path: string, title: string][] = [
  ['dashboard', 'Pregled'],
  ['my-properties', 'Moje nekretnine'],
  ['listings', 'Pregledaj nekretnine'],
  ['requests', 'Moji zahtjevi'],
  ['transactions', 'Transakcije'],
  ['contracts', 'Ugovori'],
  ['settings', 'Postavke'],
  ['help', 'Centar za pomoć'],
];


export const routes: Routes = [
  // ==================== Public ====================
  {
    path: '',
    pathMatch: 'full', 
    loadComponent: () => import('./modules/public/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'login',
    canActivate: [myAuthGuard],
    loadComponent: () => import('./modules/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [myAuthGuard],
    loadComponent: () => import('./modules/auth/register/register.component').then((m) => m.RegisterComponent),
  },

  {
    path: 'login-success',
    canActivate: [myAuthGuard],
    loadComponent: () =>
      import('./modules/auth/login-success/login-success.component').then((m) => m.LoginSuccessComponent),
  },

  // ====================  (sidebar + topbar) ====================
  {
    path: '',
    canActivate: [myAuthGuard], 
    loadComponent: () => import('./core/layout/shell.component').then((m) => m.ShellComponent),
    children: [
      // ----- profile -----
      {
        path: 'profile',
        data: { title: 'Moj profil' },
        loadComponent: () => import('./modules/profile/profile.component').then((m) => m.ProfileComponent),
      },

      // ----- admin -----
      {
        path: 'admin',
        canActivate: [adminGuard],
        data: { title: 'Admin dashboard' },
        loadComponent: () =>
          import('./modules/admin/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
      },

      // ----- 403 -----
      {
        path: 'forbidden',
        data: { title: 'Pristup odbijen' },
        loadComponent: () => import('./modules/errors/forbidden.component').then((m) => m.ForbiddenComponent),
      },

      // ----- wizard -----
      {
        path: 'my-properties/new',
        loadComponent: () =>
          import('./modules/properties/wizard/property-wizard.component').then((m) => m.PropertyWizardComponent),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'basic-info' },

          {
            path: 'basic-info', // step 1
            data: { title: 'Nekretnine' },
            loadComponent: () =>
              import('./modules/properties/wizard/steps/basic/property-step-basic.component').then(
                (m) => m.PropertyStepBasicComponent,
              ),
          },
          {
            path: 'location', // step 2
            canActivate: [wizardStepGuard(1)],
            data: { title: 'Nekretnine' },
            loadComponent: () =>
              import('./modules/properties/wizard/steps/location/property-step-location.component').then(
                (m) => m.PropertyStepLocationComponent,
              ),
          },
          {
            path: 'features', // step 3
            canActivate: [wizardStepGuard(2)],
            data: { title: 'Nekretnine' },
            loadComponent: () =>
              import('./modules/properties/wizard/steps/features/property-step-features.component').then(
                (m) => m.PropertyStepFeaturesComponent,
              ),
          },
          {
            path: 'details', // step 4
            canActivate: [wizardStepGuard(3)],
            data: { title: 'Nekretnine' },
            loadComponent: () =>
              import('./modules/properties/wizard/steps/details/property-step-details.component').then(
                (m) => m.PropertyStepDetailsComponent,
              ),
          },
          {
            path: 'photos', 
            canActivate: [wizardStepGuard(4)],
            data: { title: 'Nekretnine' },
            loadComponent: () =>
              import('./modules/properties/wizard/steps/photos/property-step-photos.component').then(
                (m) => m.PropertyStepPhotosComponent,
              ),
          },

          ...WIZARD_STEPS.slice(5).map((step, i) => ({
            path: step.path,
            canActivate: [wizardStepGuard(i + 2)],
            data: { title: 'Nekretnine', stepTitle: step.title },
            loadComponent: () =>
              import('./modules/properties/wizard/shared/step-placeholder.component').then(
                (m) => m.StepPlaceholderComponent,
              ),
          })),
        ],
      },
      {
        path: 'my-properties',
        data: { title: 'Nekretnine' },
        loadComponent: () =>
          import('./modules/properties/list/my-properties.component').then((m) => m.MyPropertiesComponent),
      },

      ...PLACEHOLDERS.map(([path, title]) => ({
        path,
        data: { title },
        loadComponent: () => import('./core/layout/placeholder.component').then((m) => m.PlaceholderComponent),
      })),
    ],
  },

  { path: '**', redirectTo: '' },
];