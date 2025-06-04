// src/app/expense-list/expense-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { ExpenseService } from '../../services/expense.service';
import { MissionService } from '../../services/mission.service';
import { Expense } from '../../models/expense.model';
import { Mission } from '../../models/Mission';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-expense-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule
  ],
  templateUrl: './expense-list.component.html',
  styleUrls: ['./expense-list.component.scss']
})
export class ExpenseListComponent implements OnInit {
  expenses: Expense[] = [];
  mission: Mission | null = null;
  loading = true;
  error = '';
  missionId: number | null = null;
  searchTerm: string = '';
  
  // Sorting properties
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  // Filtering options
  filterForm: FormGroup;
  showFilters = false;
  categories: string[] = [];
  statuses: string[] = [];
  currencies: string[] = [];
  
  // Search debounce
  private searchTerms = new Subject<string>();
  
  constructor(
    private expenseService: ExpenseService,
    private missionService: MissionService,
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      status: [''],
      category: [''],
      currency: [''],
      dateFrom: [''],
      dateTo: [''],
      amountMin: [''],
      amountMax: ['']
    });
  }

  ngOnInit(): void {
    // Initialize search debounce
    this.searchTerms.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      // No need to call applyFilters here as it's computed via getter
    });
    
    // Subscribe to filter form changes
    this.filterForm.valueChanges.subscribe(() => {
      // No need to call applyFilters here as it's computed via getter
    });
    
    // Load data based on route params
    this.route.paramMap.subscribe(params => {
      const id = params.get('missionId');
      if (id) {
        this.missionId = +id;
        this.loadMissionDetails(this.missionId);
        this.loadExpensesByMission(this.missionId);
      } else {
        this.loadAllExpenses();
      }
    });
  }

  loadMissionDetails(missionId: number): void {
    this.missionService.getMissionById(missionId).subscribe({
      next: (mission) => {
        this.mission = mission;
      },
      error: (err) => {
        console.error('Error loading mission details:', err);
      }
    });
  }

  loadAllExpenses(): void {
    this.loading = true;
    this.expenseService.getExpenses().subscribe({
      next: (expenses) => {
        this.expenses = expenses;
        this.extractFilterOptions();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading expenses:', err);
        this.error = 'Failed to load expenses';
        this.loading = false;
      }
    });
  }

  loadExpensesByMission(missionId: number): void {
    this.loading = true;
    this.expenseService.getExpensesByMission(missionId).subscribe({
      next: (expenses) => {
        this.expenses = expenses;
        this.extractFilterOptions();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading mission expenses:', err);
        this.error = 'Failed to load mission expenses';
        this.loading = false;
      }
    });
  }

  extractFilterOptions(): void {
    // Extract unique categories, statuses and currencies for filter dropdowns
    this.categories = [...new Set(this.expenses.map(e => e.category).filter(c => c))];
    this.statuses = [...new Set(this.expenses.map(e => e.status).filter(s => s))];
    this.currencies = [...new Set(this.expenses.map(e => e.currency).filter(c => c))];
  }

  onSearch(event: any): void {
    this.searchTerm = event.target.value;
    this.searchTerms.next(this.searchTerm);
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  resetFilters(): void {
    this.filterForm.reset({
      status: '',
      category: '',
      currency: '',
      dateFrom: '',
      dateTo: '',
      amountMin: '',
      amountMax: ''
    });
    this.searchTerm = '';
    this.searchTerms.next('');
  }

  deleteExpense(id: number): void {
    if (confirm('Are you sure you want to delete this expense?')) {
      this.expenseService.deleteExpense(id).subscribe({
        next: () => {
          // Remove from local array to update view
          this.expenses = this.expenses.filter(e => e.id !== id);
        },
        error: (err) => {
          console.error('Error deleting expense:', err);
          this.error = 'Failed to delete expense';
        }
      });
    }
  }

  get filteredExpenses(): Expense[] {
    let filtered = [...this.expenses];
    
    // Apply text search
    if (this.searchTerm && this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(e => this.matchesSearchTerm(e, term));
    }
    
    // Apply status filter
    const status = this.filterForm.get('status')?.value;
    if (status) {
      filtered = filtered.filter(e => e.status === status);
    }
    
    // Apply category filter
    const category = this.filterForm.get('category')?.value;
    if (category) {
      filtered = filtered.filter(e => e.category === category);
    }
    
    // Apply currency filter
    const currency = this.filterForm.get('currency')?.value;
    if (currency) {
      filtered = filtered.filter(e => e.currency === currency);
    }
    
    // Apply date range filters
    const dateFrom = this.filterForm.get('dateFrom')?.value;
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter(e => new Date(e.expenseDate) >= fromDate);
    }
    
    const dateTo = this.filterForm.get('dateTo')?.value;
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59); // Include the entire day
      filtered = filtered.filter(e => new Date(e.expenseDate) <= toDate);
    }
    
    // Apply amount range filters
    const amountMin = this.filterForm.get('amountMin')?.value;
    if (amountMin !== null && amountMin !== '') {
      filtered = filtered.filter(e => e.convertedAmount >= parseFloat(amountMin));
    }
    
    const amountMax = this.filterForm.get('amountMax')?.value;
    if (amountMax !== null && amountMax !== '') {
      filtered = filtered.filter(e => e.convertedAmount <= parseFloat(amountMax));
    }
    
    // Apply sorting if active
    if (this.sortColumn) {
      return this.sortData(filtered);
    }
    
    return filtered;
  }

  matchesSearchTerm(expense: Expense, term: string): boolean {
    return (
      expense.description?.toLowerCase().includes(term) ||
      expense.category?.toLowerCase().includes(term) ||
      expense.status?.toLowerCase().includes(term) ||
      expense.missionName?.toLowerCase().includes(term) ||
      expense.currency?.toLowerCase().includes(term) ||
      expense.id.toString().includes(term)
    );
  }

  sortData(data: Expense[] = this.filteredExpenses): Expense[] {
    if (!this.sortColumn) return data;
    
    return [...data].sort((a, b) => {
      const aValue = this.getPropertyValue(a, this.sortColumn);
      const bValue = this.getPropertyValue(b, this.sortColumn);
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return this.sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else if (aValue instanceof Date && bValue instanceof Date) {
        return this.sortDirection === 'asc' 
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      } else {
        // Numbers or other types
        if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      }
    });
  }

  getPropertyValue(obj: any, path: string): any {
    // Handle nested properties like 'user.name'
    return path.split('.').reduce((prev, curr) => 
      prev ? prev[curr] : null, obj
    );
  }

  sort(column: string): void {
    if (this.sortColumn === column) {
      // Toggle sort direction
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New column, default to ascending
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) {
      return 'fa-sort';
    }
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  get totalAmount(): number {
    return this.filteredExpenses.reduce((sum, expense) => sum + expense.convertedAmount, 0);
  }

  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString();
  }

  statusBadgeClass(status: string): string {
    if (!status) return 'status-badge status-badge-default';
    
    const statusLower = status.toLowerCase().replace(/\s+/g, '');
    return `status-badge status-badge-${statusLower}`;
  }

  

  downloadExcel(): void {
    // Create a formatted Excel file
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet([]);
    
    // Add title
    XLSX.utils.sheet_add_aoa(worksheet, [['Expense Report']], { origin: 'A1' });
    XLSX.utils.sheet_add_aoa(worksheet, [[`Generated on: ${new Date().toLocaleDateString()}`]], { origin: 'A2' });
    
    // Add mission info if available
    if (this.mission) {
      XLSX.utils.sheet_add_aoa(worksheet, [[`Mission: ${this.mission.nomDeContract} (${this.mission.idMission})`]], { origin: 'A3' });
      XLSX.utils.sheet_add_aoa(worksheet, [[`Client: ${this.mission.client}`]], { origin: 'A4' });
      XLSX.utils.sheet_add_aoa(worksheet, [['']], { origin: 'A5' });
    } else {
      XLSX.utils.sheet_add_aoa(worksheet, [['']], { origin: 'A3' });
    }
    
    // Add filter information if applied
    if (this.hasActiveFilters()) {
      let filterRow = this.mission ? 5 : 3;
      let filterText = 'Filters: ';
      
      if (this.searchTerm) filterText += `Search: "${this.searchTerm}" | `;
      if (this.filterForm.get('status')?.value) 
        filterText += `Status: ${this.filterForm.get('status')?.value} | `;
      if (this.filterForm.get('category')?.value) 
        filterText += `Category: ${this.filterForm.get('category')?.value} | `;
      
      XLSX.utils.sheet_add_aoa(worksheet, [[filterText.slice(0, -3)]], { origin: `A${filterRow}` });
      XLSX.utils.sheet_add_aoa(worksheet, [['']], { origin: `A${filterRow + 1}` });
    }
    
    // Add headers
    const headerRow = this.hasActiveFilters() ? (this.mission ? 7 : 5) : (this.mission ? 6 : 4);
    const headers = [
      'ID', 
      ...(this.missionId ? [] : ['Mission']), 
      'Date', 
      'Description', 
      'Category', 
      'Amount', 
      'Currency', 
      'Converted (TND)', 
      'Status'
    ];
    
    XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: `A${headerRow}` });
    
    // Add data
    const data = this.filteredExpenses.map(e => [
      e.id,
      ...(this.missionId ? [] : [e.missionName]),
      new Date(e.expenseDate).toLocaleDateString(),
      e.description,
      e.category,
      e.amount,
      e.currency,
      e.convertedAmount,
      e.status
    ]);
    
    XLSX.utils.sheet_add_aoa(worksheet, data, { origin: `A${headerRow + 1}` });
    
    // Add total row
    const totalRow = headerRow + data.length + 1;
    const totalCol = this.missionId ? 'G' : 'H';
    XLSX.utils.sheet_add_aoa(worksheet, [['Total']], { origin: `A${totalRow}` });
    XLSX.utils.sheet_add_aoa(worksheet, [[this.totalAmount.toFixed(2)]], { origin: `${totalCol}${totalRow}` });
    
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');
    
    // Auto-size columns
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let max_width = 0;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cell_address = XLSX.utils.encode_cell({ c: C, r: R });
        if (!worksheet[cell_address]) continue;
        const cell_text = String(worksheet[cell_address].v || '');
        const width = cell_text.length;
        if (width > max_width) max_width = width;
      }
      worksheet['!cols'] = worksheet['!cols'] || [];
      worksheet['!cols'][C] = { width: max_width + 2 };
    }
    
    // Create filename with mission ID if available
    const filename = this.mission 
      ? `expenses_${this.mission.idMission}_${new Date().toISOString().split('T')[0]}.xlsx`
      : `expenses_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    XLSX.writeFile(workbook, filename);
  }

  downloadPDF(): void {
    // Initialize PDF document
    const doc = new jsPDF();
    
    // Add title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Expense Report', 14, 22);
    
    // Add date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Add mission info if available
    let yPos = 38;
    if (this.mission) {
      doc.setFontSize(12);
      doc.text(`Mission: ${this.mission.nomDeContract} (${this.mission.idMission})`, 14, yPos);
      doc.text(`Client: ${this.mission.client}`, 14, yPos + 7);
      yPos += 18;
    }
    
    // Add filter information
    if (this.hasActiveFilters()) {
      doc.setFontSize(10);
      let filterText = 'Filters: ';
      
      if (this.searchTerm) filterText += `Search: "${this.searchTerm}" | `;
      if (this.filterForm.get('status')?.value) 
        filterText += `Status: ${this.filterForm.get('status')?.value} | `;
      if (this.filterForm.get('category')?.value) 
        filterText += `Category: ${this.filterForm.get('category')?.value} | `;
      
      doc.text(filterText.slice(0, -3), 14, yPos);
      yPos += 10;
    }
    
    // Define table structure
    const colWidths = this.missionId ? 
      [20, 25, 40, 25, 20, 15, 25, 20] : 
      [20, 30, 25, 35, 25, 20, 15, 25, 20];
    
    const headers = this.missionId ? 
      ['ID', 'Date', 'Description', 'Category', 'Amount', 'Curr.', 'TND', 'Status'] : 
      ['ID', 'Mission', 'Date', 'Description', 'Category', 'Amount', 'Curr.', 'TND', 'Status'];
    
    // Draw table headers
    doc.setFillColor(63, 81, 181);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    let xPos = 14;
    headers.forEach((header, i) => {
      doc.rect(xPos, yPos, colWidths[i], 8, 'F');
      doc.text(header, xPos + 2, yPos + 5);
      xPos += colWidths[i];
    });
    yPos += 8;
    
    // Draw table rows
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    
    this.filteredExpenses.forEach((expense, index) => {
      if (yPos > 270) {
        // Add new page if content exceeds page height
        doc.addPage();
        yPos = 20;
        
        // Redraw headers on new page
        doc.setFillColor(63, 81, 181);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        
        let xPos = 14;
        headers.forEach((header, i) => {
          doc.rect(xPos, yPos, colWidths[i], 8, 'F');
          doc.text(header, xPos + 2, yPos + 5);
          xPos += colWidths[i];
        });
        yPos += 8;
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
      }
      
      // Draw row background (alternating)
      if (index % 2 === 1) {
        doc.setFillColor(240, 240, 240);
        doc.rect(14, yPos, xPos - 14, 7, 'F');
      }
      
      // Draw row data
      let x = 14;
      
      // ID
      doc.text(expense.id.toString(), x + 2, yPos + 5);
      x += colWidths[0];
      
      // Mission (if not filtered by mission)
      if (!this.missionId) {
        doc.text(expense.missionName || '', x + 2, yPos + 5);
        x += colWidths[1];
      }
      
      // Date
      doc.text(new Date(expense.expenseDate).toLocaleDateString(), x + 2, yPos + 5);
      x += colWidths[this.missionId ? 1 : 2];
      
      // Description (truncate if too long)
      const desc = expense.description || '';
      doc.text(desc.length > 18 ? desc.substring(0, 15) + '...' : desc, x + 2, yPos + 5);
      x += colWidths[this.missionId ? 2 : 3];
      
      // Category
      doc.text(expense.category || '', x + 2, yPos + 5);
      x += colWidths[this.missionId ? 3 : 4];
      
      // Amount (right-aligned)
      const amountText = expense.amount.toFixed(2);
      doc.text(amountText, x + colWidths[this.missionId ? 4 : 5] - 2 - doc.getTextWidth(amountText), yPos + 5);
      x += colWidths[this.missionId ? 4 : 5];
      
      // Currency
      doc.text(expense.currency || '', x + 2, yPos + 5);
      x += colWidths[this.missionId ? 5 : 6];
      
      // Converted amount (right-aligned)
      const tndText = expense.convertedAmount.toFixed(2);
      doc.text(tndText, x + colWidths[this.missionId ? 6 : 7] - 2 - doc.getTextWidth(tndText), yPos + 5);
      x += colWidths[this.missionId ? 6 : 7];
      
      // Status
      doc.text(expense.status || '', x + 2, yPos + 5);
      
      yPos += 7;
    });
    
    // Add total row
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(220, 220, 220);
    
    let totalWidth = 0;
    colWidths.forEach(w => totalWidth += w);
    doc.rect(14, yPos, totalWidth, 8, 'F');
    
    doc.text('Total', 16, yPos + 5);
    
    // Calculate total position (on the TND column)
    let totalX = 14;
    for (let i = 0; i < (this.missionId ? 6 : 7); i++) {
      totalX += colWidths[i];
    }
    
    const totalText = this.totalAmount.toFixed(2);
    doc.text(totalText, totalX + colWidths[this.missionId ? 6 : 7] - 2 - doc.getTextWidth(totalText), yPos + 5);
    
    // Create filename with mission ID if available
    const filename = this.mission 
      ? `expenses_${this.mission.idMission}_${new Date().toISOString().split('T')[0]}.pdf`
      : `expenses_${new Date().toISOString().split('T')[0]}.pdf`;
    
    doc.save(filename);
  }

    // Replace the existing getSortIcon method with this Material version
  getSortIconMaterial(column: string): string {
    if (this.sortColumn !== column) {
      return 'unfold_more';
    }
    return this.sortDirection === 'asc' ? 'expand_less' : 'expand_more';
  }
  
  // Add method to get category icon
  getCategoryIcon(category: string): string {
    if (!category) return 'category';
    
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('travel')) return 'flight';
    if (categoryLower.includes('meal') || categoryLower.includes('food')) return 'restaurant';
    if (categoryLower.includes('hotel') || categoryLower.includes('lodging')) return 'hotel';
    if (categoryLower.includes('transport')) return 'directions_car';
    if (categoryLower.includes('office') || categoryLower.includes('supplies')) return 'shopping_bag';
    if (categoryLower.includes('service') || categoryLower.includes('professional')) return 'business_center';
    if (categoryLower.includes('meeting')) return 'groups';
    if (categoryLower.includes('training')) return 'school';
    if (categoryLower.includes('software') || categoryLower.includes('hardware')) return 'computer';
    if (categoryLower.includes('entertainment')) return 'celebration';
    
    return 'receipt'; // Default
  }
  
  // Add method to get status icon
  getStatusIcon(status: string): string {
    if (!status) return 'help_outline';
    
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('pending')) return 'hourglass_empty';
    if (statusLower.includes('approved')) return 'check_circle';
    if (statusLower.includes('rejected')) return 'cancel';
    if (statusLower.includes('review')) return 'pending_actions';
    if (statusLower.includes('completed')) return 'task_alt';
    
    return 'help_outline'; // Default
  }
  
  // You should also have a method to determine if filters are active
  hasActiveFilters(): boolean {
    if (!this.filterForm) return false;
    
    const form = this.filterForm.value;
    return !!(form.status || form.category || form.currency || 
             form.dateFrom || form.dateTo || 
             form.amountMin || form.amountMax);
  }
}