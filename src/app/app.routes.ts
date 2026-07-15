import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'persons',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login-page/login-page').then((m) => m.LoginPageComponent),
  },
  {
    path: 'persons',
    loadComponent: () =>
      import('./features/persons/pages/person-list-page/person-list-page').then(
        (m) => m.PersonListPageComponent,
      ),
  },
  {
    path: 'persons/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/persons/pages/person-form-page/person-form-page').then(
        (m) => m.PersonFormPageComponent,
      ),
  },
  {
    path: 'persons/:id/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/persons/pages/person-form-page/person-form-page').then(
        (m) => m.PersonFormPageComponent,
      ),
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./features/products/pages/product-list-page/product-list-page').then(
        (m) => m.ProductListPageComponent,
      ),
  },
  {
    path: 'products/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/products/pages/product-form-page/product-form-page').then(
        (m) => m.ProductFormPageComponent,
      ),
  },
  {
    path: 'products/:id/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/products/pages/product-form-page/product-form-page').then(
        (m) => m.ProductFormPageComponent,
      ),
  },
  {
    path: '**',
    redirectTo: 'persons',
  },
];
