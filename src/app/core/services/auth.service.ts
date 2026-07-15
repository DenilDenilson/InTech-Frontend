import { DOCUMENT } from '@angular/common';
import { HttpBackend, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, Signal, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, shareReplay, tap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthSession, AuthTokens, LoginCredentials, RefreshTokenResponse } from '../models/auth';

export const AUTH_SESSION_STORAGE_KEY = 'intech.auth.session.v1';

interface PersistedAuthSession extends AuthSession {
  version: 1;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly apiBaseUrl = environment.apiBaseUrl.replace(/\/+$/, '');
  private readonly loginUrl = `${this.apiBaseUrl}/api/v1/auth/login/`;
  private readonly refreshUrl = `${this.apiBaseUrl}/api/v1/auth/refresh/`;
  private readonly sessionState = signal<AuthSession | null>(null);

  private refreshRequest: Observable<string> | null = null;
  private expiryTimer: number | null = null;

  readonly session: Signal<AuthSession | null> = this.sessionState.asReadonly();
  readonly username = computed(() => this.sessionState()?.username ?? null);
  readonly isAuthenticated = computed(() => this.sessionState() !== null);

  constructor() {
    this.replaceSession(this.readPersistedSession(), false);
    this.listenForStorageChanges();
  }

  login(credentials: LoginCredentials): Observable<AuthSession> {
    return this.http.post<unknown>(this.loginUrl, credentials).pipe(
      map((response) => this.parseAuthTokens(response)),
      map((tokens): AuthSession => ({
        username: credentials.username.trim(),
        accessToken: tokens.access,
        refreshToken: tokens.refresh,
      })),
      tap((session) => this.replaceSession(session)),
    );
  }

