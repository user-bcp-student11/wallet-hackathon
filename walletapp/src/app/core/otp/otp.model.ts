// Tipos del contrato bcp-wallet-mock-openapi.yaml para el OTP simulado.

/** Respuesta 201 de POST /otp/challenges (esquema `OtpChallenge`). El código NO viene aquí. */
export interface OtpChallenge {
  /** ID del reto. Se envía a /verify y luego como `otpChallengeId` al activar. */
  challengeId: string;
  /** Vigencia del código en segundos. */
  expiresInSeconds: number;
}

/** Respuesta 200 de POST /otp/challenges/{id}/verify (esquema `OtpVerified`). */
export interface OtpVerified {
  challengeId: string;
  status: 'VERIFIED';
}
