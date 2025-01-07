import { Injectable } from '@angular/core';
import { Auth, User, signInWithEmailAndPassword, signOut, user } from '@angular/fire/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();

  constructor(
    private auth: Auth,
    private router: Router
  ) {
    user(this.auth).subscribe((user: User | null) => {
      this.userSubject.next(user);
    });
  }

  async login(email: string, password: string): Promise<any> {
    try {
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      return result;
    } catch (error) {
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      await this.router.navigate(['/login']);
    } catch (error) {
      throw error;
    }
  }

  isAuthenticated(): Observable<boolean> {
    return new Observable(subscriber => {
      user(this.auth).subscribe(user => {
        subscriber.next(!!user);
      });
    });
  }
} 