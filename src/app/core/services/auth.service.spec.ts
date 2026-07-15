import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { AUTH_SESSION_STORAGE_KEY, AuthService } from './auth.service';

describe('AuthService', () => {
  const apiBaseUrl = environment.apiBaseUrl.replace(/\/+$/, '');
  const loginUrl = `${apiBaseUrl}/api/v1/auth/login/`;
  const refreshUrl = `${apiBaseUrl}/api/v1/auth/refresh/`;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    window.localStorage.clear();
  });

  it('logs in, exposes the username and persists only session data', () => {
    const service = TestBed.inject(AuthService);
    const httpMock = TestBed.inject(HttpTestingController);
    const receivedSessions: string[] = [];

    service
      .login({ username: 'admin', password: 'not-persisted' })
      .subscribe((session) => receivedSessions.push(session.username));

    const request = httpMock.expectOne(loginUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ username: 'admin', password: 'not-persisted' });
    request.flush({ access: 'access-token', refresh: 'refresh-token' });

    expect(receivedSessions).toEqual(['admin']);
    expect(service.session()).toEqual({
      username: 'admin',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(service.username()).toBe('admin');
    expect(service.isAuthenticated()).toBe(true);

    const persisted = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    expect(persisted).toContain('access-token');
    expect(persisted).toContain('refresh-token');
    expect(persisted).not.toContain('not-persisted');
  });

  it('restores a valid persisted session', () => {
    window.localStorage.setItem(
      AUTH_SESSION_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        username: 'persisted-user',
        accessToken: 'persisted-access',
        refreshToken: 'persisted-refresh',
      }),
    );

    const service = TestBed.inject(AuthService);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.username()).toBe('persisted-user');
    expect(service.getAccessToken()).toBe('persisted-access');
  });

  it('discards corrupt or expired persisted sessions', () => {
    window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, '{invalid json');
    const corruptService = TestBed.inject(AuthService);

    expect(corruptService.isAuthenticated()).toBe(false);
    expect(window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();

    TestBed.resetTestingModule();
    window.localStorage.setItem(
      AUTH_SESSION_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        username: 'expired-user',
        accessToken: 'expired-access',
        refreshToken: createJwt(Math.floor(Date.now() / 1_000) - 60),
      }),
    );
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    const expiredService = TestBed.inject(AuthService);
    expect(expiredService.isAuthenticated()).toBe(false);
    expect(window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
  });

  it('shares one refresh request across concurrent callers and rotates tokens', () => {
    const service = TestBed.inject(AuthService);
    const httpMock = TestBed.inject(HttpTestingController);
    establishSession(service, httpMock);
    const refreshedTokens: string[] = [];

    const firstRefresh = service.refreshAccessToken();
    const secondRefresh = service.refreshAccessToken();
    expect(firstRefresh).toBe(secondRefresh);

    firstRefresh.subscribe((token) => refreshedTokens.push(token));
    secondRefresh.subscribe((token) => refreshedTokens.push(token));

    const request = httpMock.expectOne(refreshUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ refresh: 'refresh-token' });
    request.flush({ access: 'new-access', refresh: 'rotated-refresh' });

    expect(refreshedTokens).toEqual(['new-access', 'new-access']);
    expect(service.session()).toEqual({
      username: 'admin',
      accessToken: 'new-access',
      refreshToken: 'rotated-refresh',
    });
  });

  it('clears the session when refresh fails', () => {
    const service = TestBed.inject(AuthService);
    const httpMock = TestBed.inject(HttpTestingController);
    establishSession(service, httpMock);
    const errors: unknown[] = [];

    service.refreshAccessToken().subscribe({ error: (error: unknown) => errors.push(error) });

    httpMock
      .expectOne(refreshUrl)
      .flush(
        { detail: 'Token is invalid or expired' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(errors).toHaveLength(1);
    expect(service.isAuthenticated()).toBe(false);
    expect(window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
  });

  it('logs out and removes the persisted session', () => {
    const service = TestBed.inject(AuthService);
    const httpMock = TestBed.inject(HttpTestingController);
    establishSession(service, httpMock);

    service.logout();

    expect(service.session()).toBeNull();
    expect(service.username()).toBeNull();
    expect(service.getAccessToken()).toBeNull();
    expect(window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
  });

  function establishSession(service: AuthService, httpMock: HttpTestingController): void {
    service.login({ username: 'admin', password: 'secret' }).subscribe();
    httpMock.expectOne(loginUrl).flush({ access: 'access-token', refresh: 'refresh-token' });
  }
});

function createJwt(expiration: number): string {
  const payload = window
    .btoa(JSON.stringify({ exp: expiration }))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `header.${payload}.signature`;
}
