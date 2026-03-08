import { useQuery, useAuth } from '@animaapp/playground-react-sdk';
import { useMemo } from 'react';

export type UserPermissions = {
  canAccessProjects: boolean;
  canAccessTasks: boolean;
  canAccessCRM: boolean;
  canAccessInvoices: boolean;
  canAccessReports: boolean;
  canAccessSettings: boolean;
  canAccessGoals: boolean;
  canAccessTeams: boolean;
  canAccessChat: boolean;
  canAccessCustomers: boolean;
  canAccessServices: boolean;
  canAccessExpenses: boolean;
  canAccessProfile: boolean;
  role: string | null;
  teamId: string | null;
  teamName: string | null;
  isAdmin: boolean;
  isLoading: boolean;
};

export function usePermissions(): UserPermissions {
  const { user, isPending: userLoading } = useAuth();
  
  // Query ALL team members first, then filter client-side
  // This is because userId might be stored as email or actual user ID
  const { data: allTeamMembers, isPending: membersLoading } = useQuery('TeamMember', {
    where: { status: 'Active' }
  });

  const { data: teams } = useQuery('Team');

  // Filter team members for current user (check both user.id and user.email)
  const teamMembers = useMemo(() => {
    if (!user || !allTeamMembers) return [];
    
    const filtered = allTeamMembers.filter(m => 
      m.userId === user.id || 
      m.userId === user.email ||
      m.userId.toLowerCase() === user.email?.toLowerCase()
    );
    
    return filtered;
  }, [user, allTeamMembers]);

  const permissions = useMemo(() => {
    // Default permissions (no team membership = full access for now, or restrict as needed)
    const defaultPermissions: UserPermissions = {
      canAccessProjects: true,
      canAccessTasks: true,
      canAccessCRM: true,
      canAccessInvoices: true,
      canAccessReports: true,
      canAccessSettings: true,
      canAccessGoals: true,
      canAccessTeams: true,
      canAccessChat: true,
      canAccessCustomers: true,
      canAccessServices: true,
      canAccessExpenses: true,
      canAccessProfile: true,
      role: null,
      teamId: null,
      teamName: null,
      isAdmin: true,
      isLoading: userLoading || membersLoading,
    };

    if (!user || userLoading || membersLoading) {
      return { ...defaultPermissions, isLoading: true };
    }

    // If user has no team membership, give full access (owner/admin)
    if (!teamMembers || teamMembers.length === 0) {
      return defaultPermissions;
    }

    // Get the first active team membership (could be extended to handle multiple teams)
    const membership = teamMembers[0];
    const team = teams?.find(t => t.id === membership.teamId);
    const isAdmin = membership.role === 'Admin';

    // Admin role gets full access regardless of individual permissions
    if (isAdmin) {
      return {
        ...defaultPermissions,
        role: membership.role,
        teamId: membership.teamId,
        teamName: team?.name || null,
        isAdmin: true,
        isLoading: false,
      };
    }

    // Apply permission flags from team membership
    return {
      canAccessProjects: membership.canAccessProjects ?? false,
      canAccessTasks: membership.canAccessTasks ?? false,
      canAccessCRM: membership.canAccessCRM ?? false,
      canAccessInvoices: membership.canAccessInvoices ?? false,
      canAccessReports: membership.canAccessReports ?? false,
      canAccessSettings: membership.canAccessSettings ?? false,
      // These are derived from other permissions or always allowed
      canAccessGoals: membership.canAccessTasks ?? false, // Goals tied to tasks
      canAccessTeams: true, // Always can view teams
      canAccessChat: true, // Always can access chat
      canAccessCustomers: membership.canAccessCRM ?? false, // Customers tied to CRM
      canAccessServices: membership.canAccessInvoices ?? false, // Services tied to invoices
      canAccessExpenses: membership.canAccessInvoices ?? false, // Expenses tied to invoices
      canAccessProfile: true, // Always can access own profile
      role: membership.role,
      teamId: membership.teamId,
      teamName: team?.name || null,
      isAdmin: false,
      isLoading: false,
    };
  }, [user, teamMembers, teams, userLoading, membersLoading]);

  return permissions;
}
