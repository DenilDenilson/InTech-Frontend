import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';

import { ProductFormPageComponent } from './product-form-page';

describe('ProductFormPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductFormPageComponent],
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
    const fixture = TestBed.createComponent(ProductFormPageComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('should require name, sku and non-negative price', () => {
    const fixture = TestBed.createComponent(ProductFormPageComponent);
    const component = fixture.componentInstance;

    component.form.setValue({
      name: '',
      sku: 'AB',
      price: '-1',
      owner: null,
    });

    expect(component.form.invalid).toBe(true);
    expect(component.form.controls.name.invalid).toBe(true);
    expect(component.form.controls.sku.invalid).toBe(true);
    expect(component.form.controls.price.invalid).toBe(true);
  });

  it('should be valid with correct product data and optional owner', () => {
    const fixture = TestBed.createComponent(ProductFormPageComponent);
    const component = fixture.componentInstance;

    component.form.setValue({
      name: 'Laptop Lenovo',
      sku: 'LAP-LEN-001',
      price: '3500.00',
      owner: null,
    });

    expect(component.form.valid).toBe(true);
  });
});