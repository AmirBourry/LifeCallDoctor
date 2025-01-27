import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private showSidebarSubject = new BehaviorSubject<boolean>(true);
  showSidebar$ = this.showSidebarSubject.asObservable();

  toggleSidebar(show: boolean) {
    setTimeout(() => {
      this.showSidebarSubject.next(show);
    }, 0);
  }
}
