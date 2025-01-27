import { Injectable } from '@angular/core';
import { Auth, User, signInWithEmailAndPassword, signOut, onAuthStateChanged } from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc, collection, updateDoc } from '@angular/fire/firestore';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface AppUser extends User {
  role?: 'medecin' | 'infirmier';
  nom?: string;
  prenom?: string;
  specialite?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<AppUser | null>(null);
  user$ = this.userSubject.asObservable();
  private initialized = false;

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router
  ) {
    onAuthStateChanged(this.auth, async (user) => {
      console.log('Auth state changed:', user?.uid);
      if (user) {
        try {
          const personnelDoc = await getDoc(doc(this.firestore, 'personnel', user.uid));
          if (personnelDoc.exists()) {
            const personnelData = personnelDoc.data();
            const authUser: AppUser = {
              ...user,
              role: personnelData['role'],
              nom: personnelData['nom'],
              prenom: personnelData['prenom'],
              specialite: personnelData['specialite']
            };
            this.userSubject.next(authUser);

            // Redirection en fonction du rôle
            const currentUrl = this.router.url;
            if (currentUrl === '/login' || currentUrl === '/register') {
              if (personnelData['role'] === 'medecin') {
                this.router.navigate(['/calls']);
              } else if (personnelData['role'] === 'infirmier') {
                this.router.navigate(['/nurse']);
              }
            }
          } else {
            console.log('Utilisateur sans profil détecté');
            this.userSubject.next(user as AppUser);
            if (this.router.url !== '/register') {
              this.router.navigate(['/register']);
            }
          }
        } catch (error) {
          console.error('Erreur lors de la récupération du profil:', error);
          this.signOut();
        }
      } else {
        this.userSubject.next(null);
        if (this.router.url !== '/login') {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  private async updateUserStatus(uid: string, isAvailable: boolean): Promise<void> {
    try {
      const personnelRef = doc(this.firestore, 'personnel', uid);
      await updateDoc(personnelRef, {
        isAvailable: isAvailable,
        lastActive: new Date()
      });
      console.log(`Status updated for user ${uid}:`, isAvailable);
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  }

  async login(email: string, password: string): Promise<void> {
    try {
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      const personnelDoc = await getDoc(doc(this.firestore, 'personnel', result.user.uid));
      
      if (!personnelDoc.exists()) {
        this.router.navigate(['/register']);
      } else {
        // Mettre à jour le statut comme disponible lors de la connexion
        await this.updateUserStatus(result.user.uid, true);
        console.log('User status set to available after login');

        const personnelData = personnelDoc.data();
        if (personnelData['role'] === 'medecin') {
          this.router.navigate(['/calls']);
        } else if (personnelData['role'] === 'infirmier') {
          this.router.navigate(['/nurse']);
        }
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      if (this.auth.currentUser) {
        // Mettre à jour le statut comme non disponible lors de la déconnexion
        await this.updateUserStatus(this.auth.currentUser.uid, false);
        console.log('User status set to unavailable before logout');
      }
      await signOut(this.auth);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      throw error;
    }
  }

  // Helper methods pour vérifier le rôle
  isMedecin(): Observable<boolean> {
    return this.user$.pipe(
      map(user => user?.role === 'medecin')
    );
  }

  isInfirmier(): Observable<boolean> {
    return this.user$.pipe(
      map(user => user?.role === 'infirmier')
    );
  }

  // Méthode pour obtenir la liste des médecins disponibles
  getMedecinsDisponibles(): Observable<any[]> {
    const personnelRef = collection(this.firestore, 'personnel');
    return from(getDoc(doc(personnelRef, 'medecins'))).pipe(
      map(snapshot => {
        if (!snapshot.exists()) return [];
        const data = snapshot.data();
        return Object.values(data).filter((medecin: any) => medecin.isAvailable);
      })
    );
  }

  async completeProfile(profileData: {
    nom: string;
    prenom: string;
    role: 'medecin' | 'infirmier';
    specialite?: string;
  }): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Aucun utilisateur connecté');

    try {
      await setDoc(doc(this.firestore, 'personnel', user.uid), {
        ...profileData,
        isAvailable: true,
        lastActive: new Date()
      });

      const authUser: AppUser = {
        ...user,
        ...profileData
      };
      this.userSubject.next(authUser);
      
      // Rediriger vers la page appropriée selon le rôle
      const route = profileData.role === 'medecin' ? '/calls' : '/infirmier/calls';
      this.router.navigate([route]);
    } catch (error) {
      console.error('Erreur lors de la création du profil:', error);
      throw error;
    }
  }

  async checkProfile(): Promise<boolean> {
    const user = this.auth.currentUser;
    if (!user) return false;

    const personnelDoc = await getDoc(doc(this.firestore, 'personnel', user.uid));
    return personnelDoc.exists();
  }

  async hasProfile(): Promise<boolean> {
    const user = this.auth.currentUser;
    if (!user) return false;

    const personnelDoc = await getDoc(doc(this.firestore, 'personnel', user.uid));
    return personnelDoc.exists();
  }

  async requireProfile(): Promise<void> {
    if (!(await this.hasProfile())) {
      this.router.navigate(['/register']);
    }
  }
}