  refreshAccessToken(): Observable<string> {
    if (this.refreshRequest) {
      return this.refreshRequest;
    }

    const session = this.sessionState();

    if (!session) {
      return throwError(
        () =>
          new HttpErrorResponse({
            status: 401,
            statusText: 'Authentication required',
            url: this.refreshUrl,
          }),
      );
    }

    const expectedRefreshToken = session.refreshToken;
    const request = this.http
      .post<unknown>(this.refreshUrl, { refresh: expectedRefreshToken })
      .pipe(
        map((response) => this.parseRefreshResponse(response)),
        map((tokens) => {
          const currentSession = this.sessionState();

          // A logout or a different login happened while refresh was pending.
          if (!currentSession || currentSession.refreshToken !== expectedRefreshToken) {
            throw new HttpErrorResponse({
              status: 401,
              statusText: 'Authentication session changed',
              url: this.refreshUrl,
            });
          }

          const updatedSession: AuthSession = {
            ...currentSession,
            accessToken: tokens.access,
            refreshToken: tokens.refresh ?? currentSession.refreshToken,
          };

          this.replaceSession(updatedSession);
          return updatedSession.accessToken;
        }),
        catchError((error: unknown) => {
          if (this.sessionState()?.refreshToken === expectedRefreshToken) {
            this.logout();
          }

          return throwError(() => error);
        }),
        finalize(() => {
          this.refreshRequest = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    this.refreshRequest = request;
    return request;
  }

  logout(): void {
    this.replaceSession(null);
  }

  getAccessToken(): string | null {
    return this.sessionState()?.accessToken ?? null;
  }

  private replaceSession(session: AuthSession | null, persist = true): void {
    this.cancelExpiryTimer();
    this.sessionState.set(session);

    if (persist) {
      this.persistSession(session);
    }

    if (session) {
      this.scheduleRefreshExpiry(session);
    }
  }

  private persistSession(session: AuthSession | null): void {
    const storage = this.getStorage();

    if (!storage) {
      return;
    }

    try {
      if (!session) {
        storage.removeItem(AUTH_SESSION_STORAGE_KEY);
        return;
      }

      const persisted: PersistedAuthSession = { version: 1, ...session };
      storage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      // Storage can be disabled or full. The in-memory session remains usable.
    }
  }

  private readPersistedSession(): AuthSession | null {
    const storage = this.getStorage();

    if (!storage) {
      return null;
    }

    try {
      const rawSession = storage.getItem(AUTH_SESSION_STORAGE_KEY);

      if (!rawSession) {
        return null;
      }

      const session = this.parsePersistedSession(rawSession);

      if (!session || this.isKnownExpired(session.refreshToken)) {
        storage.removeItem(AUTH_SESSION_STORAGE_KEY);
        return null;
      }

      return session;
    } catch {
      try {
        storage.removeItem(AUTH_SESSION_STORAGE_KEY);
      } catch {
        // Ignore storage security errors while cleaning invalid state.
      }

      return null;
    }
  }

  private parsePersistedSession(rawSession: string): AuthSession | null {
    const value: unknown = JSON.parse(rawSession);

    if (
      !this.isRecord(value) ||
      value['version'] !== 1 ||
      !this.isNonEmptyString(value['username']) ||
      !this.isNonEmptyString(value['accessToken']) ||
      !this.isNonEmptyString(value['refreshToken'])
    ) {
      return null;
    }

    return {
      username: value['username'],
      accessToken: value['accessToken'],
      refreshToken: value['refreshToken'],
    };
  }

  private parseAuthTokens(response: unknown): AuthTokens {
    if (
      !this.isRecord(response) ||
      !this.isNonEmptyString(response['access']) ||
      !this.isNonEmptyString(response['refresh'])
    ) {
      throw new Error('El backend devolvió una sesión inválida.');
    }

    return { access: response['access'], refresh: response['refresh'] };
  }

  private parseRefreshResponse(response: unknown): RefreshTokenResponse {
    if (!this.isRecord(response) || !this.isNonEmptyString(response['access'])) {
      throw new Error('El backend devolvió un access token inválido.');
    }

    const refresh = response['refresh'];

    if (refresh !== undefined && !this.isNonEmptyString(refresh)) {
      throw new Error('El backend devolvió un refresh token inválido.');
    }

    return refresh === undefined
      ? { access: response['access'] }
      : { access: response['access'], refresh };
  }

  private listenForStorageChanges(): void {
    const browserWindow = this.document.defaultView;

    if (!browserWindow) {
      return;
    }

    const listener = (event: StorageEvent): void => {
      if (event.key !== AUTH_SESSION_STORAGE_KEY) {
        return;
      }

      if (!event.newValue) {
        this.replaceSession(null, false);
        return;
      }

      try {
        const session = this.parsePersistedSession(event.newValue);
        this.replaceSession(
          session && !this.isKnownExpired(session.refreshToken) ? session : null,
          false,
        );
      } catch {
        this.replaceSession(null, false);
      }
    };

    browserWindow.addEventListener('storage', listener);
    this.destroyRef.onDestroy(() => browserWindow.removeEventListener('storage', listener));
  }

  private scheduleRefreshExpiry(session: AuthSession): void {
    const expiresAt = this.readJwtExpiration(session.refreshToken);

    if (expiresAt === null) {
      return;
    }

    const browserWindow = this.document.defaultView;

    if (!browserWindow) {
      return;
    }

    const remaining = expiresAt - Date.now();

    if (remaining <= 0) {
      this.logout();
      return;
    }

    // Browsers clamp larger delays. Re-evaluate on the next safe interval.
    const delay = Math.min(remaining, 2_147_483_647);
    this.expiryTimer = browserWindow.setTimeout(() => {
      this.expiryTimer = null;

      if (this.sessionState()?.refreshToken === session.refreshToken) {
        this.scheduleRefreshExpiry(session);
      }
    }, delay);
  }

  private cancelExpiryTimer(): void {
    if (this.expiryTimer === null) {
      return;
    }

    this.document.defaultView?.clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
  }

  private isKnownExpired(token: string): boolean {
    const expiration = this.readJwtExpiration(token);
    return expiration !== null && expiration <= Date.now();
  }

  private readJwtExpiration(token: string): number | null {
    const payload = token.split('.')[1];

    if (!payload) {
      return null;
    }

    try {
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
      const parsed: unknown = JSON.parse(this.document.defaultView?.atob(padded) ?? '');

      if (!this.isRecord(parsed) || typeof parsed['exp'] !== 'number') {
        return null;
      }

      return parsed['exp'] * 1_000;
    } catch {
      return null;
    }
  }

  private getStorage(): Storage | null {
    try {
      return this.document.defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }
}
