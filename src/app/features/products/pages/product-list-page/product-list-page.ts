import { DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Product, ProductFilters } from '../../../../core/models/product';
import { ProductService } from '../../services/product.service';

type ProductOrdering = 'price' | '-price' | 'created_at' | '-created_at';

@Component({
  selector: 'app-product-list-page',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './product-list-page.html',
})
export class ProductListPageComponent implements OnInit {
  readonly products = signal<Product[]>([]);

  readonly count = signal(0);
  readonly page = signal(1);
  readonly next = signal<string | null>(null);
  readonly previous = signal<string | null>(null);

  readonly isLoading = signal(false);
  readonly isDeletingId = signal<string | null>(null);
  readonly errorMessage = signal('');

  readonly filtersForm = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    sku: new FormControl('', { nonNullable: true }),
    price_min: new FormControl('', { nonNullable: true }),
    price_max: new FormControl('', { nonNullable: true }),
    ordering: new FormControl<ProductOrdering>('-created_at', { nonNullable: true }),
  });

  constructor(private readonly productService: ProductService) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(page = 1): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const filters: ProductFilters = {
      ...this.filtersForm.getRawValue(),
      page,
    };

    this.productService
      .getProducts(filters)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.products.set(response.results);
          this.count.set(response.count);
          this.next.set(response.next);
          this.previous.set(response.previous);
          this.page.set(page);
        },
        error: () => {
          this.products.set([]);
          this.count.set(0);
          this.next.set(null);
          this.previous.set(null);
          this.errorMessage.set('No se pudo cargar la lista de productos.');
        },
      });
  }

  onSearch(): void {
    this.loadProducts(1);
  }

  clearFilters(): void {
    this.filtersForm.reset({
      q: '',
      sku: '',
      price_min: '',
      price_max: '',
      ordering: '-created_at',
    });

    this.loadProducts(1);
  }

  deleteProduct(product: Product): void {
    const confirmed = confirm(`¿Seguro que deseas eliminar el producto ${product.name}?`);

    if (!confirmed) {
      return;
    }

    this.isDeletingId.set(product.id);
    this.errorMessage.set('');

    this.productService
      .deleteProduct(product.id)
      .pipe(finalize(() => this.isDeletingId.set(null)))
      .subscribe({
        next: () => {
          const shouldGoPreviousPage = this.products().length === 1 && this.page() > 1;
          this.loadProducts(shouldGoPreviousPage ? this.page() - 1 : this.page());
        },
        error: () => {
          this.errorMessage.set('No se pudo eliminar el producto.');
        },
      });
  }
}