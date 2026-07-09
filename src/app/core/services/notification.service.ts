import { Injectable, signal } from '@angular/core';

export type NotificationType = 'error' | 'success' | 'info';

export interface AppNotification {
  type: NotificationType;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  readonly notification = signal<AppNotification | null>(null);

  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  showError(message: string): void {
    this.show({ type: 'error', message });
  }

  showSuccess(message: string): void {
    this.show({ type: 'success', message });
  }

  showInfo(message: string): void {
    this.show({ type: 'info', message });
  }

  clear(): void {
    this.notification.set(null);

    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  private show(notification: AppNotification): void {
    this.notification.set(notification);

    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }

    this.hideTimer = setTimeout(() => {
      this.notification.set(null);
      this.hideTimer = null;
    }, 4500);
  }
}