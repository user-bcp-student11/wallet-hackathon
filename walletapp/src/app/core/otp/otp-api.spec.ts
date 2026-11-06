import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api-base-url';
import { OtpApi } from './otp-api';
import { describeOtpRequestError, describeOtpVerifyError } from './otp-error';

describe('OtpApi', () => {
  let api: OtpApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://mock.test' },
      ],
    });
    api = TestBed.inject(OtpApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requestCode: POST /otp/challenges con el userId; la respuesta no incluye el código', () => {
    let received: { challengeId: string; expiresInSeconds: number } | undefined;

    api.requestCode('user-1').subscribe((value) => (received = value));

    const req = http.expectOne('http://mock.test/otp/challenges');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ userId: 'user-1' });
    req.flush(
      { challengeId: 'otp-1', expiresInSeconds: 300 },
      { status: 201, statusText: 'Created' },
    );

    expect(received).toEqual({ challengeId: 'otp-1', expiresInSeconds: 300 });
    expect(Object.keys(received ?? {})).not.toContain('code');
  });

  it('verifyCode: POST /otp/challenges/{id}/verify con el código en el cuerpo', () => {
    api.verifyCode('otp-1', '123456').subscribe();

    const req = http.expectOne('http://mock.test/otp/challenges/otp-1/verify');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ code: '123456' });
    expect(req.request.urlWithParams).not.toContain('123456');
    req.flush({ challengeId: 'otp-1', status: 'VERIFIED' });
  });

  it('codifica el id del reto en la URL', () => {
    api.verifyCode('a/b', '1').subscribe();

    http.expectOne('http://mock.test/otp/challenges/a%2Fb/verify').flush({});
  });
});

const httpError = (status: number, body: unknown = null) =>
  new HttpErrorResponse({ status, error: body });

describe('describeOtpVerifyError', () => {
  it('código incorrecto: indica los intentos restantes y no pide un código nuevo', () => {
    const two = describeOtpVerifyError(
      httpError(422, { error: 'OTP_INVALID', attemptsRemaining: 2 }),
    );
    const one = describeOtpVerifyError(
      httpError(422, { error: 'OTP_INVALID', attemptsRemaining: 1 }),
    );

    expect(two.message).toBe('El código no es correcto. Te quedan 2 intentos.');
    expect(one.message).toBe('El código no es correcto. Te queda 1 intento.');
    expect(two.requiresNewCode).toBe(false);
    expect(two.attemptsRemaining).toBe(2);
  });

  it('intentos agotados, vencido, reemplazado y ya usado exigen un código nuevo', () => {
    const cases: [number, string][] = [
      [429, 'OTP_ATTEMPTS_EXCEEDED'],
      [410, 'OTP_EXPIRED'],
      [404, 'OTP_CHALLENGE_NOT_FOUND'],
      [409, 'OTP_ALREADY_USED'],
    ];
    for (const [status, code] of cases) {
      const error = describeOtpVerifyError(httpError(status, { error: code }));

      expect(error.requiresNewCode).toBe(true);
      expect(error.message).toContain('código');
    }
  });

  it('conexión y 5xx no exigen un código nuevo', () => {
    expect(describeOtpVerifyError(httpError(0)).kind).toBe('connection');
    expect(describeOtpVerifyError(httpError(503)).kind).toBe('unavailable');
    expect(describeOtpVerifyError(httpError(0)).requiresNewCode).toBe(false);
  });

  it('un 404 sin el código esperado es un error genérico', () => {
    const error = describeOtpVerifyError(httpError(404, { error: 'NOT_FOUND' }));

    expect(error.kind).toBe('unknown');
    expect(error.requiresNewCode).toBe(false);
  });

  it('400 pide ingresar el código', () => {
    expect(describeOtpVerifyError(httpError(400)).message).toBe(
      'Ingresa el código de verificación.',
    );
  });
});

describe('describeOtpRequestError', () => {
  it('persona no encontrada', () => {
    const error = describeOtpRequestError(httpError(404, { error: 'PERSON_NOT_FOUND' }));

    expect(error.kind).toBe('not-found');
  });

  it('conexión, 5xx, 429 y desconocido', () => {
    expect(describeOtpRequestError(httpError(0)).kind).toBe('connection');
    expect(describeOtpRequestError(httpError(500)).kind).toBe('unavailable');
    expect(describeOtpRequestError(httpError(429)).kind).toBe('limit');
    expect(describeOtpRequestError(new Error('x')).kind).toBe('unknown');
  });
});
