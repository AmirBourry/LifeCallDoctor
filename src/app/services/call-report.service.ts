import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CallReport } from '../interfaces/call-report.interface';

@Injectable({
  providedIn: 'root'
})
export class CallReportService {
  private currentReport = new BehaviorSubject<CallReport | null>(null);
  currentReport$ = this.currentReport.asObservable();

  setReport(report: CallReport) {
    this.currentReport.next(report);
  }

  clearReport() {
    this.currentReport.next(null);
  }
} 