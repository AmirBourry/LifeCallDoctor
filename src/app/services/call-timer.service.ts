@Injectable({
  providedIn: 'root'
})
export class CallTimerService {
  private timer$ = new BehaviorSubject<string>('00:00');
  private startTime: number | null = null;
  private timerInterval: any;

  getTimer(): Observable<string> {
    return this.timer$.asObservable();
  }

  startTimer() {
    this.startTime = Date.now();
    this.timerInterval = setInterval(() => {
      const duration = Date.now() - (this.startTime || 0);
      const minutes = Math.floor(duration / 60000);
      const seconds = Math.floor((duration % 60000) / 1000);
      this.timer$.next(
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timer$.next('00:00');
      this.startTime = null;
    }
  }
} 