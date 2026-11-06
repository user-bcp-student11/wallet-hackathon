import { HttpInterceptorFn } from '@angular/common/http';

// La misma instancia de HttpRequest se reutiliza al reintentar, por lo que conserva su clave.
const keysByRequest = new WeakMap<object, string>();

export const idempotencyKeyInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.method !== 'POST') {
    return next(request);
  }
  let key = keysByRequest.get(request);
  if (!key) {
    key = crypto.randomUUID();
    keysByRequest.set(request, key);
  }
  return next(request.clone({ setHeaders: { 'Idempotency-Key': key } }));
};
