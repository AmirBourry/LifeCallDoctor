import { Injectable } from '@angular/core';
import { Auth, User, signInWithEmailAndPassword, signOut, user } from '@angular/fire/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();

  constructor(
    private auth: Auth,
    private router: Router,
    private firestore: Firestore
  ) {
    user(this.auth).subscribe((user: User | null) => {
      this.userSubject.next(user);
      if (user) {
        this.createOrUpdateUserDocument(user);
      }
    });
  }

  private async createOrUpdateUserDocument(user: User): Promise<void> {
    const userRef = doc(this.firestore, 'users', user.uid);
    try {
      await setDoc(userRef, {
        id: user.uid,
        name: user.displayName || 'Utilisateur',
        email: user.email,
        role: 'medecin',
        status: 'online',
        lastSeen: new Date()
      }, { merge: true });
    } catch (error) {
      console.error('Erreur lors de la création/mise à jour du document utilisateur:', error);
    }
  }

  async login(email: string, password: string): Promise<any> {
    try {
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      await this.createOrUpdateUserDocument(result.user);
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
