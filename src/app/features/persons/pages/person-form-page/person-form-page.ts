import { Component } from '@angular/core';

@Component({
  selector: 'app-person-form-page',
  standalone: true,
  template: `
    <section class="space-y-4">
      <h1 class="text-2xl font-semibold text-slate-900">Formulario de persona</h1>
      <p class="text-slate-600">Crear / editar persona pendiente.</p>
    </section>
  `,
})
export class PersonFormPageComponent {}