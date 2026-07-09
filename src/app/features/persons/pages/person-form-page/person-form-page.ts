import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PersonPayload } from '../../../../core/models/person';
import { PersonService } from '../../services/person.service';

@Component({
  selector: 'app-person-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './person-form-page.html',
})
export class PersonFormPageComponent implements OnInit {
  private readonly personId: string | null;

  readonly isEditMode = signal(false);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');

  readonly form = new FormGroup({
    first_name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1), Validators.maxLength(100)],
    }),
    last_name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1), Validators.maxLength(100)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly personService: PersonService,
  ) {
    this.personId = this.route.snapshot.paramMap.get('id');
    this.isEditMode.set(Boolean(this.personId));
  }

  ngOnInit(): void {
    if (this.personId) {
      this.loadPerson(this.personId);
    }
  }

  loadPerson(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.personService
      .getPerson(id)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (person) => {
          this.form.patchValue({
            first_name: person.first_name,
            last_name: person.last_name,
            email: person.email,
          });
        },
        error: () => {
          this.errorMessage.set('No se pudo cargar la persona.');
        },
      });
  }

  savePerson(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const payload: PersonPayload = this.form.getRawValue();

    this.isSaving.set(true);
    this.errorMessage.set('');

    const request$ =
      this.isEditMode() && this.personId
        ? this.personService.updatePerson(this.personId, payload)
        : this.personService.createPerson(payload);

    request$.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: () => {
        this.router.navigate(['/persons']);
      },
      error: (error) => {
        if (error.status === 400) {
          this.errorMessage.set('Revisa los datos. El email podría estar duplicado o ser inválido.');
          return;
        }

        this.errorMessage.set('No se pudo guardar la persona.');
      },
    });
  }

  isInvalid(controlName: 'first_name' | 'last_name' | 'email'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }
}