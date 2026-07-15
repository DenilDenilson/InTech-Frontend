import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Person } from '../../../../core/models/person';
import { ProductPayload } from '../../../../core/models/product';
import { PersonService } from '../../../persons/services/person.service';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-product-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './product-form-page.html',
})
export class ProductFormPageComponent implements OnInit {
  private readonly productId: string | null;

  readonly owners = signal<Person[]>([]);

  readonly isEditMode = signal(false);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');

  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1), Validators.maxLength(150)],
    }),
    sku: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(50)],
    }),
    price: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    owner: new FormControl<string | null>(null),
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly productService: ProductService,
    private readonly personService: PersonService,
  ) {
    this.productId = this.route.snapshot.paramMap.get('id');
    this.isEditMode.set(Boolean(this.productId));
  }

  ngOnInit(): void {
    this.loadOwners();

    if (this.productId) {
      this.loadProduct(this.productId);
    }
  }

  loadOwners(): void {
    this.personService.getAllPersons({ ordering: '-created_at' }).subscribe({
      next: (owners) => {
        this.owners.set(owners);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar la lista de owners.');
      },
    });
  }

  loadProduct(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.productService
      .getProduct(id)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (product) => {
          this.form.patchValue({
            name: product.name,
            sku: product.sku,
            price: product.price,
            owner: product.owner,
          });
        },
        error: () => {
          this.errorMessage.set('No se pudo cargar el producto.');
        },
      });
  }

  saveProduct(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const rawValue = this.form.getRawValue();

    const payload: ProductPayload = {
      name: rawValue.name,
      sku: rawValue.sku,
      price: rawValue.price,
      owner: rawValue.owner || null,
    };

    this.isSaving.set(true);
    this.errorMessage.set('');

    const request$ =
      this.isEditMode() && this.productId
        ? this.productService.updateProduct(this.productId, payload)
        : this.productService.createProduct(payload);

    request$.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: () => {
        this.router.navigate(['/products']);
      },
      error: (error) => {
        if (error.status === 400) {
          this.errorMessage.set(
            'Revisa los datos. El SKU podría estar duplicado o el precio podría ser inválido.',
          );
          return;
        }

        this.errorMessage.set('No se pudo guardar el producto.');
      },
    });
  }

  isInvalid(controlName: 'name' | 'sku' | 'price' | 'owner'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }
}
