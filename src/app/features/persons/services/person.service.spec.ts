import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { PersonPayload } from '../../../core/models/person';
import { PersonService } from './person.service';

describe('PersonService', () => {
  let service: PersonService;
  let httpMock: HttpTestingController;

  const apiUrl = `${environment.apiBaseUrl}/api/v1/persons/`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PersonService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(PersonService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should list persons with filters', () => {
    service
      .getPersons({
        email: 'ana@example.com',
        last_name: 'Torres',
        ordering: '-created_at',
        page: 2,
      })
      .subscribe((response) => {
        expect(response.count).toBe(1);
        expect(response.results[0].email).toBe('ana@example.com');
      });

    const req = httpMock.expectOne((request) => request.url === apiUrl);

    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('email')).toBe('ana@example.com');
    expect(req.request.params.get('last_name')).toBe('Torres');
    expect(req.request.params.get('ordering')).toBe('-created_at');
    expect(req.request.params.get('page')).toBe('2');

    req.flush({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 'person-1',
          first_name: 'Ana',
          last_name: 'Torres',
          email: 'ana@example.com',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    });
  });

  it('should list all persons by following each next URL until it is null', () => {
    const secondPageUrl = `${apiUrl}?ordering=-created_at&page=2`;
    const thirdPageUrl = `${apiUrl}?cursor=next-page-token`;

    service.getAllPersons({ ordering: '-created_at' }).subscribe((persons) => {
      expect(persons.map((person) => person.id)).toEqual(['person-1', 'person-2', 'person-3']);
    });

    const firstPageRequest = httpMock.expectOne(
      (request) => request.url === apiUrl && request.params.get('ordering') === '-created_at',
    );

    expect(firstPageRequest.request.method).toBe('GET');

    firstPageRequest.flush({
      count: 3,
      next: secondPageUrl,
      previous: null,
      results: [
        {
          id: 'person-1',
          first_name: 'Ana',
          last_name: 'Torres',
          email: 'ana@example.com',
          created_at: '2026-01-03T00:00:00Z',
        },
      ],
    });

    const secondPageRequest = httpMock.expectOne(secondPageUrl);

    expect(secondPageRequest.request.method).toBe('GET');

    secondPageRequest.flush({
      count: 3,
      next: thirdPageUrl,
      previous: apiUrl,
      results: [
        {
          id: 'person-2',
          first_name: 'Luis',
          last_name: 'Rojas',
          email: 'luis@example.com',
          created_at: '2026-01-02T00:00:00Z',
        },
      ],
    });

    const thirdPageRequest = httpMock.expectOne(thirdPageUrl);

    expect(thirdPageRequest.request.method).toBe('GET');

    thirdPageRequest.flush({
      count: 3,
      next: null,
      previous: secondPageUrl,
      results: [
        {
          id: 'person-3',
          first_name: 'Marta',
          last_name: 'Diaz',
          email: 'marta@example.com',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    });
  });

  it('should create a person', () => {
    const payload: PersonPayload = {
      first_name: 'Ana',
      last_name: 'Torres',
      email: 'ana@example.com',
    };

    service.createPerson(payload).subscribe((person) => {
      expect(person.id).toBe('person-1');
      expect(person.email).toBe(payload.email);
    });

    const req = httpMock.expectOne(apiUrl);

    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);

    req.flush({
      id: 'person-1',
      ...payload,
      created_at: '2026-01-01T00:00:00Z',
    });
  });

  it('should update a person', () => {
    const payload: PersonPayload = {
      first_name: 'Ana',
      last_name: 'Lopez',
      email: 'ana@example.com',
    };

    service.updatePerson('person-1', payload).subscribe((person) => {
      expect(person.last_name).toBe('Lopez');
    });

    const req = httpMock.expectOne(`${apiUrl}person-1/`);

    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(payload);

    req.flush({
      id: 'person-1',
      ...payload,
      created_at: '2026-01-01T00:00:00Z',
    });
  });

  it('should delete a person', () => {
    service.deletePerson('person-1').subscribe((response) => {
      expect(response).toBeNull();
    });

    const req = httpMock.expectOne(`${apiUrl}person-1/`);

    expect(req.request.method).toBe('DELETE');

    req.flush(null);
  });
});
