import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { ProductPayload } from '../../../core/models/product';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;
  let httpMock: HttpTestingController;

  const apiUrl = `${environment.apiBaseUrl}/api/v1/products/`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProductService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ProductService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should list products with filters', () => {
    service
      .getProducts({
        q: 'laptop',
        sku: 'LAP-LEN-001',
        price_min: 100,
        price_max: 5000,
        ordering: '-price',
        page: 2,
      })
      .subscribe((response) => {
        expect(response.count).toBe(1);
        expect(response.results[0].sku).toBe('LAP-LEN-001');
      });

    const req = httpMock.expectOne((request) => request.url === apiUrl);

    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('q')).toBe('laptop');
    expect(req.request.params.get('sku')).toBe('LAP-LEN-001');
    expect(req.request.params.get('price_min')).toBe('100');
    expect(req.request.params.get('price_max')).toBe('5000');
    expect(req.request.params.get('ordering')).toBe('-price');
    expect(req.request.params.get('page')).toBe('2');

    req.flush({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 'product-1',
          name: 'Laptop Lenovo',
          sku: 'LAP-LEN-001',
          price: '3500.00',
          owner: null,
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    });
  });

  it('should create a product', () => {
    const payload: ProductPayload = {
      name: 'Laptop Lenovo',
      sku: 'LAP-LEN-001',
      price: '3500.00',
      owner: null,
    };

    service.createProduct(payload).subscribe((product) => {
      expect(product.id).toBe('product-1');
      expect(product.sku).toBe(payload.sku);
    });

    const req = httpMock.expectOne(apiUrl);

    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);

    req.flush({
      id: 'product-1',
      ...payload,
      created_at: '2026-01-01T00:00:00Z',
    });
  });

  it('should update a product', () => {
    const payload: ProductPayload = {
      name: 'Laptop Updated',
      sku: 'LAP-UPD-001',
      price: '4200.00',
      owner: 'person-1',
    };

    service.updateProduct('product-1', payload).subscribe((product) => {
      expect(product.name).toBe('Laptop Updated');
      expect(product.owner).toBe('person-1');
    });

    const req = httpMock.expectOne(`${apiUrl}product-1/`);

    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(payload);

    req.flush({
      id: 'product-1',
      ...payload,
      created_at: '2026-01-01T00:00:00Z',
    });
  });

  it('should delete a product', () => {
    service.deleteProduct('product-1').subscribe((response) => {
      expect(response).toBeNull();
    });

    const req = httpMock.expectOne(`${apiUrl}product-1/`);

    expect(req.request.method).toBe('DELETE');

    req.flush(null);
  });
});