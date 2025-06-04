// src/app/models/expense.model.ts
export interface Expense {
    id: number;
    missionId: number;
    missionName: string;
    AssocierName?: string; // Add this line
    description: string;
    amount: number;
    currency: string;
    convertedAmount: number;
    expenseDate: Date;
    category: string;
    receiptUrl: string;
    status: string;
    createdBy: string;
    createdDate: Date;
  }
  
  export interface ExpenseCreate {
    missionId: number;
    AssocierId: number; // Add this line
    description: string;
    amount: number;
    currency: string;
    convertedAmount: number;
    expenseDate: string; // Expects string format for dates
    category: string;
    receiptUrl: string;
    status: string;
    createdBy: string;
  }
  
  export interface ExpenseUpdate {
    id: number;
    missionId?: number;
    description?: string;
    amount?: number;
    currency?: string;
    convertedAmount?: number;
    expenseDate?: string;
    category?: string;
    receiptUrl?: string;
    status?: string;
    updatedBy?: string; // Add updatedBy here if the backend expects it

  }