import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PaginatedResponse } from '../../../core/models/paginated-response';
import { Person, PersonFilters, PersonPayload } from '../../../core/models/person';
import { cleanParams } from '../../../shared/utils/http-params';

@Injectable({
  providedIn: 'root',
})
export class PersonService {
  private readonly apiUrl = `${environment.apiBaseUrl}/api/v1/persons/`;

  constructor(private readonly http: HttpClient) {}

  getPersons(filters: PersonFilters = {}): Observable<PaginatedResponse<Person>> {
    return this.http.get<PaginatedResponse<Person>>(this.apiUrl, {
      params: cleanParams(filters as Record<string, unknown>),
    });
  }

  getPerson(id: string): Observable<Person> {
    return this.http.get<Person>(`${this.apiUrl}${id}/`);
  }

  createPerson(payload: PersonPayload): Observable<Person> {
    return this.http.post<Person>(this.apiUrl, payload);
  }

  updatePerson(id: string, payload: PersonPayload): Observable<Person> {
    return this.http.patch<Person>(`${this.apiUrl}${id}/`, payload);
  }

  deletePerson(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }
}