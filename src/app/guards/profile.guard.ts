import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ProfileGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.authService.user$.pipe(
      take(1),
      map(user => {
        console.log('Profile guard check:', user);
        if (!user?.role) {
          this.router.navigate(['/register']);
          return false;
        }
        return true;
      })
    );
  }
} 