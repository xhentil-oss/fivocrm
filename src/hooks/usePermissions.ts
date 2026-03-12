import { useCollection } from './useFirestore';
import { useAuth } from '../contexts/AuthContext';
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
  canAccessTimeTracking: boolean;
  canEdit: boolean;
  role: string | null;
  teamId: string | null;
  teamName: string | null;
  isAdmin: boolean;
  isOwner: boolean;
  isLoading: boolean;
};

// Full access for admin/owner
const fullAccessPermissions: Omit<UserPermissions, 'role' | 'teamId' | 'teamName' | 'isAdmin' | 'isOwner' | 'isLoading'> = {
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
  canAccessTimeTracking: true,
  canEdit: true,
};

// Minimal access for users not yet assigned to a team
const restrictedPermissions: Omit<UserPermissions, 'role' | 'teamId' | 'teamName' | 'isAdmin' | 'isOwner' | 'isLoading'> = {
  canAccessProjects: false,
  canAccessTasks: false,
  canAccessCRM: false,
  canAccessInvoices: false,
  canAccessReports: false,
  canAccessSettings: false,
  canAccessGoals: false,
  canAccessTeams: false,
  canAccessChat: false,
  canAccessCustomers: false,
  canAccessServices: false,
  canAccessExpenses: false,
  canAccessProfile: true,
  canAccessTimeTracking: false,
  canEdit: false,
};

export function usePermissions(): UserPermissions {
  const { user, loading: userLoading } = useAuth();
  
  // Query ALL team members first, then filter client-side
  const { data: allTeamMembers, loading: membersLoading } = useCollection<any>('teamMembers', {
    where: [{ field: 'status', operator: '==', value: 'Active' }]
  });

  const { data: teams, loading: teamsLoading } = useCollection<any>('teams');

  // Filter team members for current user (check both user.uid and user.email)
  const teamMembers = useMemo(() => {
    if (!user || !allTeamMembers) return [];
    
    return allTeamMembers.filter(m => 
      m.userId === user.uid || 
      m.userId === user.email ||
      (m.userId && user.email && m.userId.toLowerCase() === user.email.toLowerCase())
    );
  }, [user, allTeamMembers]);

  // Check if the current user is the creator/owner of any team
  const isOwner = useMemo(() => {
    if (!user || !teams) return false;
    return teams.some((t: any) => t.createdByUserId === user.uid);
  }, [user, teams]);

  const isLoading = userLoading || membersLoading || teamsLoading;

  const permissions = useMemo((): UserPermissions => {
    // While loading, return restricted permissions with loading flag
    if (!user || isLoading) {
      return {
        ...restrictedPermissions,
        role: null,
        teamId: null,
        teamName: null,
        isAdmin: false,
        isOwner: false,
        isLoading: true,
      };
    }

    // OWNER: User who created a team gets full admin access
    if (isOwner) {
      // Check if owner also has a team membership (for teamId/teamName)
      const ownerMembership = teamMembers.length > 0 ? teamMembers[0] : null;
      const ownerTeam = ownerMembership ? teams?.find((t: any) => t.id === ownerMembership.teamId) : null;
      return {
        ...fullAccessPermissions,
        role: ownerMembership?.role || 'Admin',
        teamId: ownerMembership?.teamId || null,
        teamName: ownerTeam?.name || null,
        isAdmin: true,
        isOwner: true,
        isLoading: false,
      };
    }

    // NO TEAM MEMBERSHIP and NOT OWNER: restricted access
    if (!teamMembers || teamMembers.length === 0) {
      return {
        ...restrictedPermissions,
        role: null,
        teamId: null,
        teamName: null,
        isAdmin: false,
        isOwner: false,
        isLoading: false,
      };
    }

    // Has team membership — use role-based permissions
    const membership = teamMembers[0];
    const team = teams?.find((t: any) => t.id === membership.teamId);
    const memberIsAdmin = membership.role === 'Admin';

    // Admin role gets full access
    if (memberIsAdmin) {
      return {
        ...fullAccessPermissions,
        role: membership.role,
        teamId: membership.teamId,
        teamName: team?.name || null,
        isAdmin: true,
        isOwner: false,
        isLoading: false,
      };
    }

    // Viewer role: read-only access to permitted modules (no CRUD)
    // Member/Manager roles: access based on stored permission flags with edit rights
    const isViewer = membership.role === 'Viewer';
    
    return {
      canAccessProjects: membership.canAccessProjects === true,
      canAccessTasks: membership.canAccessTasks === true,
      canAccessCRM: membership.canAccessCRM === true,
      canAccessInvoices: membership.canAccessInvoices === true,
      canAccessReports: membership.canAccessReports === true,
      canAccessSettings: membership.canAccessSettings === true,
      canAccessGoals: membership.canAccessGoals === true || membership.canAccessTasks === true,
      canAccessTeams: false, // Only admin/owner can manage teams
      canAccessChat: true,
      canAccessCustomers: membership.canAccessCustomers === true || membership.canAccessCRM === true,
      canAccessServices: membership.canAccessServices === true || membership.canAccessInvoices === true,
      canAccessExpenses: membership.canAccessExpenses === true || membership.canAccessInvoices === true,
      canAccessProfile: true,
      canAccessTimeTracking: membership.canAccessTasks === true,
      canEdit: !isViewer, // Viewers can only read, Members/Managers can edit
      role: membership.role,
      teamId: membership.teamId,
      teamName: team?.name || null,
      isAdmin: false,
      isOwner: false,
      isLoading: false,
    };
  }, [user, teamMembers, teams, isOwner, isLoading]);

  return permissions;
}
