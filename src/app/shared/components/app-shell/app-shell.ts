import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { catchError, map, of, startWith } from 'rxjs';

import { HealthService } from '../../../core/services/health.service';
import { GlobalAlertComponent } from '../global-alert/global-alert';

type BackendStatus = 'checking' | 'online' | 'offline';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe, GlobalAlertComponent],
  template: `
    <div class="min-h-screen bg-slate-50 text-slate-900">
      <app-global-alert />
      <header class="border-b border-slate-200 bg-white">
        <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
              InTech
            </p>
            <h1 class="text-xl font-bold text-slate-950">
              InTech Admin
            </h1>
          </div>

          <nav class="flex items-center gap-2">
            <a
              routerLink="/persons"
              routerLinkActive="bg-indigo-600 text-white"
              [routerLinkActiveOptions]="{ exact: true }"
              class="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Personas
            </a>

            <a
              routerLink="/products"
              routerLinkActive="bg-indigo-600 text-white"
              [routerLinkActiveOptions]="{ exact: true }"
              class="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Productos
            </a>
          </nav>
        </div>
      </header>

      <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section class="mb-6 grid gap-4 md:grid-cols-[1fr_280px]">
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 class="text-lg font-semibold text-slate-950">
              Panel interno de inventario
            </h2>
            <p class="mt-1 text-sm text-slate-600">
              Gestiona personas responsables y activos tecnológicos desde una SPA Angular.
            </p>
          </div>

          @if (backendStatus$ | async; as backendStatus) {
          <div
            class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p class="text-sm font-medium text-slate-500">
              Estado del backend
            </p>

            <div class="mt-3 flex items-center gap-3">
              <span
                class="h-3 w-3 rounded-full"
                [class.bg-amber-400]="backendStatus === 'checking'"
                [class.bg-emerald-500]="backendStatus === 'online'"
                [class.bg-rose-500]="backendStatus === 'offline'"
              ></span>

              <span class="text-sm font-semibold text-slate-900">
                {{
                  backendStatus === 'checking'
                    ? 'Verificando...'
                    : backendStatus === 'online'
                      ? 'Operativo'
                      : 'Sin conexión'
                }}
              </span>
            </div>

            <p class="mt-2 text-xs text-slate-500">
              Consulta realizada contra /readyz.
            </p>
          </div>
            }
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <router-outlet></router-outlet>
        </section>
      </main>
    </div>
  `,
})
export class AppShellComponent {
  private readonly healthService = inject(HealthService);

  readonly backendStatus$ = this.healthService.readyz().pipe(
    map((response): BackendStatus => (response.status === 'ready' ? 'online' : 'offline')),
    catchError(() => of<BackendStatus>('offline')),
    startWith<BackendStatus>('checking'),
  );
}