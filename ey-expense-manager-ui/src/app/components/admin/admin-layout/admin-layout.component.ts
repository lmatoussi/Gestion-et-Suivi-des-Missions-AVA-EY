import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="admin-layout">
      <!-- Sidebar and header will be implemented later -->
      <main class="admin-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .admin-layout {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    
    .admin-content {
      flex: 1;
      padding: 20px;
    }
  `]
})
export class AdminLayoutComponent {
  constructor() { }
}
