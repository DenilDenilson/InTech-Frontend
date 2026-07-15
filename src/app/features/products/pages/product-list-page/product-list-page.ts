import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, finalize } from 'rxjs';

import { Product, ProductFilters } from '../../../../core/models/product';
import { PersonService } from '../../../persons/services/person.service';
import { ProductService } from '../../services/product.service';

type ProductOrdering = 'price' | '-price' | 'created_at' | '-created_at';
type SortableProductField = 'price' | 'created_at';

interface OwnerDisplay {
  name: string;
  email: string;
}

@Component({
  selector: 'app-product-list-page',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './product-list-page.html',
})
export class ProductListPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly products = signal<Product[]>([]);
  readonly ownerMap = signal<Record<string, OwnerDisplay>>({});

  readonly count = signal(0);
  readonly page = signal(1);
  readonly next = signal<string | null>(null);
  readonly previous = signal<string | null>(null);

  readonly isLoading = signal(false);
  readonly isDeletingId = signal<string | null>(null);
  readonly errorMessage = signal('');

  readonly pageSize = 10;

  readonly totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.count() / this.pageSize));
  });

  readonly visiblePages = computed(() => {
    const currentPage = this.page();
    const totalPages = this.totalPages();

    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  });

  readonly filtersForm = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    sku: new FormControl('', { nonNullable: true }),
    price_min: new FormControl('', { nonNullable: true }),
    price_max: new FormControl('', { nonNullable: true }),
    ordering: new FormControl<ProductOrdering>('-created_at', { nonNullable: true }),
  });

  constructor(
    private readonly productService: ProductService,
    private readonly personService: PersonService,
  ) {}

  ngOnInit(): void {
    this.loadOwners();
    this.loadProducts();
    this.setupRealtimeFilters();
  }

  private setupRealtimeFilters(): void {
    this.filtersForm.valueChanges
      .pipe(debounceTime(350), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadProducts(1);
      });
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

  loadOwners(): void {
    this.personService.getAllPersons({ ordering: '-created_at' }).subscribe({
      next: (owners) => {
        const ownerMap = owners.reduce<Record<string, OwnerDisplay>>((acc, owner) => {
          acc[owner.id] = {
            name: `${owner.first_name} ${owner.last_name}`.trim(),
            email: owner.email,
          };

          return acc;
        }, {});

        this.ownerMap.set(ownerMap);
      },
      error: () => {
        this.ownerMap.set({});
      },
    });
  }

  onSearch(): void {
    this.loadProducts(1);
  }

  clearFilters(): void {
    this.filtersForm.reset(
      {
        q: '',
        sku: '',
        price_min: '',
        price_max: '',
        ordering: '-created_at',
      },
      { emitEvent: false },
    );

    this.loadProducts(1);
  }

  changeOrdering(field: SortableProductField): void {
    const currentOrdering = this.filtersForm.controls.ordering.value;

    const nextOrdering: ProductOrdering = currentOrdering === field ? `-${field}` : field;

    this.filtersForm.controls.ordering.setValue(nextOrdering);
  }

  getSortIndicator(field: SortableProductField): string {
    const currentOrdering = this.filtersForm.controls.ordering.value;

    if (currentOrdering === field) {
      return '↑';
    }

    if (currentOrdering === `-${field}`) {
      return '↓';
    }

    return '';
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page() || this.isLoading()) {
      return;
    }

    this.loadProducts(page);
  }

  ownerDisplay(ownerId: string | null): OwnerDisplay | null {
    if (!ownerId) {
      return null;
    }

    return this.ownerMap()[ownerId] ?? null;
  }

  shortUuid(id: string): string {
    return id.slice(0, 8);
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
