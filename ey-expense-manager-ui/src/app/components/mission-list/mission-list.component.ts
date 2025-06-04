import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MissionService } from '../../services/mission.service';
import { AuthService } from '../../services/auth.service';
import { Role } from '../../models/user.model';
import { Mission } from '../../models/Mission';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder } from '@angular/forms';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ExpenseDocumentService } from '../../services/expense-document.service';
import { MatIconModule } from '@angular/material/icon';


@Component({
  selector: 'app-mission-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule
  ],
  templateUrl: './mission-list.component.html',
  styleUrls: ['./mission-list.component.scss']
})
export class MissionListComponent implements OnInit {
  missions: Mission[] = [];
  filteredMissions: Mission[] = [];
  loading = true;
  error = '';
  searchTerm = '';
  darkMode = true; // Or retrieve from localStorage
  
  // Sorting properties
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  // Advanced filtering
  filterForm: FormGroup;
  showFilters = false;
  statusOptions = ['All', 'Pending', 'Approved', 'Rejected', 'In Review', 'Completed'];
  
  // Search debounce
  private searchTerms = new Subject<string>();

  constructor(
    private missionService: MissionService,
    private authService: AuthService,
    private fb: FormBuilder,
    private expenseDocumentService: ExpenseDocumentService // Add this line

  ) { 
    this.filterForm = this.fb.group({
      status: ['All'],
      dateFrom: [''],
      dateTo: [''],
      amountMin: [''],
      amountMax: ['']
    });
  }

