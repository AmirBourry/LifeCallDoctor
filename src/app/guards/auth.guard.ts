import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return authService.user$.pipe(
    take(1),
    map(user => {
      if (!user) {
        router.navigate(['/login']);
        return false;
      }
      console.log("path", route.routeConfig?.path);
      console.log("role", user.role);
      

      // Vérification spécifique pour la route /sensors
      if (route.routeConfig?.path === 'sensors') {
        if (user.role !== 'infirmier') {
          router.navigate(['/login']);
          return false;
        }
      }
      
      return true;
    })
  );
}; 