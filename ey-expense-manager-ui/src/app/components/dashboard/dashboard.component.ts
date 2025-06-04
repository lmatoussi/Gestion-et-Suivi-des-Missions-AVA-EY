import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <h1>Dashboard</h1>
      <p>Welcome to the EY Expense Manager Dashboard</p>
      <!-- Dashboard content will be added here -->
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 20px;
    }
    
    h1 {
      color: #2468e5;
      margin-bottom: 20px;
    }
  `]
})
export class DashboardComponent {
  constructor() { }
}
