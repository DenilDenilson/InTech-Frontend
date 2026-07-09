import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../environments/environment';
import { App } from './app';

describe('App', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create the app shell', () => {
    const fixture = TestBed.createComponent(App);

    fixture.detectChanges();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/readyz`);
    expect(req.request.method).toBe('GET');
    req.flush({ status: 'ready' });

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('InTech Admin');
    expect(compiled.textContent).toContain('Personas');
    expect(compiled.textContent).toContain('Productos');
    expect(compiled.textContent).toContain('Operativo');
  });
});