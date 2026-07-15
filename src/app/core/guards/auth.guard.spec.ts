import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';

import { routes } from '../../app.routes';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let authenticated = false;

  beforeEach(() => {
    authenticated = false;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { isAuthenticated: () => authenticated },
        },
      ],
    });
  });

  it('allows an authenticated user', () => {
    authenticated = true;
    const result = runGuard('/persons/new');

    expect(result).toBe(true);
  });

  it('redirects an anonymous user to login with the requested local URL', () => {
    const result = runGuard('/products/abc/edit') as UrlTree;

    expect(TestBed.inject(Router).serializeUrl(result)).toBe(
      '/login?returnUrl=%2Fproducts%2Fabc%2Fedit',
    );
  });

  it('falls back to a safe URL when router state is not local', () => {
    const result = runGuard('//external.example/path') as UrlTree;

    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/login?returnUrl=%2Fpersons');
  });

  it('protects only new/edit routes and keeps collection routes public', () => {
    const guardedPaths = routes
      .filter((route) => route.canActivate?.includes(authGuard))
      .map((route) => route.path);

    expect(guardedPaths).toEqual([
      'persons/new',
      'persons/:id/edit',
      'products/new',
      'products/:id/edit',
    ]);
    expect(routes.find((route) => route.path === 'persons')?.canActivate).toBeUndefined();
    expect(routes.find((route) => route.path === 'products')?.canActivate).toBeUndefined();
  });

  function runGuard(url: string): ReturnType<typeof authGuard> {
    return TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
  }
});
