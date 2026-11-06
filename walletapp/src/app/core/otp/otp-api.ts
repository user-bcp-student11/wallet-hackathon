import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-base-url';
import { OtpChallenge, OtpVerified } from './otp.model';

/**
 * OTP SIMULADO (solo demostración). El servidor imprime el código únicamente en su consola: nunca
 * viaja en la respuesta, así que la aplicación no puede conocerlo. En producción el código se
 * enviaría por un canal real (SMS, correo o app).
 */
@Service()
export class OtpApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** POST /otp/challenges: genera un código para la persona (reemplaza al anterior). */
  requestCode(userId: string): Observable<OtpChallenge> {
    return this.http.post<OtpChallenge>(`${this.baseUrl}/otp/challenges`, { userId });
  }

  /** POST /otp/challenges/{id}/verify: comprueba el código que ingresó la persona. */
  verifyCode(challengeId: string, code: string): Observable<OtpVerified> {
    return this.http.post<OtpVerified>(
      `${this.baseUrl}/otp/challenges/${encodeURIComponent(challengeId)}/verify`,
      { code },
    );
  }
}
