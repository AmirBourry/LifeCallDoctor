import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { VitalSigns } from '../vital-signs.interface';

@Injectable({
  providedIn: 'root'
})
export class VitalSignsService {
  private socket: WebSocket;
  private vitalSignsSubject = new Subject<VitalSigns>();
  public vitalSigns$ = this.vitalSignsSubject.asObservable();

  constructor() {
    this.socket = new WebSocket('wss://websocket.chhilif.com/ws');

    this.socket.onopen = () => {
      console.log('Connexion WebSocket établie');
    };

    this.socket.onmessage = (event) => {
      const data: VitalSigns = JSON.parse(event.data);
      this.vitalSignsSubject.next(data);
    };

    this.socket.onerror = (error) => {
      console.error('Erreur WebSocket:', error);
    };

    this.socket.onclose = () => {
      console.log('Connexion WebSocket fermée');
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }
}
