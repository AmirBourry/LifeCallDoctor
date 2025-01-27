import { Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  constructor(
    private auth: Auth,
    private firestore: Firestore
  ) {}

  async createPersonnel(data: {
    email: string;
    password: string;
    nom: string;
    prenom: string;
    role: 'medecin' | 'infirmier';
    specialite?: string;
  }) {
    try {
      // 1. Créer l'utilisateur dans Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        data.email,
        data.password
      );

      // 2. Créer le document personnel correspondant
      await setDoc(doc(this.firestore, 'personnel', userCredential.user.uid), {
        email: data.email,
        nom: data.nom,
        prenom: data.prenom,
        role: data.role,
        specialite: data.specialite || '',
        isAvailable: true,
        lastActive: new Date()
      });

      return userCredential.user.uid;
    } catch (error) {
      console.error('Erreur lors de la création du personnel:', error);
      throw error;
    }
  }
} 