import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-media-permission-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Permissions requises</h2>
    <mat-dialog-content>
      <p>Pour passer des appels, l'application a besoin d'accéder à votre caméra et votre microphone.</p>
      <p>Veuillez suivre ces étapes :</p>
      <ol>
        <li>Cliquez sur l'icône de caméra/microphone dans la barre d'adresse</li>
        <li>Sélectionnez "Autoriser"</li>
        <li>Cliquez sur "Réessayer" ci-dessous</li>
      </ol>
      <p class="note">Note : Si vous ne voyez pas la demande de permission, vérifiez les paramètres de votre navigateur.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(false)">Annuler</button>
      <button mat-raised-button color="primary" (click)="dialogRef.close(true)">
        Réessayer
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 300px;
    }
    .note {
      margin-top: 16px;
      font-style: italic;
      color: rgba(0,0,0,0.6);
    }
    ol {
      margin: 16px 0;
      padding-left: 20px;
    }
    li {
      margin-bottom: 8px;
    }
  `]
})
export class MediaPermissionDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<MediaPermissionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { isRetry: boolean }
  ) {}
} 