import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthFacadeService } from '../services/auth-facade.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthFacadeService).getAccessToken();

  if (!token || req.url.endsWith('/api/auth/login') || req.url.endsWith('/api/auth/refresh')) {
    return next(req);
  }

  return next(req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  }));
};
