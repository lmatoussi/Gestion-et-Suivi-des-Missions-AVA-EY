export interface DashboardTab {
  name: string;
  icon?: string;
}

export const DEFAULT_DASHBOARD_TABS: DashboardTab[] = [
  { name: 'Budget Overview', icon: 'dashboard' },
  { name: 'Missions', icon: 'work' },
  { name: 'Partners', icon: 'people' },
  { name: 'History', icon: 'history' }
];
