import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';

import { AuthSession, LoginCredentials } from '../../../../core/models/auth';
import { AuthService } from '../../../../core/services/auth.service';
import { LoginPageComponent } from './login-page';

describe('LoginPageComponent', () => {
  const session: AuthSession = {
    username: 'admin',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  };
  let fixture: ComponentFixture<LoginPageComponent>;
  let loginSpy: ReturnType<typeof vi.fn>;
  let navigateByUrlSpy: ReturnType<typeof vi.fn>;
  let returnUrl: string | null;

  beforeEach(async () => {
    returnUrl = '/products/new?from=list';
    loginSpy = vi.fn<(credentials: LoginCredentials) => Observable<AuthSession>>(() => of(session));
    navigateByUrlSpy = vi.fn(() => Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: { get: () => returnUrl } },
          },
        },
        {
          provide: Router,
          useValue: { navigateByUrl: navigateByUrlSpy },
        },
        {
          provide: AuthService,
          useValue: { login: loginSpy },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPageComponent);
  });

  it('requires username and password', () => {
    fixture.componentInstance.login();

    expect(fixture.componentInstance.form.invalid).toBe(true);
    expect(fixture.componentInstance.form.controls.username.touched).toBe(true);
    expect(fixture.componentInstance.form.controls.password.touched).toBe(true);
    expect(loginSpy).not.toHaveBeenCalled();
  });

  it('trims the username, keeps the password intact and returns safely', () => {
    fixture.componentInstance.form.setValue({
      username: '  admin  ',
      password: ' password with spaces ',
    });

    fixture.componentInstance.login();

    expect(loginSpy).toHaveBeenCalledWith({
      username: 'admin',
      password: ' password with spaces ',
    });
    expect(navigateByUrlSpy).toHaveBeenCalledWith('/products/new?from=list', {
      replaceUrl: true,
    });
    expect(fixture.componentInstance.isSubmitting()).toBe(false);
  });

  it('rejects an external returnUrl', async () => {
    returnUrl = '//external.example/steal';
    fixture = TestBed.createComponent(LoginPageComponent);
    fixture.componentInstance.form.setValue({ username: 'admin', password: 'secret' });

    fixture.componentInstance.login();

    expect(navigateByUrlSpy).toHaveBeenCalledWith('/persons', { replaceUrl: true });
  });

  it('shows a clear message for invalid credentials', () => {
    loginSpy.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })),
    );
    fixture.componentInstance.form.setValue({ username: 'admin', password: 'wrong' });

    fixture.componentInstance.login();
    fixture.detectChanges();

    expect(fixture.componentInstance.errorMessage()).toBe('Usuario o contraseña incorrectos.');
    expect(fixture.nativeElement.textContent).toContain('Usuario o contraseña incorrectos.');
  });

  it('does not navigate from a login response after the page is destroyed', () => {
    const pendingLogin = new Subject<AuthSession>();
    loginSpy.mockReturnValue(pendingLogin);
    fixture.componentInstance.form.setValue({ username: 'admin', password: 'secret' });
    fixture.componentInstance.login();

    fixture.destroy();
    pendingLogin.next(session);
    pendingLogin.complete();

    expect(navigateByUrlSpy).not.toHaveBeenCalled();
  });
});
