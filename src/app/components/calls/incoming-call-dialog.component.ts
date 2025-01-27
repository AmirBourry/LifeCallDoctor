import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

interface IncomingCallData {
  callerName: string;
  callerRole: string;
}

@Component({
  selector: 'app-incoming-call-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="incoming-call-container">
      <div class="call-animation">
        <mat-icon class="phone-icon">phone</mat-icon>
      </div>
      
      <h2>Appel entrant</h2>
      <p class="caller-info">
        {{ data.callerName }}
        <span class="role-badge">{{ data.callerRole }}</span>
      </p>

      <div class="action-buttons">
        <button mat-fab color="warn" (click)="decline()" class="decline-btn">
          <mat-icon>call_end</mat-icon>
        </button>
        <button mat-fab color="primary" (click)="accept()" class="accept-btn">
          <mat-icon>call</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .incoming-call-container {
      padding: 2rem;
      text-align: center;
    }

    .call-animation {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(76, 175, 80, 0.1);
      margin: 0 auto 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulse 1.5s infinite;
    }

    .phone-icon {
      font-size: 40px;
      height: 40px;
      width: 40px;
      color: #4CAF50;
    }

    @keyframes pulse {
      0% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4);
      }
      70% {
        transform: scale(1);
        box-shadow: 0 0 0 20px rgba(76, 175, 80, 0);
      }
      100% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
      }
    }

    .caller-info {
      font-size: 1.2rem;
      margin: 1rem 0;
    }

    .role-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      background-color: #2196F3;
      color: white;
      border-radius: 12px;
      font-size: 0.8rem;
      margin-left: 0.5rem;
    }

    .action-buttons {
      display: flex;
      justify-content: center;
      gap: 2rem;
      margin-top: 2rem;
    }

    .decline-btn {
      background-color: #f44336;
    }

    .accept-btn {
      background-color: #4CAF50;
    }
  `]
})
export class IncomingCallDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: IncomingCallData,
    private dialogRef: MatDialogRef<IncomingCallDialogComponent>
  ) {}

  accept() {
    this.dialogRef.close(true);
  }

  decline() {
    this.dialogRef.close(false);
  }
} 