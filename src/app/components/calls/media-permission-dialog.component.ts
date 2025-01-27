import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-media-permission-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>Permissions nécessaires</h2>
    <mat-dialog-content>
      <p>Pour passer des appels vidéo, l'application a besoin d'accéder à :</p>
      <ul>
        <li>Votre caméra</li>
        <li>Votre microphone</li>
      </ul>
      <p>Veuillez autoriser ces accès dans votre navigateur quand ils seront demandés.</p>
      
      <div *ngIf="errorMessage" class="error-message">
        <p>{{ errorMessage }}</p>
        <p>Solutions possibles :</p>
        <ul>
          <li>Vérifiez les paramètres de votre navigateur</li>
          <li>Cliquez sur l'icône de caméra/microphone dans la barre d'adresse</li>
          <li>Rafraîchissez la page et réessayez</li>
        </ul>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="openBrowserSettings()">Ouvrir les paramètres</button>
      <button mat-button [mat-dialog-close]="true">Compris</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .error-message {
      color: #f44336;
      margin-top: 16px;
      padding: 8px;
      border: 1px solid #f44336;
      border-radius: 4px;
    }
  `]
})
export class MediaPermissionDialogComponent implements OnInit {
  errorMessage: string = '';

  constructor(
    private dialogRef: MatDialogRef<MediaPermissionDialogComponent>
  ) {}

  ngOnInit() {
    // Vérifier si le navigateur est Edge ou Arc
    const isEdge = navigator.userAgent.includes('Edg');
    const isArc = navigator.userAgent.includes('Arc');

    if (isEdge || isArc) {
      this.errorMessage = `Nous avons détecté que vous utilisez ${isEdge ? 'Edge' : 'Arc'}. 
        Ce navigateur peut nécessiter des autorisations supplémentaires.`;
    }
  }

  openBrowserSettings() {
    if (navigator.userAgent.includes('Edg')) {
      window.open('edge://settings/content/camera', '_blank');
      window.open('edge://settings/content/microphone', '_blank');
    } else if (navigator.userAgent.includes('Arc')) {
      window.open('chrome://settings/content/camera', '_blank');
      window.open('chrome://settings/content/microphone', '_blank');
    } else {
      window.open('chrome://settings/content/camera', '_blank');
      window.open('chrome://settings/content/microphone', '_blank');
    }
  }
} 