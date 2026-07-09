import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PaginatedResponse } from '../../../core/models/paginated-response';
import { Product, ProductFilters, ProductPayload } from '../../../core/models/product';
import { cleanParams } from '../../../shared/utils/http-params';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly apiUrl = `${environment.apiBaseUrl}/api/v1/products/`;

  constructor(private readonly http: HttpClient) {}

  getProducts(filters: ProductFilters = {}): Observable<PaginatedResponse<Product>> {
    return this.http.get<PaginatedResponse<Product>>(this.apiUrl, {
      params: cleanParams(filters as Record<string, unknown>),
    });
  }

  getProduct(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}${id}/`);
  }

  createProduct(payload: ProductPayload): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, payload);
  }

  updateProduct(id: string, payload: ProductPayload): Observable<Product> {
    return this.http.patch<Product>(`${this.apiUrl}${id}/`, payload);
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }
}