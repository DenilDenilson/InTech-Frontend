import { DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Person, PersonFilters } from '../../../../core/models/person';
import { PersonService } from '../../services/person.service';

type PersonOrdering = 'created_at' | '-created_at';

@Component({
  selector: 'app-person-list-page',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './person-list-page.html',
})
export class PersonListPageComponent implements OnInit {
  readonly persons = signal<Person[]>([]);

  readonly count = signal(0);
  readonly page = signal(1);
  readonly next = signal<string | null>(null);
  readonly previous = signal<string | null>(null);

  readonly isLoading = signal(false);
  readonly isDeletingId = signal<string | null>(null);
  readonly errorMessage = signal('');

  readonly filtersForm = new FormGroup({
    email: new FormControl('', { nonNullable: true }),
    last_name: new FormControl('', { nonNullable: true }),
    ordering: new FormControl<PersonOrdering>('-created_at', { nonNullable: true }),
  });

  constructor(private readonly personService: PersonService) {}

  ngOnInit(): void {
    this.loadPersons();
  }

  loadPersons(page = 1): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const filters: PersonFilters = {
      ...this.filtersForm.getRawValue(),
      page,
    };

    this.personService
      .getPersons(filters)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.persons.set(response.results);
          this.count.set(response.count);
          this.next.set(response.next);
          this.previous.set(response.previous);
          this.page.set(page);
        },
        error: () => {
          this.persons.set([]);
          this.count.set(0);
          this.next.set(null);
          this.previous.set(null);
          this.errorMessage.set('No se pudo cargar la lista de personas.');
        },
      });
  }

  onSearch(): void {
    this.loadPersons(1);
  }

  clearFilters(): void {
    this.filtersForm.reset({
      email: '',
      last_name: '',
      ordering: '-created_at',
    });

    this.loadPersons(1);
  }

  deletePerson(person: Person): void {
    const fullName = `${person.first_name} ${person.last_name}`.trim();
    const confirmed = confirm(`¿Seguro que deseas eliminar a ${fullName}?`);

    if (!confirmed) {
      return;
    }

    this.isDeletingId.set(person.id);
    this.errorMessage.set('');

    this.personService
      .deletePerson(person.id)
      .pipe(finalize(() => this.isDeletingId.set(null)))
      .subscribe({
        next: () => {
          const shouldGoPreviousPage = this.persons().length === 1 && this.page() > 1;
          this.loadPersons(shouldGoPreviousPage ? this.page() - 1 : this.page());
        },
        error: () => {
          this.errorMessage.set('No se pudo eliminar la persona.');
        },
      });
  }
}