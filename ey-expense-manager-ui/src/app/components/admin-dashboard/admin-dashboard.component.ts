import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, NgZone, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Chart, registerables, ChartConfiguration } from 'chart.js';
import { DashboardService } from '../../services/dashboard.service';
import { UserService } from '../../services/user.service';
import { Role } from '../../models/user.model';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MissionService } from '../../services/mission.service';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthService } from '../../services/auth.service';

// Add missing Angular Animation import
import { animate, state, style, transition, trigger } from '@angular/animations';

// Angular Material Imports
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSliderModule } from '@angular/material/slider';
import { MatListModule } from '@angular/material/list';

// Register all Chart.js components
Chart.register(...registerables);

import { CurrencyFormatter } from '../../utils/currency-formatter';
import { DashboardTab, DEFAULT_DASHBOARD_TABS } from '../../shared/dashboard-tab-config';
import { CurrencyRate } from '../../models/dashboard.model';

// Add import for CurrencyConverterComponent
import { CurrencyConverterComponent } from '../currency-converter/currency-converter.component';
import { NavigationService } from '../../services/navigation.service';

interface AvaData {
  total: number;
  used: number;
  remaining: number;
}

interface MissionStatusData {
  status: string;
  count: number;
}

interface AssocierAvaData {
  name: string;
  used: number;
  total: number;
}

interface TopAssociersData {
  name: string;
  expenses: number;
}

interface ExpenseByTypeData {
  type: string;
  amount: number;
}

interface BudgetAlert {
  message: string;
  type: 'warning' | 'danger' | 'info';
}

interface ForecastInsights {
  projectedOverspend: boolean;
  projectedDate: string;
  recommendedAction: string;
  confidenceScore: number;
}

