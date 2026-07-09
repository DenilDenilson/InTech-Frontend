import { Component } from '@angular/core';

@Component({
  selector: 'app-product-list-page',
  standalone: true,
  template: `
    <section class="space-y-4">
      <h1 class="text-2xl font-semibold text-slate-900">Productos</h1>
      <p class="text-slate-600">Listado de productos pendiente.</p>
    </section>
  `,
})
export class ProductListPageComponent {}