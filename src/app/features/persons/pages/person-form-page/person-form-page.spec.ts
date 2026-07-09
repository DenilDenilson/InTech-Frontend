import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';

import { PersonFormPageComponent } from './person-form-page';

describe('PersonFormPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonFormPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => null,
              },
            },
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(PersonFormPageComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('should require first_name, last_name and valid email', () => {
    const fixture = TestBed.createComponent(PersonFormPageComponent);
    const component = fixture.componentInstance;

    component.form.setValue({
      first_name: '',
      last_name: '',
      email: 'invalid-email',
    });

    expect(component.form.invalid).toBe(true);
    expect(component.form.controls.first_name.invalid).toBe(true);
    expect(component.form.controls.last_name.invalid).toBe(true);
    expect(component.form.controls.email.invalid).toBe(true);
  });

  it('should be valid with correct person data', () => {
    const fixture = TestBed.createComponent(PersonFormPageComponent);
    const component = fixture.componentInstance;

    component.form.setValue({
      first_name: 'Ana',
      last_name: 'Torres',
      email: 'ana@example.com',
    });

    expect(component.form.valid).toBe(true);
  });
});