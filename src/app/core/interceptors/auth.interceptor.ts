import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, switchMap, throwError } from 'rxjs';

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
      const currentAccessToken = authService.getAccessToken();

      // The request may have been sent before another login or refresh replaced
      // its token. Recover with the current session without refreshing (and,
      // importantly, without allowing this late 401 to clear the new session).
      if (currentAccessToken && currentAccessToken !== initialAccessToken) {
        return retryWithAccessToken(
          request,
          next,
          currentAccessToken,
          authService,
          router,
          isPublicRead,
        );
      }

      return authService.refreshAccessToken().pipe(
        map((accessToken) => ({ success: true as const, accessToken })),
        catchError((refreshError: unknown) => of({ success: false as const, refreshError })),
        switchMap((refreshResult) => {
          if (!refreshResult.success) {
            const currentAccessToken = authService.getAccessToken();

            // A different login may have completed while the old refresh was
            // pending. Preserve it and recover the request with that session.
            if (currentAccessToken && currentAccessToken !== initialAccessToken) {
              return retryWithAccessToken(
                request,
                next,
                currentAccessToken,
                authService,
                router,
                isPublicRead,
              );
            }

            if (isPublicRead) {
              // Reads are public in this API. Retry once anonymously when a stale
              // persisted session cannot be refreshed.
              return next(removeAuthorization(request));
            }

            redirectToLogin(router);
            return throwError(() => refreshResult.refreshError);
          }

          return retryWithAccessToken(
            request,
            next,
            refreshResult.accessToken,
            authService,
            router,
            isPublicRead,
          );
        }),
      );
    }),
  );
};

function retryWithAccessToken(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  accessToken: string,
  authService: AuthService,
  router: Router,
  isPublicRead: boolean,
  remainingSessionHandoffs = 1,
): Observable<HttpEvent<unknown>> {
  return next(addAccessToken(request, accessToken)).pipe(
    catchError((retryError: unknown) => {
      if (!(retryError instanceof HttpErrorResponse) || retryError.status !== 401) {
        return throwError(() => retryError);
      }

      const currentAccessToken = authService.getAccessToken();

      // Bound session handoff recovery so repeated external storage/login
      // changes cannot create an unbounded retry loop.
      if (
        remainingSessionHandoffs > 0 &&
        currentAccessToken &&
        currentAccessToken !== accessToken
      ) {
        return retryWithAccessToken(
          request,
          next,
          currentAccessToken,
          authService,
          router,
          isPublicRead,
          remainingSessionHandoffs - 1,
        );
      }

      if (currentAccessToken === accessToken) {
        authService.logout();
      }

      if (isPublicRead) {
        return next(removeAuthorization(request));
      }

      // Do not redirect or clear if yet another session replaced the attempted
      // one after the bounded handoff. The failed request still propagates.
      if (!currentAccessToken || currentAccessToken === accessToken) {
        redirectToLogin(router);
      }

      return throwError(() => retryError);
    }),
  );
}

function addAccessToken(
  request: HttpRequest<unknown>,
  accessToken: string | null,
): HttpRequest<unknown> {
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
