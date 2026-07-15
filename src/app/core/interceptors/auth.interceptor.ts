import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, of, switchMap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { getSafeReturnUrl } from '../../shared/utils/safe-return-url';
import { AuthService } from '../services/auth.service';

const apiBaseUrl = environment.apiBaseUrl.replace(/\/+$/, '');
const apiPrefix = `${apiBaseUrl}/api/`;
const authPrefix = `${apiBaseUrl}/api/v1/auth/`;

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!request.url.startsWith(apiPrefix) || request.url.startsWith(authPrefix)) {
    return next(request);
  }

  const initialAccessToken = authService.getAccessToken();
  const requestWithToken = addAccessToken(request, initialAccessToken);

  return next(requestWithToken).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      const isPublicRead = request.method === 'GET' || request.method === 'HEAD';

      return authService.refreshAccessToken().pipe(
        map((accessToken) => ({ success: true as const, accessToken })),
        catchError((refreshError: unknown) => of({ success: false as const, refreshError })),
        switchMap((refreshResult) => {
          if (!refreshResult.success) {
            const currentAccessToken = authService.getAccessToken();

            // A different login may have completed while the old refresh was
            // pending. Preserve it and recover the request with that session.
            if (currentAccessToken && currentAccessToken !== initialAccessToken) {
              return next(addAccessToken(request, currentAccessToken));
            }

            if (isPublicRead) {
              // Reads are public in this API. Retry once anonymously when a stale
              // persisted session cannot be refreshed.
              return next(removeAuthorization(request));
            }

            redirectToLogin(router);
            return throwError(() => refreshResult.refreshError);
          }

          return next(addAccessToken(request, refreshResult.accessToken)).pipe(
            catchError((retryError: unknown) => {
              if (retryError instanceof HttpErrorResponse && retryError.status === 401) {
                const currentAccessToken = authService.getAccessToken();

                if (currentAccessToken && currentAccessToken !== refreshResult.accessToken) {
                  return next(addAccessToken(request, currentAccessToken));
                }

                if (currentAccessToken === refreshResult.accessToken) {
                  authService.logout();
                }

                if (isPublicRead) {
                  return next(removeAuthorization(request));
                }

                redirectToLogin(router);
              }

              return throwError(() => retryError);
            }),
          );
        }),
      );
    }),
  );
};

function addAccessToken(request: HttpRequest<unknown>, accessToken: string | null) {
  if (!accessToken) {
    return request;
  }

  return request.clone({
    setHeaders: { Authorization: `Bearer ${accessToken}` },
  });
}

function removeAuthorization(request: HttpRequest<unknown>): HttpRequest<unknown> {
  return request.clone({ headers: request.headers.delete('Authorization') });
}

function redirectToLogin(router: Router): void {
  const returnUrl = getSafeReturnUrl(router.url);
  void router.navigate(['/login'], {
    queryParams: { returnUrl },
    replaceUrl: true,
  });
}
