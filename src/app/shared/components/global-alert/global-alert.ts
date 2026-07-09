import { Component, inject } from '@angular/core';

import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-global-alert',
  standalone: true,
  template: `
    @if (notificationService.notification(); as notification) {
      <div class="fixed right-4 top-4 z-50 w-[calc(100%-2rem)] max-w-md">
        <div
          class="rounded-xl border px-4 py-3 shadow-lg"
          [class.border-rose-200]="notification.type === 'error'"
          [class.bg-rose-50]="notification.type === 'error'"
          [class.text-rose-800]="notification.type === 'error'"
          [class.border-emerald-200]="notification.type === 'success'"
          [class.bg-emerald-50]="notification.type === 'success'"
          [class.text-emerald-800]="notification.type === 'success'"
          [class.border-indigo-200]="notification.type === 'info'"
          [class.bg-indigo-50]="notification.type === 'info'"
          [class.text-indigo-800]="notification.type === 'info'"
        >
          <div class="flex items-start justify-between gap-3">
            <p class="text-sm font-medium">
              {{ notification.message }}
            </p>

            <button
              type="button"
              (click)="notificationService.clear()"
              class="rounded-md px-2 text-lg leading-none opacity-70 transition hover:opacity-100"
              aria-label="Cerrar notificación"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class GlobalAlertComponent {
  readonly notificationService = inject(NotificationService);
}