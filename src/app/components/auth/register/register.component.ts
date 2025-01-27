import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCardModule
  ],
  template: `
    <div class="register-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Création de votre profil</mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline">
              <mat-label>Nom</mat-label>
              <input matInput formControlName="nom" required>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Prénom</mat-label>
              <input matInput formControlName="prenom" required>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Rôle</mat-label>
              <mat-select formControlName="role" required>
                <mat-option value="medecin">Médecin</mat-option>
                <mat-option value="infirmier">Infirmier</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Spécialité</mat-label>
              <input matInput formControlName="specialite">
            </mat-form-field>

            <button mat-raised-button color="primary" type="submit" 
                    [disabled]="registerForm.invalid || loading">
              Créer mon profil
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .register-container {
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #f5f5f5;
    }

    mat-card {
      width: 100%;
      max-width: 400px;
      padding: 2rem;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    mat-card-title {
      margin-bottom: 1rem;
    }
  `]
})
export class RegisterComponent {
  registerForm: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      role: ['', Validators.required],
      specialite: ['']
    });
  }

  async onSubmit() {
    if (this.registerForm.valid) {
      this.loading = true;
      try {
        await this.authService.completeProfile(this.registerForm.value);
        this.router.navigate(['/calls']);
      } catch (error) {
        console.error('Erreur lors de la création du profil:', error);
      } finally {
        this.loading = false;
      }
    }
  }
} 