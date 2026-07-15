import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { AUTH_SESSION_STORAGE_KEY, AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  const apiBaseUrl = environment.apiBaseUrl.replace(/\/+$/, '');
  const personsUrl = `${apiBaseUrl}/api/v1/persons/`;
  const productsUrl = `${apiBaseUrl}/api/v1/products/`;
  const refreshUrl = `${apiBaseUrl}/api/v1/auth/refresh/`;

  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    window.localStorage.clear();
    persistSession();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    window.localStorage.clear();
  });

  it('adds Bearer only to backend API requests and excludes auth endpoints', () => {
    http.get(personsUrl).subscribe();
    const apiRequest = httpMock.expectOne(personsUrl);
    expect(apiRequest.request.headers.get('Authorization')).toBe('Bearer access-token');
    apiRequest.flush({ count: 0, next: null, previous: null, results: [] });

    const loginUrl = `${apiBaseUrl}/api/v1/auth/login/`;
    http.post(loginUrl, {}).subscribe();
    const authRequest = httpMock.expectOne(loginUrl);
    expect(authRequest.request.headers.has('Authorization')).toBe(false);
    authRequest.flush({ access: 'access', refresh: 'refresh' });

    const healthUrl = `${apiBaseUrl}/readyz/`;
    http.get(healthUrl).subscribe();
    const healthRequest = httpMock.expectOne(healthUrl);
    expect(healthRequest.request.headers.has('Authorization')).toBe(false);
    healthRequest.flush({ status: 'ready' });
  });

  it('shares refresh for concurrent 401 responses and retries each request once', () => {
    const results: unknown[] = [];
    http.post(personsUrl, { first_name: 'Ana' }).subscribe((value) => results.push(value));
    http.post(productsUrl, { name: 'Laptop' }).subscribe((value) => results.push(value));

    const initialRequests = httpMock.match(
      (request) => request.url === personsUrl || request.url === productsUrl,
    );
    expect(initialRequests).toHaveLength(2);
    initialRequests.forEach((request) => {
      expect(request.request.headers.get('Authorization')).toBe('Bearer access-token');
      request.flush(null, { status: 401, statusText: 'Unauthorized' });
    });

    const refreshRequest = httpMock.expectOne(refreshUrl);
    expect(refreshRequest.request.body).toEqual({ refresh: 'refresh-token' });
    refreshRequest.flush({ access: 'fresh-access' });

    const retriedRequests = httpMock.match(
      (request) => request.url === personsUrl || request.url === productsUrl,
    );
    expect(retriedRequests).toHaveLength(2);
    retriedRequests.forEach((request) => {
      expect(request.request.headers.get('Authorization')).toBe('Bearer fresh-access');
      request.flush({ ok: true });
    });

    expect(results).toHaveLength(2);
    expect(TestBed.inject(AuthService).getAccessToken()).toBe('fresh-access');
  });

  it('clears a stale session and retries a public GET anonymously when refresh fails', () => {
    const results: unknown[] = [];
    const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate');
    http.get(personsUrl).subscribe((value) => results.push(value));

    const initialRequest = httpMock.expectOne(personsUrl);
    expect(initialRequest.request.headers.get('Authorization')).toBe('Bearer access-token');
    initialRequest.flush(null, { status: 401, statusText: 'Unauthorized' });

    httpMock.expectOne(refreshUrl).flush(null, { status: 401, statusText: 'Unauthorized' });

    const anonymousRetry = httpMock.expectOne(personsUrl);
    expect(anonymousRetry.request.headers.has('Authorization')).toBe(false);
    anonymousRetry.flush({ count: 0, next: null, previous: null, results: [] });

    expect(results).toHaveLength(1);
    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('falls back anonymously when a refreshed token is also rejected on a public GET', () => {
    const results: unknown[] = [];
    const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate');
    http.get(productsUrl).subscribe((value) => results.push(value));

    httpMock.expectOne(productsUrl).flush(null, { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne(refreshUrl).flush({ access: 'fresh-but-rejected' });

    const authenticatedRetry = httpMock.expectOne(productsUrl);
    expect(authenticatedRetry.request.headers.get('Authorization')).toBe(
      'Bearer fresh-but-rejected',
    );
    authenticatedRetry.flush(null, { status: 401, statusText: 'Unauthorized' });

    const anonymousRetry = httpMock.expectOne(productsUrl);
    expect(anonymousRetry.request.headers.has('Authorization')).toBe(false);
    anonymousRetry.flush({ count: 0, next: null, previous: null, results: [] });

    expect(results).toHaveLength(1);
    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('redirects a failed protected write to login with a local returnUrl', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/products/new');
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const errors: unknown[] = [];

    http.post(productsUrl, { name: 'Laptop' }).subscribe({
      error: (error: unknown) => errors.push(error),
    });
    httpMock.expectOne(productsUrl).flush(null, { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne(refreshUrl).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(errors).toHaveLength(1);
    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/products/new' },
      replaceUrl: true,
    });
  });

  it('preserves a new login that completes while an old refresh is pending', () => {
    const authService = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');
    const results: unknown[] = [];

    http.post(productsUrl, { name: 'Laptop' }).subscribe((value) => results.push(value));
    httpMock.expectOne(productsUrl).flush(null, { status: 401, statusText: 'Unauthorized' });
    const oldRefresh = httpMock.expectOne(refreshUrl);

    authService.login({ username: 'other-user', password: 'new-password' }).subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/auth/login/`).flush({
      access: 'new-login-access',
      refresh: 'new-login-refresh',
    });

    oldRefresh.flush(null, { status: 401, statusText: 'Unauthorized' });

    const recoveredRequest = httpMock.expectOne(productsUrl);
    expect(recoveredRequest.request.headers.get('Authorization')).toBe('Bearer new-login-access');
    recoveredRequest.flush({ ok: true });

    expect(results).toEqual([{ ok: true }]);
    expect(authService.username()).toBe('other-user');
    expect(authService.getAccessToken()).toBe('new-login-access');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('preserves a new login when the retry for the previous session gets a 401', () => {
    const authService = TestBed.inject(AuthService);
    const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate');
    const results: unknown[] = [];

    http.post(personsUrl, { first_name: 'Ana' }).subscribe((value) => results.push(value));
    httpMock.expectOne(personsUrl).flush(null, { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne(refreshUrl).flush({ access: 'refreshed-old-access' });
    const oldSessionRetry = httpMock.expectOne(personsUrl);

    authService.login({ username: 'other-user', password: 'new-password' }).subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/auth/login/`).flush({
      access: 'new-login-access',
      refresh: 'new-login-refresh',
    });

    oldSessionRetry.flush(null, { status: 401, statusText: 'Unauthorized' });

    const newSessionRetry = httpMock.expectOne(personsUrl);
    expect(newSessionRetry.request.headers.get('Authorization')).toBe('Bearer new-login-access');
    newSessionRetry.flush({ ok: true });

    expect(results).toEqual([{ ok: true }]);
    expect(authService.username()).toBe('other-user');
    expect(authService.getAccessToken()).toBe('new-login-access');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  function persistSession(): void {
    window.localStorage.setItem(
      AUTH_SESSION_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        username: 'admin',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      }),
    );
  }
});
