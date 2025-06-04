import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { AuthService } from '../../../services/auth.service';
import { NavigationService, NavItem } from '../../../services/navigation.service';

@Component({
  selector: 'app-nav-menu',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatListModule],
  template: `
    <div class="nav-menu">
      <div class="user-info">
        <div class="avatar">
          <mat-icon *ngIf="!userImage">account_circle</mat-icon>
          <img *ngIf="userImage" [src]="userImage" alt="User profile">
        </div>
        <div class="user-details">
          <span class="user-name">{{ userName }}</span>
          <span class="user-role">{{ userRole }}</span>
        </div>
      </div>

      <mat-nav-list class="nav-list">
        <a mat-list-item *ngFor="let item of navItems" 
           [routerLink]="item.route" 
           routerLinkActive="active">
          <mat-icon>{{ item.icon }}</mat-icon>
          <span>{{ item.label }}</span>
        </a>
      </mat-nav-list>

      <div class="nav-footer">
        <button mat-list-item class="logout-btn" (click)="logout()">
          <mat-icon>exit_to_app</mat-icon>
          <span>Logout</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .nav-menu {
      display: flex;
      flex-direction: column;
      height: 100%;
      background-color: #2c3e50;
      color: white;
      width: 250px;
    }

    .user-info {
      padding: 20px;
      display: flex;
      align-items: center;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      overflow: hidden;
      margin-right: 10px;
      background: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .user-details {
      display: flex;
      flex-direction: column;
    }

    .user-name {
      font-weight: 500;
    }

    .user-role {
      font-size: 0.8rem;
      opacity: 0.8;
    }

    .nav-list {
      flex: 1;
      padding: 0;
    }

    .nav-list a {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      color: white;
      text-decoration: none;
      opacity: 0.8;
      transition: all 0.2s;
    }

    .nav-list a.active {
      background-color: rgba(255,255,255,0.1);
      border-left: 4px solid #2468e5;
      opacity: 1;
    }

    .nav-list a:hover {
      background-color: rgba(255,255,255,0.05);
      opacity: 1;
    }

    .nav-list mat-icon {
      margin-right: 12px;
    }

    .nav-footer {
      border-top: 1px solid rgba(255,255,255,0.1);
    }

    .logout-btn {
      display: flex;
      align-items: center;
      padding: 16px;
      width: 100%;
      border: none;
      background: none;
      color: white;
      opacity: 0.8;
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
    }

    .logout-btn:hover {
      background-color: rgba(255,255,255,0.05);
      opacity: 1;
    }

    .logout-btn mat-icon {
      margin-right: 12px;
    }
  `]
})
export class NavMenuComponent implements OnInit {
  navItems: NavItem[] = [];
  userName: string = '';
  userRole: string = '';
  userImage: string | null = null;

  constructor(
    private authService: AuthService,
    private navigationService: NavigationService
  ) { }

  ngOnInit(): void {
    this.navItems = this.navigationService.getNavItems();
    
    const user = this.authService.currentUserValue;
    if (user) {
      this.userName = `${user.nameUser} ${user.surname}`;
      this.userRole = this.getRoleName(user.role);
      this.userImage = user.profileImageUrl ?? null;
    }
  }

  logout(): void {
    this.authService.logout();
  }

  private getRoleName(role: number): string {
    switch(role) {
      case 1: return 'Administrator';
      case 2: return 'User';
      case 3: return 'Manager';
      case 4: return 'Partner';
      case 5: return 'Employee';
      default: return 'User';
    }
  }
}