  ngOnInit(): void {
    this.loadMissions();
    
    // Subscribe to search terms with debounce
    this.searchTerms.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.applyFilters();
    });
    
    // Subscribe to filter form changes
    this.filterForm.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }

  loadMissions(): void {
    this.loading = true;

    const currentUser = this.authService.currentUserValue;

    if (!currentUser) {
      this.error = 'User not authenticated';
      this.loading = false;
      return;
    }

    let missionObservable;

    switch (currentUser.role) {
      case Role.Admin:
      case Role.Manager:
        missionObservable = this.missionService.getMissions();
        break;
      case Role.Associer:
        missionObservable = this.missionService.getMissionsByAssocier(currentUser.id);
        break;
      default:
        missionObservable = this.missionService.getMissions();
    }

    missionObservable.subscribe({
      next: (data) => {
        this.missions = data;
        this.filteredMissions = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load missions: ' + err.message;
        this.loading = false;
      }
    });
  }

  onSearch(event: any): void {
    this.searchTerm = event.target.value;
    this.searchTerms.next(this.searchTerm);
  }

  applyFilters(): void {
    let filtered = [...this.missions];
    
    // Text search
    if (this.searchTerm.trim()) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(mission =>
        mission.idMission.toLowerCase().includes(search) ||
        mission.client.toLowerCase().includes(search) ||
        mission.nomDeContract.toLowerCase().includes(search) ||
        mission.status.toLowerCase().includes(search)
      );
    }
    
    // Status filter
    const status = this.filterForm.get('status')?.value;
    if (status && status !== 'All') {
      filtered = filtered.filter(mission => 
        mission.status.toLowerCase() === status.toLowerCase()
      );
    }
    
    // Date range filter
    const dateFrom = this.filterForm.get('dateFrom')?.value;
    const dateTo = this.filterForm.get('dateTo')?.value;
    
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter(mission => 
        new Date(mission.dateSignature) >= fromDate
      );
    }
    
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59); // End of day
      filtered = filtered.filter(mission => 
        new Date(mission.dateSignature) <= toDate
      );
    }
    
    // Amount range filter
    const amountMin = this.filterForm.get('amountMin')?.value;
    const amountMax = this.filterForm.get('amountMax')?.value;
    
    if (amountMin !== '' && amountMin !== null) {
      filtered = filtered.filter(mission => 
        mission.montantTnd >= parseFloat(amountMin)
      );
    }
    
    if (amountMax !== '' && amountMax !== null) {
      filtered = filtered.filter(mission => 
        mission.montantTnd <= parseFloat(amountMax)
      );
    }
    
    // Apply sorting if active
    if (this.sortColumn) {
      this.sortData(filtered);
    } else {
      this.filteredMissions = filtered;
    }
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  resetFilters(): void {
    this.filterForm.reset({
      status: 'All',
      dateFrom: '',
      dateTo: '',
      amountMin: '',
      amountMax: ''
    });
    this.searchTerm = '';
    this.searchTerms.next('');
  }

  sortData(data: Mission[] = this.filteredMissions): void {
    if (!this.sortColumn) return;
    
    const sortedData = [...data].sort((a, b) => {
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
    
    this.filteredMissions = sortedData;
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
    
    this.sortData();
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) {
      return 'fa-sort';
    }
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  deleteMission(id: number): void {
    if (confirm('Are you sure you want to delete this mission?')) {
      this.missionService.deleteMission(id).subscribe({
        next: () => {
          this.missions = this.missions.filter(m => m.id !== id);
          this.filteredMissions = this.filteredMissions.filter(m => m.id !== id);
        },
        error: (err) => {
          this.error = 'Failed to delete mission: ' + err.message;
        }
      });
    }
  }

  // Download PDF
  downloadPDF(): void {
    const doc = new jsPDF();
    doc.setFont('Arial', 'normal');
    doc.text('Mission List', 20, 10);
    
    // Add the current date to the PDF
    const today = new Date();
    doc.setFontSize(10);
    doc.text(`Generated on: ${today.toLocaleDateString()}`, 20, 16);
    
    // Add filter information if applied
    if (this.searchTerm || this.filterForm.get('status')?.value !== 'All') {
      let filterText = 'Filters applied: ';
      if (this.searchTerm) filterText += `Search: "${this.searchTerm}" `;
      if (this.filterForm.get('status')?.value !== 'All') 
        filterText += `Status: ${this.filterForm.get('status')?.value} `;
      
      doc.text(filterText, 20, 22);
    }

    // Table header
    let y = 30;
    const lineHeight = 8;
    const columns = [
      { header: 'ID', width: 35 },
      { header: 'Contract', width: 50 },
      { header: 'Client', width: 40 },
      { header: 'Status', width: 25 },
      { header: 'Amount (TND)', width: 30 }
    ];
    
    // Draw headers
    let x = 20;
    doc.setFontSize(12);
    doc.setFont('Arial', 'bold');
    
    columns.forEach(col => {
      doc.text(col.header, x, y);
      x += col.width;
    });
    
    // Draw line under header
    doc.line(20, y + 2, 190, y + 2);
    
    // Draw rows
    y += lineHeight;
    doc.setFont('Arial', 'normal');
    
    this.filteredMissions.forEach((mission, index) => {
      if (y > 270) { // Check if we need a new page
        doc.addPage();
        y = 20;
        
        // Redraw header on new page
        x = 20;
        doc.setFont('Arial', 'bold');
        columns.forEach(col => {
          doc.text(col.header, x, y);
          x += col.width;
        });
        doc.line(20, y + 2, 190, y + 2);
        doc.setFont('Arial', 'normal');
        y += lineHeight;
      }
      
      // Draw alternating row background
      if (index % 2 === 1) {
        doc.setFillColor(240, 240, 240);
        doc.rect(20, y - 6, 170, lineHeight, 'F');
      }
      
      x = 20;
      doc.text(mission.idMission || '', x, y); x += columns[0].width;
      doc.text(mission.nomDeContract || '', x, y); x += columns[1].width;
      doc.text(mission.client || '', x, y); x += columns[2].width;
      doc.text(mission.status || '', x, y); x += columns[3].width;
      doc.text(mission.montantTnd.toString() || '', x, y);
      
      y += lineHeight;
    });
    
    doc.save('mission_list.pdf');
  }

  // Download Excel
  downloadExcel(): void {
    // Create a more formatted Excel file
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet([]);
    
    // Add title
    XLSX.utils.sheet_add_aoa(worksheet, [['Mission List']], { origin: 'A1' });
    XLSX.utils.sheet_add_aoa(worksheet, [[`Generated on: ${new Date().toLocaleDateString()}`]], { origin: 'A2' });
    
    // Add filter information if applied
    if (this.searchTerm || this.filterForm.get('status')?.value !== 'All') {
      let filterText = 'Filters applied: ';
      if (this.searchTerm) filterText += `Search: "${this.searchTerm}" `;
      if (this.filterForm.get('status')?.value !== 'All') 
        filterText += `Status: ${this.filterForm.get('status')?.value} `;
      
      XLSX.utils.sheet_add_aoa(worksheet, [[filterText]], { origin: 'A3' });
    }
    
    // Add empty row
    XLSX.utils.sheet_add_aoa(worksheet, [['']], { origin: 'A4' });
    
    // Add headers
    const headers = ['ID', 'Contract', 'Client', 'Date', 'Status', 'Amount (TND)'];
    XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: 'A5' });
    
    // Add data
    const data = this.filteredMissions.map(m => [
      m.idMission,
      m.nomDeContract,
      m.client,
      new Date(m.dateSignature).toLocaleDateString(),
      m.status,
      m.montantTnd
    ]);
    
    XLSX.utils.sheet_add_aoa(worksheet, data, { origin: 'A6' });
    
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Missions');
    
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
    
    XLSX.writeFile(workbook, 'mission_list.xlsx');
  }

  statusBadgeClass(status: string): string {
    // Implement logic to return CSS class based on status
    status = status.toLowerCase().replace(/\s/g, ''); // Remove spaces
    return `status-badge status-badge-${status}`;
  }
  downloadExpenseTemplate(mission: Mission, event: MouseEvent): void {
    event.stopPropagation(); // Prevent row click event
    this.expenseDocumentService.downloadMissionCsvTemplate(mission);
  }

// Add these methods to your component class
getSortIconMaterial(column: string): string {
  if (this.sortColumn !== column) {
    return 'unfold_more';
  }
  return this.sortDirection === 'asc' ? 'expand_less' : 'expand_more';
}

// Method to get status icon
getStatusIcon(status: string): string {
  if (!status) return 'help_outline';
  
  const statusLower = status.toLowerCase();
  
  if (statusLower.includes('pending')) return 'hourglass_empty';
  if (statusLower.includes('approved')) return 'check_circle';
  if (statusLower.includes('rejected')) return 'cancel';
  if (statusLower.includes('review')) return 'pending_actions';
  if (statusLower.includes('completed')) return 'task_alt';
  if (statusLower.includes('in progress')) return 'loop';
  if (statusLower.includes('active')) return 'check_circle_outline';
  
  return 'help_outline'; // Default
}

// Helper method to determine if filters are active
hasActiveFilters(): boolean {
  if (!this.filterForm) return false;
  
  const form = this.filterForm.value;
  return !!(
    (form.status && form.status !== 'All') || 
    form.dateFrom || 
    form.dateTo || 
    form.amountMin || 
    form.amountMax ||
    this.searchTerm
  );
}
}
