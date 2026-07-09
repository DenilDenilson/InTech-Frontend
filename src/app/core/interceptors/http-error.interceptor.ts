import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { NotificationService } from '../services/notification.service';

export const httpErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const notificationService = inject(NotificationService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        notificationService.showError(getFriendlyErrorMessage(error));
      } else {
        notificationService.showError('Ocurrió un error inesperado.');
      }

      return throwError(() => error);
    }),
  );
};

function getFriendlyErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'No se pudo conectar con el backend. Verifica que Django esté corriendo.';
  }

  if (error.status === 400) {
    return 'La solicitud tiene datos inválidos. Revisa el formulario.';
  }

  if (error.status === 401) {
    return 'No autorizado. Inicia sesión para continuar.';
  }

  if (error.status === 403) {
    return 'No tienes permisos para realizar esta acción.';
  }

  if (error.status === 404) {
    return 'El recurso solicitado no existe.';
  }

  if (error.status === 429) {
    return 'Demasiadas solicitudes. Intenta nuevamente en unos segundos.';
  }

  if (error.status >= 500) {
    return 'Error interno del servidor. Intenta nuevamente más tarde.';
  }

  return 'Ocurrió un error al comunicarse con el backend.';
}