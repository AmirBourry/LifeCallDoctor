import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { map, take } from 'rxjs/operators';

export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.user$.pipe(
    take(1),
    map(user => {
      console.log('Auth guard check:', user);
      if (!user) {
        router.navigate(['/login']);
        return false;
      }
      return true;
    })
  );
}; 