interface AssocierTableData {
  name: string;
  allocated: number;
  used: number;
  remaining: number;
  percentage: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    // Angular Material
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatCardModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatExpansionModule,
    MatSliderModule,
    MatListModule,
    // Add Currency Converter Component
    CurrencyConverterComponent
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
  animations: [
    trigger('fadeInOut', [
      state('in', style({ opacity: 1 })),
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in-out')
      ]),
      transition(':leave', [
        animate('300ms ease-in-out', style({ opacity: 0 }))
      ])
    ]),
    trigger('cardAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class AdminDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  // References to chart canvases
  @ViewChild('avaUsageChart') avaUsageChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('associerAvaChart') associerAvaChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('missionStatusChart') missionStatusChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('topAssociersChart') topAssociersChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('expenseByTypeChart') expenseByTypeChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('avaTrendChart') avaTrendChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('forecastChart') forecastChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('currencyHistoryChart') currencyHistoryChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Subject for unsubscribing observables
  private destroy$ = new Subject<void>();

  // Chart instances
  avaChart: any;
  associerChart: any;
  statusChart: any;
  topAssociersBarChart: any;
  expenseTypeChart: any;
  trendChart: any;
  forecastChartInstance: any;
  currencyHistoryChartInstance: any;

  // Dashboard data
  avaData: AvaData | null = null;
  missionStatusData: MissionStatusData[] | null = null;
  associerAvaData: AssocierAvaData[] | null = null;
  topAssociersData: TopAssociersData[] | null = null;
  expenseByTypeData: ExpenseByTypeData[] | null = null;
  avaTrendData: { month: string; used: number; remaining: number }[] | null = null;
  forecastData: { month: string; projected: number; threshold: number }[] | null = null;
  budgetAllocationHistory: any[] = [];
  currencies: CurrencyRate[] = [];

  // Budget values
  totalAva: number = 0;
  usedAva: number = 0;
  remainingAva: number = 0;
  totalMissions: number = 0;
  
  // Additional metrics
  budgetUtilizationRate: number = 0;
  budgetGrowthRate: number = 5.2; // Demo value
  expenseGrowthRate: number = 4.8; // Demo value
  averageExpensePerAssocier: number = 0;
  anomalyDetected: boolean = false;

  // Forecast insights
  forecastInsights: ForecastInsights = {
    projectedOverspend: false,
    projectedDate: '',
    recommendedAction: '',
    confidenceScore: 85 // Demo value
  };

  // Table data
  dataSource = new MatTableDataSource<AssocierTableData>();
  associerDataSource: AssocierTableData[] = [];
  displayedColumns: string[] = ['name', 'allocated', 'used', 'remaining', 'percentage'];
  historyColumns: string[] = ['date', 'type', 'recipient', 'amount', 'notes'];
  
  // Filter options
  selectedYear: number = new Date().getFullYear();
  selectedAssocierId: number | null = null;
  associers: any[] = [];
  currentDateDisplay = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Years for filtering
  years: number[] = [];

  // Loading states
  loading: boolean = true;
  error: string = '';

  // UI state
  isDarkMode: boolean = false;
  isAutoRefresh: boolean = false;
  refreshRate: number = 5; // minutes
  refreshInterval: any;
  showAllocationModal: boolean = false;
  expandedElement: any = null;
  selectedTimeRange: string = 'year';
  
  // Budget alerts
  budgetAlerts: BudgetAlert[] = [];
  avaThresholds = {
    warning: 70, // Show warning when 70% of AVA is used
    danger: 90   // Show danger alert when 90% of AVA is used
  };
  
  // Date filter range
  dateRange = {
    start: new Date(new Date().getFullYear(), 0, 1),
    end: new Date()
  };

  // Forms
  allocationForm: FormGroup;

  // Mission data
  missions: any[] = [];

  // Dashboard tab configuration
  dashboardTabs: DashboardTab[] = DEFAULT_DASHBOARD_TABS;
  selectedTab = 0;
  showExportMenu = false;
  showAlertsModal = false;

  // Role check
  isAdmin = false;

  // Add Role enum for template access
  Role = Role;

  // Partner data
  partners: any[] = [];
  selectedPartnerId: number | null = null;

  constructor(
    private dashboardService: DashboardService,
    private userService: UserService,
    private zone: NgZone,
    private fb: FormBuilder,
    private missionService: MissionService,
    private snackBar: MatSnackBar,
    private iconRegistry: MatIconRegistry,
    private sanitizer: DomSanitizer,
    private authService: AuthService,
    private router: Router,
    public navigationService: NavigationService
  ) {
    // Initialize years for filter (current year - 5 to current year)
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 6; i++) {
      this.years.push(currentYear - i);
    }

    // Initialize allocation form
    this.allocationForm = this.fb.group({
      allocationType: ['associer', Validators.required],
      associerId: ['', Validators.required],
      missionId: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(1)]],
      notes: ['']
    });

    // Set form validation based on allocation type
    this.allocationForm.get('allocationType')?.valueChanges.subscribe(value => {
      if (value === 'associer') {
        this.allocationForm.get('associerId')?.setValidators(Validators.required);
        this.allocationForm.get('missionId')?.clearValidators();
      } else {
        this.allocationForm.get('missionId')?.setValidators(Validators.required);
        this.allocationForm.get('associerId')?.clearValidators();
      }
      this.allocationForm.get('associerId')?.updateValueAndValidity();
      this.allocationForm.get('missionId')?.updateValueAndValidity();
    });

    this.registerCustomIcons();
  }

  ngOnInit(): void {
    // Check if the user is an admin
    this.isAdmin = this.authService.currentUserValue?.role === Role.Admin;

    // Add a new tab for currency with proper typing
    this.dashboardTabs = [
      ...this.dashboardTabs,
      { name: 'Currency', icon: 'attach_money' }
    ];
    
    // Fetch currency rates
    this.dashboardService.currencyRates$
      .pipe(takeUntil(this.destroy$))
      .subscribe(rates => {
        this.currencies = rates;
        // Initialize currency chart when data is available
        if (rates.length > 0 && this.selectedTab === 4) {
          setTimeout(() => this.initCurrencyHistoryChart(), 100);
        }
      });
    
    this.loadAssociers();
    this.loadDashboardData();
    this.loadMissions();
    this.loadAllocationHistory();
    this.loadPartners();
    
    // Check for dark mode preference
    const darkModePreference = localStorage.getItem('darkMode');
    this.isDarkMode = darkModePreference === 'true';
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initCharts();
      this.applyTableSorting();
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanupCharts();
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
  private registerCustomIcons(): void {
    // Register any custom SVG icons you may want to use
    // Example:
    this.iconRegistry.addSvgIcon(
      'budget-forecast',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/icons/budget-forecast.svg')
    );
    this.iconRegistry.addSvgIcon(
      'budget-alert',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/icons/budget-alert.svg')
    );
  }  
  getTabIcon(index: number): string {
    switch(index) {
      case 0: return 'dashboard';
      case 1: return 'work';
      case 2: return 'people';
      case 3: return 'history';
      case 4: return 'attach_money'; // Icon for currency tab
      default: return 'dashboard';
    }
  }

  loadMissions(): void {
    this.missionService.getMissions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (missions) => {
          this.missions = missions.map(mission => ({
            id: mission.id,
            nomDeContract: mission.nomDeContract
          }));
        },
        error: (err: any) => {
          console.error('Failed to load missions:', err);
          this.showNotification('Failed to load missions', 'error');
        }
      });
  }
  
  loadAllocationHistory(): void {
    this.dashboardService.getAvaAllocationHistory()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.budgetAllocationHistory = data;
        },
        error: (err: Error) => {
          console.error('Failed to load allocation history:', err);
        }
      });
  }

  applyTableSorting(): void {
    if (this.paginator && this.sort) {
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    }
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('darkMode', this.isDarkMode.toString());
    
    // Destroy and recreate charts with new theme
    this.destroyAllCharts();
    setTimeout(() => this.initCharts(), 100);
  }

  toggleAutoRefresh(): void {
    this.isAutoRefresh = !this.isAutoRefresh;
    
    if (this.isAutoRefresh) {
      this.refreshInterval = setInterval(() => {
        this.loadDashboardData();
      }, this.refreshRate * 60 * 1000);
      
      this.showNotification('Auto refresh enabled', 'success');
    } else {
      clearInterval(this.refreshInterval);
      this.showNotification('Auto refresh disabled', 'info');
    }
  }
  
  updateRefreshRate(event: any): void {
    this.refreshRate = event.value;
    
    if (this.isAutoRefresh) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = setInterval(() => {
        this.loadDashboardData();
      }, this.refreshRate * 60 * 1000);
      
      this.showNotification(`Refresh rate updated to ${this.refreshRate} minutes`, 'info');
    }
  }

  showNotification(message: string, type: 'success' | 'error' | 'info' | 'warning'): void {
    const classMap: Record<string, string> = {
      success: 'snackbar-success',
      error: 'snackbar-error',
      info: 'snackbar-info',
      warning: 'snackbar-warning'
    };
    
    this.snackBar.open(message, 'Dismiss', {
      duration: 3000,
      panelClass: [classMap[type]]
    });
  }

  changeTimeRange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedTimeRange = selectElement.value;
    
    const now = new Date();
    switch (this.selectedTimeRange) {
      case 'month':
        this.dateRange.start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        this.dateRange.start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        this.dateRange.start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
        this.dateRange.start = new Date(now.getFullYear() - 5, 0, 1); // Last 5 years
        break;
    }
    
    this.dateRange.end = now;
    this.applyDateFilter();
  }

  applyDateFilter(): void {
    this.loadDashboardData();
    this.showNotification(`Applied date filter: ${this.selectedTimeRange}`, 'info');
  }

  downloadFullReport(): void {
    this.showNotification('Generating comprehensive report...', 'info');
    
    this.dashboardService.exportDashboardData('pdf')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `ey-expense-full-report-${new Date().toISOString().slice(0, 10)}.pdf`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.showNotification('Report downloaded successfully', 'success');
        },
        error: (err: Error) => {
          console.error('Failed to download report:', err);
          this.showNotification('Failed to generate report', 'error');
        }
      });
  }

  loadAssociers(): void {
    this.userService.getUsersByRole(Role.Associer)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (associers) => {
          this.associers = associers.map(associer => ({
            id: associer.id,
            name: `${associer.nameUser} ${associer.surname}`
          }));
        },
        error: (err: any) => {
          console.error('Failed to load associers:', err);
          this.error = 'Failed to load associers data.';
          this.showNotification('Failed to load associers data', 'error');
        }
      });
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
          this.showNotification('Failed to load partners list', 'error');
        }
      });
  }

  viewPartnerDashboard(partnerId: number): void {
    if (partnerId) {
      this.router.navigate(['/partner/dashboard', partnerId]);
    }
  }

  loadDashboardData(): void {
    this.loading = true;
    this.error = '';
    
    // Destroy existing charts before loading new data
    this.destroyAllCharts();

    forkJoin({
      avaSummary: this.dashboardService.getAvaSummary(),
      missionStatus: this.dashboardService.getMissionStatusBreakdown(),
      avaUsageByAssocier: this.dashboardService.getAvaUsageByAssocier(),
      topAssociersByExpenses: this.dashboardService.getTopAssociersByExpenses(),
      expenseByType: this.dashboardService.getExpensesByMissionType(),
      avaTrends: this.dashboardService.getAvaUsageTrends(),
      forecast: this.dashboardService.forecastAvaUsage()
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (data: any) => {
        this.avaData = data.avaSummary;
        this.missionStatusData = data.missionStatus;
        this.associerAvaData = data.avaUsageByAssocier;
        this.topAssociersData = data.topAssociersByExpenses;
        this.expenseByTypeData = data.expenseByType;
        this.avaTrendData = data.avaTrends;
        this.forecastData = data.forecast;

        this.totalAva = data.avaSummary.total ?? 0;
        this.usedAva = data.avaSummary.used ?? 0;
        this.remainingAva = data.avaSummary.remaining ?? 0;
        this.totalMissions = data.missionStatus.reduce((sum: number, item: MissionStatusData) => sum + (item.count ?? 0), 0);
        
        this.calculateAdditionalMetrics();
        this.generateBudgetAlerts();
        this.prepareAssocierTableData();

        this.loading = false;
        
        // Initialize charts after data is loaded
        setTimeout(() => {
          this.initCharts();
          this.setupChartResponsiveness();
        }, 100);
      },
      error: (err: any) => this.handleError(err),
      complete: () => {
        this.loading = false;
      }
    });
  }

  calculateAdditionalMetrics(): void {
    if (!this.avaData) return;
    
    // Budget utilization rate (%)
    this.budgetUtilizationRate = this.calculatePercentage(this.usedAva, this.totalAva);
    
    // Calculate average expense per associer
    if (this.associerAvaData && this.associerAvaData.length > 0) {
      const totalExpenses = this.associerAvaData.reduce((sum, item) => sum + item.used, 0);
      this.averageExpensePerAssocier = totalExpenses / this.associerAvaData.length;
    }
    
    // Simple anomaly detection (for demo)
    this.anomalyDetected = this.budgetUtilizationRate > 85 || this.expenseGrowthRate > 1.5 * this.budgetGrowthRate;
    
    // Process forecast data for insights
    if (this.forecastData && this.forecastData.length > 0) {
      const lastMonth = this.forecastData[this.forecastData.length - 1];
      this.forecastInsights.projectedOverspend = lastMonth.projected > lastMonth.threshold;
      this.forecastInsights.projectedDate = lastMonth.month;
      
      if (this.forecastInsights.projectedOverspend) {
        this.forecastInsights.recommendedAction = 'Consider rebalancing budget allocations or implementing expense controls';
      } else {
        this.forecastInsights.recommendedAction = 'Current budget allocation is sufficient for projected expenses';
      }
    }
  }

  prepareAssocierTableData(): void {
    if (!this.associerAvaData) return;

    this.associerDataSource = this.associerAvaData.map(item => ({
      name: item.name,
      allocated: item.total,
      used: item.used,
      remaining: item.total - item.used,
      percentage: this.calculatePercentage(item.used, item.total)
    }));

    this.dataSource = new MatTableDataSource(this.associerDataSource);
    setTimeout(() => this.applyTableSorting(), 0);
  }

  onYearChange(event: any): void {
    this.selectedYear = event.value;
    this.loadDashboardData();
  }

  onAssocierChange(event: any): void {
    const partnerId = event.target.value;
    this.selectedAssocierId = partnerId;
    
    // If a specific partner is selected (not the "All Partners" option), navigate to their dashboard
    if (partnerId) {
      this.viewPartnerDashboard(parseInt(partnerId, 10));
    } else {
      // If "All Partners" is selected, just reload the dashboard data with no filter
      this.loadDashboardData();
    }
  }

  openAllocationModal(): void {
    this.showAllocationModal = true;
  }

  closeAllocationModal(): void {
    this.showAllocationModal = false;
    this.allocationForm.reset({
      allocationType: 'associer',
      amount: 0
    });
  }

  submitAllocation(): void {
    if (this.allocationForm.invalid) {
      // Mark all form controls as touched to trigger validation messages
      Object.keys(this.allocationForm.controls).forEach(key => {
        const control = this.allocationForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    const allocationType = this.allocationForm.get('allocationType')?.value;
    const amount = this.allocationForm.get('amount')?.value;
    const notes = this.allocationForm.get('notes')?.value || '';

    if (allocationType === 'associer') {
      const associerId = this.allocationForm.get('associerId')?.value;
      if (!associerId) {
        this.allocationForm.get('associerId')?.markAsTouched();
        return;
      }

      this.dashboardService.allocateAvaToAssocier(associerId, amount, notes)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.closeAllocationModal();
            this.showNotification(`Successfully allocated ${this.formatCurrency(amount)} to associer`, 'success');
            this.dashboardService.clearCache();
            this.loadDashboardData();
            this.loadAllocationHistory();
          },
          error: (err: any) => {
            console.error('Error allocating AVA to associer:', err);
            this.showNotification(`Failed to allocate budget: ${err.message || 'Unknown error'}`, 'error');
          }
        });
    } else {
      const missionId = this.allocationForm.get('missionId')?.value;
      if (!missionId) {
        this.allocationForm.get('missionId')?.markAsTouched();
        return;
      }

      this.dashboardService.allocateAvaToMission(missionId, amount, notes)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.closeAllocationModal();
            this.showNotification(`Successfully allocated ${this.formatCurrency(amount)} to mission`, 'success');
            this.dashboardService.clearCache();
            this.loadDashboardData();
            this.loadAllocationHistory();
          },
          error: (err: any) => {
            console.error('Error allocating AVA to mission:', err);
            this.showNotification(`Failed to allocate budget: ${err.message || 'Unknown error'}`, 'error');
          }
        });
    }
  }

  exportChartAsPng(chartId: string): void {
    const canvas = document.getElementById(chartId) as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${chartId}-${new Date().getTime()}.png`;
      link.click();
      this.showNotification('Chart downloaded successfully', 'success');
    } else {
      this.showNotification('Failed to download chart', 'error');
    }
  }

  exportDashboardData(format: 'excel' | 'pdf'): void {
    this.showNotification(`Exporting dashboard data as ${format.toUpperCase()}...`, 'info');
    
    this.dashboardService.exportDashboardData(format)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `dashboard-data-${new Date().toISOString().slice(0, 10)}.${format}`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.showNotification(`Dashboard data exported as ${format.toUpperCase()}`, 'success');
        },
        error: (err: any) => {
          console.error(`Error exporting data as ${format}:`, err);
          this.showNotification(`Failed to export data as ${format.toUpperCase()}`, 'error');
        }
      });
  }

  formatCurrency(amount: number): string {
    return CurrencyFormatter.formatCurrency(amount);
  }

  formatCompactCurrency(amount: number): string {
    return CurrencyFormatter.formatCompactCurrency(amount);
  }

  calculatePercentage(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }

  generateBudgetAlerts(): void {
    this.budgetAlerts = [];

    if (!this.avaData) return;

    const usagePercentage = this.calculatePercentage(this.usedAva, this.totalAva);

    if (usagePercentage >= this.avaThresholds.danger) {
      this.budgetAlerts.push({
        message: `Critical: Budget usage at ${usagePercentage}%. Only ${this.formatCurrency(this.remainingAva)} remaining.`,
        type: 'danger'
      });
    } else if (usagePercentage >= this.avaThresholds.warning) {
      this.budgetAlerts.push({
        message: `Warning: Budget usage at ${usagePercentage}%. ${this.formatCurrency(this.remainingAva)} remaining.`,
        type: 'warning'
      });
    }

    if (this.associerAvaData) {
      this.associerAvaData.forEach(associer => {
        const associerUsage = this.calculatePercentage(associer.used, associer.total);
        if (associerUsage >= this.avaThresholds.danger) {
          this.budgetAlerts.push({
            message: `${associer.name} has used ${associerUsage}% of allocated budget.`,
            type: 'danger'
          });
        }
      });
    }

    // Add forecast alert if necessary
    if (this.forecastInsights.projectedOverspend) {
      this.budgetAlerts.push({
        message: `Forecast: Budget projected to be depleted by ${this.forecastInsights.projectedDate}`,
        type: 'warning'
      });
    }

    // Add anomaly alert if detected
    if (this.anomalyDetected) {
      this.budgetAlerts.push({
        message: 'Unusual expense pattern detected. Review recent transactions.',
        type: 'warning'
      });
    }
  }

  selectTab(index: number): void {
    this.selectedTab = index;
    
    // Initialize currency chart if we're switching to the currency tab
    if (index === 4 && this.currencies && this.currencies.length > 0) {
      setTimeout(() => this.initCurrencyHistoryChart(), 100);
    }
  }

  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }

  openAlertsModal(): void {
    this.showAlertsModal = true;
  }

  closeAlertsModal(): void {
    this.showAlertsModal = false;
  }

  missionStatusCount(status: string): number {
    if (!this.missionStatusData) return 0;
    const item = this.missionStatusData.find(item => item.status === status);
    return item ? item.count : 0;
  }

  private handleError(err: any): void {
    console.error('Dashboard error:', err);
    this.error = 'Failed to load dashboard data. Please try again later.';
    this.loading = false;
    this.showNotification('Failed to load dashboard data', 'error');
  }

  // Chart initialization methods with modern styling
  initCharts(): void {
    if (!this.avaData || !this.missionStatusData || !this.associerAvaData || 
        !this.topAssociersData || !this.expenseByTypeData) {
      console.warn('Data is not fully loaded yet. Charts will be initialized later.');
      return;
    }

    this.zone.run(() => {
      if (this.avaData) this.initAvaUsageChart();
      if (this.missionStatusData) this.initMissionStatusChart();
      if (this.associerAvaData) this.initAssocierAvaChart();
      if (this.topAssociersData) this.initTopAssociersChart();
      if (this.expenseByTypeData) this.initExpenseByTypeChart();
      if (this.avaTrendData) this.initAvaTrendChart();
      if (this.forecastData) this.initForecastChart();
    });
  }

  initAvaUsageChart(): void {
    const ctx = this.avaUsageChart?.nativeElement?.getContext('2d');
    if (!ctx) {
      console.error('Canvas context not available: avaUsageChart');
      return;
    }

    if (this.avaChart) {
      this.avaChart.destroy();
    }

    const themeColors = this.getChartThemeColors();

    this.avaChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Used Budget', 'Available Budget'],
        datasets: [{
          data: [this.usedAva, this.remainingAva],
          backgroundColor: [themeColors.danger, themeColors.success],
          hoverBackgroundColor: [themeColors.dangerHover, themeColors.successHover],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: this.isDarkMode ? '#e0e0e0' : '#333333',
              font: {
                family: 'Roboto, Arial, sans-serif',
                size: 12
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                const total = (context.chart.data.datasets[0].data as number[]).reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${context.label}: ${this.formatCurrency(value)} (${percentage}%)`;
              }
            }
          }
        },
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1000
        }
      }
    });
  }

  initMissionStatusChart(): void {
    const ctx = this.missionStatusChart?.nativeElement?.getContext('2d');
    if (!ctx || !this.missionStatusData) {
      console.error('Canvas context or data not available: missionStatusChart');
      return;
    }

    if (this.statusChart) {
      this.statusChart.destroy();
    }

    const themeColors = this.getChartThemeColors();

    this.statusChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: this.missionStatusData.map(item => item.status),
        datasets: [{
          data: this.missionStatusData.map(item => item.count),
          backgroundColor: [themeColors.success, themeColors.primary, themeColors.warning],
          hoverBackgroundColor: [themeColors.successHover, themeColors.primaryHover, themeColors.warningHover],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: this.isDarkMode ? '#e0e0e0' : '#333333',
              font: {
                family: 'Roboto, Arial, sans-serif',
                size: 12
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                const total = (context.chart.data.datasets[0].data as number[]).reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${context.label}: ${value} (${percentage}%)`;
              }
            }
          }
        },
        animation: {
          animateRotate: true,
          duration: 1000
        }
      }
    });
  }

  initAssocierAvaChart(): void {
    const ctx = this.associerAvaChart?.nativeElement?.getContext('2d');
    if (!ctx || !this.associerAvaData) {
      console.error('Canvas context or data not available: associerAvaChart');
      return;
    }

    if (this.associerChart) {
      this.associerChart.destroy();
    }

    const themeColors = this.getChartThemeColors();

    this.associerChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.associerAvaData.map(item => item.name),
        datasets: [
          {
            label: 'Used Budget',
            data: this.associerAvaData.map(item => item.used),
            backgroundColor: themeColors.danger,
            borderColor: themeColors.dangerBorder,
            borderWidth: 1
          },
          {
            label: 'Remaining Budget',
            data: this.associerAvaData.map(item => item.total - item.used),
            backgroundColor: themeColors.success,
            borderColor: themeColors.successBorder,
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
            grid: {
              display: false,
              color: this.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              color: this.isDarkMode ? '#e0e0e0' : '#333333',
              font: {
                family: 'Roboto, Arial, sans-serif'
              }
            }
          },
          y: {
            stacked: true,
            grid: {
              color: this.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              color: this.isDarkMode ? '#e0e0e0' : '#333333',
              font: {
                family: 'Roboto, Arial, sans-serif'
              },
              callback: (value) => this.formatCurrency(value as number).replace('TND', '')
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: this.isDarkMode ? '#e0e0e0' : '#333333',
              font: {
                family: 'Roboto, Arial, sans-serif'
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                return `${context.dataset.label}: ${this.formatCurrency(value)}`;
              }
            }
          }
        },
        animation: {
          duration: 1000
        }
      }
    });
  }

  initTopAssociersChart(): void {
    const ctx = this.topAssociersChart?.nativeElement?.getContext('2d');
    if (!ctx || !this.topAssociersData) {
      console.error('Canvas context or data not available: topAssociersChart');
      return;
    }

    if (this.topAssociersBarChart) {
      this.topAssociersBarChart.destroy();
    }

    const themeColors = this.getChartThemeColors();

    this.topAssociersBarChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.topAssociersData.map(item => item.name),
        datasets: [{
          label: 'Expenses',
          data: this.topAssociersData.map(item => item.expenses),
          backgroundColor: themeColors.accent,
          borderColor: themeColors.accentBorder,
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: {
              color: this.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              color: this.isDarkMode ? '#e0e0e0' : '#333333',
              font: {
                family: 'Roboto, Arial, sans-serif'
              },
              callback: (value) => this.formatCurrency(value as number).replace('TND', '')
            }
          },
          y: {
            grid: {
              display: false
            },
            ticks: {
              color: this.isDarkMode ? '#e0e0e0' : '#333333',
              font: {
                family: 'Roboto, Arial, sans-serif'
              }
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                return `Expenses: ${this.formatCurrency(value)}`;
              }
            }
          }
        },
        animation: {
          duration: 1000
        }
      }
    });
  }

  initExpenseByTypeChart(): void {
    const ctx = this.expenseByTypeChart?.nativeElement?.getContext('2d');
    if (!ctx || !this.expenseByTypeData) {
      console.error('Canvas context or data not available: expenseByTypeChart');
      return;
    }

    if (this.expenseTypeChart) {
      this.expenseTypeChart.destroy();
    }

    const themeColors = this.getChartThemeColors();

    this.expenseTypeChart = new Chart(ctx, {
      type: 'polarArea',
      data: {
        labels: this.expenseByTypeData.map(item => item.type),
        datasets: [{
          data: this.expenseByTypeData.map(item => item.amount),
          backgroundColor: [
            themeColors.primary,
            themeColors.success,
            themeColors.warning,
            themeColors.danger,
            themeColors.accent
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            grid: {
              color: this.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              color: this.isDarkMode ? '#e0e0e0' : '#333333',
              backdropColor: this.isDarkMode ? '#1e1e1e' : 'white',
              font: {
                family: 'Roboto, Arial, sans-serif'
              }
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: this.isDarkMode ? '#e0e0e0' : '#333333',
              font: {
                family: 'Roboto, Arial, sans-serif'
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                return `${context.label}: ${this.formatCurrency(value)}`;
              }
            }
          }
        },
        animation: {
          duration: 1000
        }
      }
    });
  }

  initAvaTrendChart(): void {
    const ctx = this.avaTrendChart?.nativeElement?.getContext('2d');
    if (!ctx || !this.avaTrendData) {
      console.error('Canvas context or data not available: avaTrendChart');
      return;
    }

    if (this.trendChart) {
      this.trendChart.destroy();
    }

    const themeColors = this.getChartThemeColors();

    this.trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.avaTrendData.map(item => item.month),
        datasets: [
          {
            label: 'Used Budget',
            data: this.avaTrendData.map(item => item.used),
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: themeColors.danger,
            borderWidth: 2,
            tension: 0.3,
            fill: true
          },
          {
            label: 'Remaining Budget',
            data: this.avaTrendData.map(item => item.remaining),
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: themeColors.primary,
            borderWidth: 2,
            tension: 0.3,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: {
              color: this.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              color: this.isDarkMode ? '#e0e0e0' : '#333333',
              font: {
                family: 'Roboto, Arial, sans-serif'
              }
            }
          },
          y: {
            grid: {
              color: this.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              color: this.isDarkMode ? '#e0e0e0' : '#333333',
              font: {
                family: 'Roboto, Arial, sans-serif'
              },
              callback: (value) => this.formatCurrency(value as number).replace('TND', '')
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: this.isDarkMode ? '#e0e0e0' : '#333333',
              font: {
                family: 'Roboto, Arial, sans-serif'
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                return `${context.dataset.label}: ${this.formatCurrency(value)}`;
              }
            }
          }
        },
        animation: {
          duration: 1200
        }
      }
    });
  }

  initForecastChart(): void {
    const ctx = this.forecastChart?.nativeElement?.getContext('2d');
    if (!ctx || !this.forecastData) {
      console.error('Canvas context or data not available: forecastChart');
      return;
    }

    if (this.forecastChartInstance) {
      this.forecastChartInstance.destroy();
    }

    const themeColors = this.getChartThemeColors();

    this.forecastChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.forecastData.map(item => item.month),
        datasets: [
          {
            label: 'Projected Budget Usage',
            data: this.forecastData.map(item => item.projected),
            backgroundColor: 'rgba(255, 159, 64, 0.2)',
            borderColor: themeColors.warning,
            borderWidth: 2,
            tension: 0.3,
            fill: true
          },
          {
            label: 'Warning Threshold',
            data: this.forecastData.map(item => item.threshold),
            backgroundColor: 'rgba(255, 99, 132, 0.1)',
            borderColor: themeColors.danger,
            borderWidth: 1,
            borderDash: [5, 5],
            pointStyle: false as any
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: {
              color: this.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              color: this.isDarkMode ? '#e0e0e0' : '#333333',
              font: {
                family: 'Roboto, Arial, sans-serif'
              }
            }
          },
          y: {
            grid: {
              color: this.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              color: this.isDarkMode ? '#e0e0e0' : '#333333',
              font: {
                family: 'Roboto, Arial, sans-serif'
              },
              callback: (value) => this.formatCurrency(value as number).replace('TND', '')
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: this.isDarkMode ? '#e0e0e0' : '#333333',
              font: {
                family: 'Roboto, Arial, sans-serif'
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                return `${context.dataset.label}: ${this.formatCurrency(value)}`;
              }
            }
          }
        },
        animation: {
          duration: 1200
        }
      }
    });
  }

  initCurrencyHistoryChart(): void {
    const ctx = this.currencyHistoryChart?.nativeElement?.getContext('2d');
    if (!ctx || !this.currencies || this.currencies.length === 0) {
      console.error('Canvas context or currency data not available');
      return;
    }

    if (this.currencyHistoryChartInstance) {
      this.currencyHistoryChartInstance.destroy();
    }

    // Generate some demo data for the chart
    const labels: string[] = [];
    const datasets: Array<{
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      borderWidth: number;
      tension: number;
      fill: boolean;
    }> = [];
    
    // Last 10 days
    for (let i = 10; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }

    // Include only non-TND currencies
    const currenciesToShow = this.currencies.filter(c => c.code !== 'TND').slice(0, 3);
    
    const themeColors = this.getChartThemeColors();
    const colors = [themeColors.primary, themeColors.success, themeColors.warning];
    
    currenciesToShow.forEach((currency, index) => {
      // Generate demo data with some variations
      const data = labels.map((_, i) => {
        // Base value with slight random variation
        return currency.rate * (1 + (Math.random() * 0.1 - 0.05) * (i / labels.length));
      });
      
      datasets.push({
        label: `${currency.code} to TND`,
        data: data,
        borderColor: colors[index % colors.length],
        backgroundColor: `${colors[index % colors.length]}22`,
        borderWidth: 2,
        tension: 0.3,
        fill: false
      });
    });

    this.currencyHistoryChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: {
              color: this.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              color: this.isDarkMode ? '#e0e0e0' : '#333333',
              font: {
                family: 'Roboto, Arial, sans-serif'
              }
            }
          },
          y: {
            grid: {
              color: this.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              color: this.isDarkMode ? '#e0e0e0' : '#333333',
              font: {
                family: 'Roboto, Arial, sans-serif'
              }
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: this.isDarkMode ? '#e0e0e0' : '#333333',
              font: {
                family: 'Roboto, Arial, sans-serif'
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                return `${context.dataset.label}: ${value.toFixed(4)}`;
              }
            }
          }
        },
        animation: {
          duration: 1200
        }
      }
    });
  }

  private getChartThemeColors() {
    return {
      primary: this.isDarkMode ? '#5c6bc0' : '#3f51b5',
      primaryHover: this.isDarkMode ? '#8e99f3' : '#5c6bc0',
      primaryBorder: this.isDarkMode ? '#3949ab' : '#303f9f',
      
      success: this.isDarkMode ? '#66bb6a' : '#4caf50',
      successHover: this.isDarkMode ? '#81c784' : '#66bb6a',
      successBorder: this.isDarkMode ? '#43a047' : '#388e3c',
      
      warning: this.isDarkMode ? '#ffa726' : '#ff9800',
      warningHover: this.isDarkMode ? '#ffb74d' : '#ffa726',
      warningBorder: this.isDarkMode ? '#fb8c00' : '#f57c00',
      
      danger: this.isDarkMode ? '#ef5350' : '#f44336',
      dangerHover: this.isDarkMode ? '#e57373' : '#ef5350',
      dangerBorder: this.isDarkMode ? '#e53935' : '#d32f2f',
      
      accent: this.isDarkMode ? '#ec407a' : '#ff4081',
      accentHover: this.isDarkMode ? '#f06292' : '#ec407a',
      accentBorder: this.isDarkMode ? '#d81b60' : '#c2185b'
    };
  }

  private destroyAllCharts(): void {
    [
      this.avaChart,
      this.statusChart,
      this.associerChart,
      this.topAssociersBarChart,
      this.expenseTypeChart,
      this.trendChart,
      this.forecastChartInstance,
      this.currencyHistoryChartInstance
    ].forEach(chart => {
      if (chart) {
        chart.destroy();
      }
    });

    this.avaChart = null;
    this.statusChart = null;
    this.associerChart = null;
    this.topAssociersBarChart = null;
    this.expenseTypeChart = null;
    this.trendChart = null;
    this.forecastChartInstance = null;
    this.currencyHistoryChartInstance = null;
  }

  private cleanupCharts(): void {
    this.destroyAllCharts();
  }

  private setupChartResponsiveness(): void {
    const resizeHandler = () => {
      this.destroyAllCharts();
      this.initCharts();
    };
    
    // Remove existing handler if any
    window.removeEventListener('resize', resizeHandler);
    // Add resize handler
    window.addEventListener('resize', resizeHandler);
  }
  
  // Add to AdminDashboardComponent class
  getAlertIcon(type: string): string {
    switch(type) {
      case 'warning': return 'warning';
      case 'danger': return 'error';
      case 'info': return 'info';
      default: return 'notification_important';
    }
  }
  
  // Access control helper methods
  canViewAllPartners(): boolean {
    return this.isAdmin || this.authService.currentUserValue?.role === Role.Manager;
  }

  canManageAllocations(): boolean {
    return this.isAdmin;
  }

  canExportFullReports(): boolean {
    return this.isAdmin || this.authService.currentUserValue?.role === Role.Manager;
  }
}
