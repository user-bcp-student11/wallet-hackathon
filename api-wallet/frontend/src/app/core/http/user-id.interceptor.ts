import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { UserSession } from '../session/user-session';

export const userIdInterceptor: HttpInterceptorFn = (request, next) => {
  const { userId } = inject(UserSession);
  return next(request.clone({ setHeaders: { 'X-User-Id': userId } }));
};
