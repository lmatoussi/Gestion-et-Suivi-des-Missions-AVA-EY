import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { DashboardService } from '../../services/dashboard.service';
import { MissionService } from '../../services/mission.service';
import { ExpenseService } from '../../services/expense.service';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { CurrencyFormatter } from '../../utils/currency-formatter';
import { Role } from '../../models/user.model';

// Register all Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-partner-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    RouterModule,
    MatFormFieldModule,
    MatSelectModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './partner-dashboard.component.html',
  styleUrls: ['./partner-dashboard.component.scss']
})
export class PartnerDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  // Chart references
  @ViewChild('expensesTrendChart') expensesTrendChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('missionStatusChart') missionStatusChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('expenseCategoriesChart') expenseCategoriesChart!: ElementRef<HTMLCanvasElement>;

  // Chart instances
  expensesTrendChartInstance: any;
  missionStatusChartInstance: any;
  expenseCategoriesChartInstance: any;

  // Dashboard data
  totalAva: number = 0;
  usedAva: number = 0;
  remainingAva: number = 0;
  usagePercentage: number = 0;
  totalMissions: number = 0;
  activeMissions: number = 0;
  completedMissions: number = 0;
  partnerName: string = '';
  currentMonth: string = '';

  // Display data
  recentExpenses: any[] = [];
  missionStatusData: any[] = [];
  expenseTrendData: {labels: string[], values: number[]} = {labels: [], values: []};
  expenseCategoryData: {category: string, amount: number}[] = [];

  // State
  loading: boolean = true;
  error: string = '';
  isDarkMode: boolean = false;

  // Subject for unsubscribing
  private destroy$ = new Subject<void>();

  // New properties for admin view
  isAdmin = false;
  selectedPartnerId: number | null = null;
  partners: any[] = [];
  viewingAsAdmin = false;

  constructor(
    private dashboardService: DashboardService,
    private missionService: MissionService,
    private expenseService: ExpenseService,
    private authService: AuthService,
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    
    // Check for dark mode preference
    const darkModePreference = localStorage.getItem('darkMode');
    this.isDarkMode = darkModePreference === 'true';
  }

  ngOnInit(): void {
    // Get current user role
    const currentUser = this.authService.currentUserValue;
    this.isAdmin = currentUser?.role === Role.Admin;
    
    // Check if we're viewing as admin with a specific partner ID
    this.route.params.subscribe(params => {
      if (params['partnerId']) {
        this.selectedPartnerId = +params['partnerId'];
        this.viewingAsAdmin = true;
        // Load the specific partner's data
        this.loadPartnerDataById(this.selectedPartnerId);
      } else {
        // Regular flow for partner or admin without specific partner
        this.initializeBasedOnRole();
      }
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initCharts();
    }, 500);
  }

  ngOnDestroy(): void {
    // Clean up observables
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up charts
    this.destroyCharts();
  }

  private initializeBasedOnRole(): void {
    // Get current user information
    const currentUser = this.authService.currentUserValue;
    
    if (currentUser) {
      if (currentUser.role === Role.Admin) {
        // Admin can see all partners
        this.loadPartners();
        this.partnerName = "Select a Partner";
      } else if (currentUser.role === Role.Associer) {
        // For a partner, just load their own data
        this.partnerName = `${currentUser.nameUser} ${currentUser.surname}`;
        this.loadPartnerData();
      }
    }
  }

  loadPartners(): void {
    this.userService.getUsersByRole(Role.Associer)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (partners) => {
          this.partners = partners.map(p => ({
            id: p.id,
            name: `${p.nameUser} ${p.surname}`
          }));
        },
        error: (err) => {
          console.error('Error loading partners:', err);
          this.error = 'Failed to load partners list';
        }
      });
  }

  onPartnerChange(partnerId: number): void {
    if (partnerId) {
      this.router.navigate(['/partner/dashboard', partnerId]);
    }
  }

  loadPartnerDataById(partnerId: number): void {
    // First, get the partner's user information
    this.userService.getUserById(partnerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (partner) => {
          if (partner) {
            this.partnerName = `${partner.nameUser} ${partner.surname}`;
            this.loading = true;
            this.error = '';
            
            // Load budget data specifically for this partner
            this.loadPartnerBudgetData(partnerId);
          } else {
            this.error = 'Partner not found';
            this.loading = false;
          }
        },
        error: (err) => {
          console.error('Error loading partner information:', err);
          this.error = 'Failed to load partner information';
          this.loading = false;
        }
      });
  }

  loadPartnerData(): void {
    this.loading = true;
    this.error = '';
    
    // Get current user's ID
    const currentUser = this.authService.currentUserValue;
    if (!currentUser || !currentUser.id) {
      this.error = 'User information not available';
      this.loading = false;
      return;
    }

    const partnerId = currentUser.id;
    this.loadPartnerBudgetData(partnerId);
  }

  loadPartnerBudgetData(partnerId: number): void {
    // Load partner-specific budget data
    this.dashboardService.getAvaUsageByAssocier()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (associerData) => {
          // If admin is viewing partner data, find the specific partner
          if (this.viewingAsAdmin) {
            // Find partner by ID in the associer data
            this.userService.getUserById(partnerId).subscribe(partner => {
              if (partner) {
                const partnerFullName = `${partner.nameUser} ${partner.surname}`;
                const partnerData = associerData.find(a => 
                  a.name.includes(partner.nameUser) && a.name.includes(partner.surname));
                  
                this.processPartnerData(partnerData, partnerId);
              }
            });
          } else {
            // Get the current user to match in associer data
            const currentUser = this.authService.currentUserValue;
            if (currentUser) {
              const partnerData = associerData.find(a => 
                a.name.includes(currentUser.nameUser) && a.name.includes(currentUser.surname));
              
              this.processPartnerData(partnerData, partnerId);
            } else {
              this.loading = false;
              this.error = 'User information not available';
            }
          }
        },
        error: (err) => {
          console.error('Error loading partner budget data:', err);
          this.error = 'Failed to load budget data';
          this.loading = false;
        }
      });
  }

  processPartnerData(partnerData: any, partnerId: number): void {
    if (partnerData) {
      this.totalAva = partnerData.total;
      this.usedAva = partnerData.used;
      this.remainingAva = partnerData.total - partnerData.used;
      this.usagePercentage = this.calculatePercentage(partnerData.used, partnerData.total);
    }
    
    // Load partner's missions
    this.loadPartnerMissions(partnerId);
  }

  loadPartnerMissions(partnerId: number): void {
    this.missionService.getMissionsByAssocier(partnerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (missions) => {
          this.totalMissions = missions.length;
          this.activeMissions = missions.filter(m => m.status === 'Active').length;
          this.completedMissions = missions.filter(m => m.status === 'Completed').length;
          
          // Create mission status data for chart
          this.missionStatusData = [
            { status: 'Active', count: this.activeMissions },
            { status: 'Completed', count: this.completedMissions },
            { status: 'Pending', count: missions.filter(m => m.status === 'Pending').length },
            { status: 'Cancelled', count: missions.filter(m => m.status === 'Cancelled').length }
          ];
          
          // Get mission IDs for expense filtering
          const missionIds = missions.map(m => m.id);
          
          // Load expenses for these missions
          if (missionIds.length > 0) {
            this.loadMissionExpenses(missionIds);
          } else {
            this.loading = false;
            this.initCharts();
          }
        },
        error: (err) => {
          console.error('Error loading partner missions:', err);
          this.error = 'Failed to load mission data';
          this.loading = false;
        }
      });
  }
  
  loadMissionExpenses(missionIds: number[]): void {
    this.expenseService.getExpenses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (allExpenses) => {
          // Filter expenses for partner's missions
          const partnerExpenses = allExpenses.filter(e => missionIds.includes(e.missionId));
          
          // Recent expenses (last 5)
          this.recentExpenses = partnerExpenses
            .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())
            .slice(0, 5);
            
          // Generate expense trend data (last 6 months)
          this.generateExpenseTrendData(partnerExpenses);
          
          // Generate expense category data
          this.generateExpenseCategoryData(partnerExpenses);
          
          this.loading = false;
          this.initCharts();
        },
        error: (err) => {
          console.error('Error loading expenses:', err);
          this.error = 'Failed to load expense data';
          this.loading = false;
        }
      });
  }
  
  generateExpenseTrendData(expenses: any[]): void {
    // Get last 6 months
    const months = [];
    const monthlyExpenses = new Map<string, number>();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().substr(0, 7); // YYYY-MM format
      const monthName = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      
      months.push(monthName);
      monthlyExpenses.set(monthKey, 0);
    }
    
    // Aggregate expenses by month
    expenses.forEach(expense => {
      // Use createdDate as the expense date
      const expenseDate = new Date(expense.createdDate || new Date());
      const monthKey = expenseDate.toISOString().substr(0, 7);
      
      if (monthlyExpenses.has(monthKey)) {
        monthlyExpenses.set(monthKey, monthlyExpenses.get(monthKey)! + expense.convertedAmount);
      }
    });
    
    // Format data for chart
    const amounts = Array.from(monthlyExpenses.values());
    
    this.expenseTrendData = {
      labels: months,
      values: amounts
    };
  }
  
  generateExpenseCategoryData(expenses: any[]): void {
    const categories = new Map<string, number>();
    
    // Add common expense categories
    categories.set('Travel', 0);
    categories.set('Accommodation', 0);
    categories.set('Meals', 0);
    categories.set('Equipment', 0);
    categories.set('Other', 0);
    
    // Categorize expenses (using a simple approach based on expense title)
    expenses.forEach(expense => {
      const title = expense.title?.toLowerCase() || '';
      let category = 'Other';
      
      if (title.includes('travel') || title.includes('flight') || title.includes('train') || title.includes('taxi')) {
        category = 'Travel';
      } else if (title.includes('hotel') || title.includes('accommodation') || title.includes('lodging')) {
        category = 'Accommodation';
      } else if (title.includes('meal') || title.includes('food') || title.includes('restaurant') || title.includes('lunch')) {
        category = 'Meals';
      } else if (title.includes('equipment') || title.includes('device') || title.includes('hardware')) {
        category = 'Equipment';
      }
      
      categories.set(category, categories.get(category)! + expense.convertedAmount);
    });
    
    // Format data for chart
    this.expenseCategoryData = Array.from(categories.entries()).map(([category, amount]) => ({
      category,
      amount
    }));
  }

  initCharts(): void {
    if (this.loading) return;
    
    setTimeout(() => {
      this.initExpensesTrendChart();
      this.initMissionStatusChart();
      this.initExpenseCategoriesChart();
    }, 100);
  }
  
  initExpensesTrendChart(): void {
    if (!this.expensesTrendChart?.nativeElement || !this.expenseTrendData?.labels) return;
    
    const ctx = this.expensesTrendChart.nativeElement.getContext('2d');
    if (!ctx) return;
    
    if (this.expensesTrendChartInstance) {
      this.expensesTrendChartInstance.destroy();
    }
    
    this.expensesTrendChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.expenseTrendData.labels,
        datasets: [{
          label: 'Monthly Expenses',
          data: this.expenseTrendData.values,
          borderColor: '#3f51b5',
          backgroundColor: 'rgba(63, 81, 181, 0.2)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => this.formatCurrency(value as number)
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                return `Expenses: ${this.formatCurrency(value)}`;
              }
            }
          }
        }
      }
    });
  }
  
  initMissionStatusChart(): void {
    if (!this.missionStatusChart?.nativeElement || !this.missionStatusData?.length) return;
    
    const ctx = this.missionStatusChart.nativeElement.getContext('2d');
    if (!ctx) return;
    
    if (this.missionStatusChartInstance) {
      this.missionStatusChartInstance.destroy();
    }
    
    const colors = ['#4caf50', '#2196f3', '#ff9800', '#f44336'];
    
    this.missionStatusChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.missionStatusData.map(item => item.status),
        datasets: [{
          data: this.missionStatusData.map(item => item.count),
          backgroundColor: colors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                const total = this.missionStatusData.reduce((sum, item) => sum + item.count, 0);
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                return `${context.label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }
  
  initExpenseCategoriesChart(): void {
    if (!this.expenseCategoriesChart?.nativeElement || !this.expenseCategoryData?.length) return;
    
    const ctx = this.expenseCategoriesChart.nativeElement.getContext('2d');
    if (!ctx) return;
    
    if (this.expenseCategoriesChartInstance) {
      this.expenseCategoriesChartInstance.destroy();
    }
    
    const colors = ['#3f51b5', '#f44336', '#ff9800', '#4caf50', '#9c27b0'];
    
    this.expenseCategoriesChartInstance = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: this.expenseCategoryData.map(item => item.category),
        datasets: [{
          data: this.expenseCategoryData.map(item => item.amount),
          backgroundColor: colors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                const total = this.expenseCategoryData.reduce((sum, item) => sum + item.amount, 0);
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                return `${context.label}: ${this.formatCurrency(value)} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }
  
  destroyCharts(): void {
    if (this.expensesTrendChartInstance) {
      this.expensesTrendChartInstance.destroy();
    }
    
    if (this.missionStatusChartInstance) {
      this.missionStatusChartInstance.destroy();
    }
    
    if (this.expenseCategoriesChartInstance) {
      this.expenseCategoriesChartInstance.destroy();
    }
  }
  
  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('darkMode', this.isDarkMode.toString());
    
    // Redraw charts with new theme
    this.destroyCharts();
    this.initCharts();
  }
  
  // Utility methods
  calculatePercentage(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }
  
  formatCurrency(amount: number): string {
    return CurrencyFormatter.formatCurrency(amount);
  }
  
  formatCompactCurrency(amount: number): string {
    return CurrencyFormatter.formatCompactCurrency(amount);
  }
  
  formatDate(dateStr: string): string {
    const date = new Date(dateStr || new Date());
    return date.toLocaleDateString();
  }

  // Add a back button method for admin viewing partner dashboard
  backToAdmin(): void {
    this.router.navigate(['/admin/dashboard']);
  }
}
