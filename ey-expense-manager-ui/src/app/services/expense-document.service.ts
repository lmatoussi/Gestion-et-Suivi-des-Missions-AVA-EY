import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { saveAs } from 'file-saver';

export interface ExpenseDocumentResult {
  missionId: number;
  missionIdString: string;
  missionName: string;
  client: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  status: string;
}

export interface ExpenseCreateFromDocument {
  missionId: number;
  description: string;
  amount: number;
  currency: string;
  convertedAmount: number;
  expenseDate: string;
  category: string;
  receiptUrl: string;
  status: string;
  createdBy: string;
  documentFile?: File;
  [key: string]: string | number | File | undefined; // Add index signature
}

@Injectable({
  providedIn: 'root'
})
export class ExpenseDocumentService {
  private apiUrl = `${environment.apiUrl}/api/Expense`;

  constructor(private http: HttpClient) { }

  // Upload and process document to extract mission data
  uploadDocument(file: File): Observable<ExpenseDocumentResult> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.http.post<ExpenseDocumentResult>(`${this.apiUrl}/upload-document`, formData);
  }

  // Create expense from document
  createExpenseFromDocument(data: ExpenseCreateFromDocument): Observable<any> {
    const formData = new FormData();
    
    // Append all form fields
    Object.keys(data).forEach(key => {
      if (key !== 'documentFile' && data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key]?.toString() || '');
      }
    });
    
    // Append file if it exists
    if (data.documentFile) {
      formData.append('documentFile', data.documentFile);
    }
    
    return this.http.post(`${this.apiUrl}/create-from-document`, formData);
  }

  // Generate sample CSV template for downloading
  generateCsvTemplate(mission: any): string {
    const headers = 'MissionId,Description,Amount,Currency,Category\n';
    const data = `${mission.idMission},"Expense for ${mission.nomDeContract}",0.00,TND,\n`;
    return headers + data;
  }

  // Download CSV template for a mission
  downloadMissionCsvTemplate(mission: any): void {
    const csvContent = this.generateCsvTemplate(mission);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `expense_template_${mission.idMission}_${new Date().toISOString().slice(0, 10)}.csv`);
  }
}