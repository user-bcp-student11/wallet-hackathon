import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api-base-url';
import { PersonApi } from './person-api';
import { describePersonLookupError, isPersonNotFound } from './person-error';

describe('PersonApi', () => {
  let api: PersonApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://mock.test' },
      ],
    });
    api = TestBed.inject(PersonApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta con POST /persons/lookup y el número en el cuerpo, no en la URL', () => {
    let received: { userId: string } | undefined;

    api
      .lookup({ documentType: 'DNI', documentNumber: '00000001' })
      .subscribe((value) => (received = value));

    const req = http.expectOne('http://mock.test/persons/lookup');
    expect(req.request.method).toBe('POST');
    expect(req.request.urlWithParams).not.toContain('00000001');
    expect(req.request.body).toEqual({ documentType: 'DNI', documentNumber: '00000001' });
    req.flush({ userId: '11111111-2222-4333-8444-555555555555' });

    expect(received).toEqual({ userId: '11111111-2222-4333-8444-555555555555' });
  });
});

function httpError(status: number, body: unknown = null): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: body });
}

describe('describePersonLookupError', () => {
  it('404 PERSON_NOT_FOUND indica de forma explícita que no se encontró', () => {
    const error = describePersonLookupError(httpError(404, { error: 'PERSON_NOT_FOUND' }));

    expect(error.kind).toBe('not-found');
    expect(error.message).toContain('No encontramos a nadie con ese documento');
  });

  it('un error de conexión NO se interpreta como ausencia de la persona', () => {
    const error = describePersonLookupError(httpError(0));

    expect(error.kind).toBe('connection');
    expect(error.message).toContain('no hay conexión');
    expect(error.message).toContain('no significa que no estés registrado');
    expect(error.message).not.toContain('No encontramos a nadie');
  });

  it('un 5xx NO se interpreta como ausencia de la persona', () => {
    const error = describePersonLookupError(httpError(503, { error: 'KYC_UNAVAILABLE' }));

    expect(error.kind).toBe('unavailable');
    expect(error.message).toContain('no significa que no estés registrado');
  });

  it('un 404 sin el código PERSON_NOT_FOUND (ruta equivocada) NO se interpreta como ausencia', () => {
    for (const body of [null, {}, { error: 'NOT_FOUND' }]) {
      const error = describePersonLookupError(httpError(404, body));

      expect(error.kind).toBe('unknown');
      expect(error.message).not.toContain('No encontramos a nadie');
    }
  });

  it('clasifica 400, 413 y 429', () => {
    expect(describePersonLookupError(httpError(400, { error: 'INVALID_REQUEST' })).kind).toBe(
      'validation',
    );
    expect(describePersonLookupError(httpError(413)).kind).toBe('validation');
    expect(describePersonLookupError(httpError(429)).kind).toBe('limit');
  });

  it('un error que no es HTTP es desconocido, no «no encontrado»', () => {
    expect(describePersonLookupError(new Error('boom')).kind).toBe('unknown');
  });
});

describe('isPersonNotFound', () => {
  it('solo es verdadero para 404 con el código PERSON_NOT_FOUND', () => {
    expect(isPersonNotFound(httpError(404, { error: 'PERSON_NOT_FOUND' }))).toBe(true);
    expect(isPersonNotFound(httpError(404, { error: 'NOT_FOUND' }))).toBe(false);
    expect(isPersonNotFound(httpError(500, { error: 'PERSON_NOT_FOUND' }))).toBe(false);
    expect(isPersonNotFound(httpError(0))).toBe(false);
    expect(isPersonNotFound(new Error('x'))).toBe(false);
  });
});
