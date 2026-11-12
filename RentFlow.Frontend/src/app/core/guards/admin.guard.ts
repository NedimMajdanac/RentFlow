import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CurrentUserService } from '../services/current-user.service';

export const adminGuard: CanActivateFn = () => {
  const me = inject(CurrentUserService);
  return me.isAdmin() ? true : inject(Router).createUrlTree(['/forbidden']);
};