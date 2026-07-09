import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'persons',
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
    loadComponent: () =>
      import('./features/persons/pages/person-form-page/person-form-page').then(
        (m) => m.PersonFormPageComponent,
      ),
  },
  {
    path: 'persons/:id/edit',
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
    loadComponent: () =>
      import('./features/products/pages/product-form-page/product-form-page').then(
        (m) => m.ProductFormPageComponent,
      ),
  },
  {
    path: 'products/:id/edit',
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