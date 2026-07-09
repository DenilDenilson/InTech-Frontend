import { Component } from '@angular/core';

@Component({
  selector: 'app-person-list-page',
  standalone: true,
  template: `
    <section class="space-y-4">
      <h1 class="text-2xl font-semibold text-slate-900">Personas</h1>
      <p class="text-slate-600">Listado de personas pendiente.</p>
    </section>
  `,
})
export class PersonListPageComponent {}