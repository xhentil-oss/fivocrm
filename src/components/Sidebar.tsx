import React from 'react';
import { NavLink } from 'react-router-dom';
import { FolderKanban, Users, CheckSquare, BarChart3, Settings, UsersRound, Receipt, MessageSquare, Target, UserCircle, DollarSign, Clock, Shield } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePermissions } from '../hooks/usePermissions';
import { Badge } from './ui/badge';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

type NavItem = {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permissionKey: string;
};

const allNavItems: NavItem[] = [
  { path: '/app/projects', label: 'Projektet', icon: FolderKanban, permissionKey: 'canAccessProjects' },
  { path: '/app/crm', label: 'CRM Leads', icon: Users, permissionKey: 'canAccessCRM' },
  { path: '/app/customers', label: 'Klientët', icon: Users, permissionKey: 'canAccessCustomers' },
  { path: '/app/tasks', label: 'Detyrat', icon: CheckSquare, permissionKey: 'canAccessTasks' },
  { path: '/app/goals', label: 'Objektivat', icon: Target, permissionKey: 'canAccessGoals' },
  { path: '/app/teams', label: 'Ekipet', icon: UsersRound, permissionKey: 'canAccessTeams' },
  { path: '/app/services', label: 'Shërbimet', icon: Receipt, permissionKey: 'canAccessServices' },
  { path: '/app/invoices', label: 'Faturat', icon: Receipt, permissionKey: 'canAccessInvoices' },
  { path: '/app/expenses', label: 'Shpenzimet', icon: DollarSign, permissionKey: 'canAccessExpenses' },
  { path: '/app/chat', label: 'Chat', icon: MessageSquare, permissionKey: 'canAccessChat' },
  { path: '/app/reports', label: 'Raportet', icon: BarChart3, permissionKey: 'canAccessReports' },
  { path: '/app/profile', label: 'Profili', icon: UserCircle, permissionKey: 'canAccessProfile' },
  { path: '/app/settings', label: 'Cilësimet', icon: Settings, permissionKey: 'canAccessSettings' },
];

const Sidebar: React.FC<SidebarProps> = ({ collapsed, mobileOpen, onCloseMobile }) => {
  const permissions = usePermissions();

  // Filter nav items based on user permissions
  const navItems = allNavItems.filter(item => {
    const permKey = item.permissionKey as keyof typeof permissions;
    return permissions[permKey] === true;
  });

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-14 h-[calc(100vh-3.5rem)] bg-card border-r transition-all duration-300 z-40 flex flex-col',
          collapsed ? 'w-16' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Role indicator */}
        {!collapsed && permissions.role && (
          <div className="px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Roli im</p>
                <p className="text-sm font-medium truncate">{permissions.role}</p>
              </div>
            </div>
            {permissions.teamName && (
              <Badge variant="secondary" className="mt-2 text-xs">
                {permissions.teamName}
              </Badge>
            )}
          </div>
        )}

        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {permissions.isLoading ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              Duke ngarkuar...
            </div>
          ) : (
            navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    'hover:bg-primary/10 hover:text-primary hover:translate-x-1',
                    isActive && 'bg-primary/15 text-primary font-medium shadow-sm border-l-2 border-primary',
                    collapsed && 'justify-center hover:translate-x-0'
                  )
                }
              >
                <item.icon className="h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110" />
                {!collapsed && <span className="transition-colors">{item.label}</span>}
              </NavLink>
            ))
          )}
        </nav>

        {/* Permission count indicator */}
        {!collapsed && !permissions.isLoading && permissions.role && (
          <div className="px-4 py-3 border-t text-xs text-muted-foreground">
            {navItems.length} module të aksesueshme
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
