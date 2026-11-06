import { retry, throwError, timer } from 'rxjs';

const NETWORK_RETRIES = 2;
const RETRY_DELAY_MS = 500;

// Solo para lecturas: reintentar un alta crearía wallets duplicadas porque el contrato no es idempotente.
export function retryOnNetworkError<T>() {
  return retry<T>({
    count: NETWORK_RETRIES,
    delay: (error) => (error?.status === 0 ? timer(RETRY_DELAY_MS) : throwError(() => error)),
  });
}
