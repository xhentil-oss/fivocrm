import { useEffect } from 'react';
import { useCollection, useMutation } from './useFirestore';
import { useAuth } from '../contexts/AuthContext';
import type { ClientPortalAccess } from '../types';

/**
 * Hook that checks if the current authenticated user has client portal access.
 * Auto-links the userId if the user's email matches a portal access record.
 */
export function useClientPortal() {
  const { user, loading: authLoading } = useAuth();

  // First try to find by userId (already linked)
  const { data: byUserId, loading: byUserIdLoading } = useCollection<ClientPortalAccess>(
    'clientPortalAccess',
    user
      ? {
          where: [
            { field: 'userId', operator: '==', value: user.uid },
            { field: 'status', operator: '==', value: 'Active' },
          ],
        }
      : undefined
  );

  // Also check by email (not yet linked)
  const { data: byEmail, loading: byEmailLoading } = useCollection<ClientPortalAccess>(
    'clientPortalAccess',
    user?.email
      ? {
          where: [
            { field: 'email', operator: '==', value: user.email },
            { field: 'status', operator: '==', value: 'Active' },
          ],
        }
      : undefined
  );

  const accessMutation = useMutation<ClientPortalAccess>('clientPortalAccess');

  // Auto-link: if we found by email but userId is empty, update it
  useEffect(() => {
    if (!user || byUserIdLoading || byEmailLoading) return;
    if (byUserId && byUserId.length > 0) return; // Already linked

    const emailMatch = byEmail?.find(a => !a.userId);
    if (emailMatch) {
      accessMutation.update(emailMatch.id, { userId: user.uid });
    }
  }, [user, byUserId, byEmail, byUserIdLoading, byEmailLoading]);

  const access = byUserId?.[0] || byEmail?.[0] || null;

  return {
    isClient: !!access,
    portalAccess: access,
    customerId: access?.customerId || null,
    isLoading: authLoading || byUserIdLoading || byEmailLoading,
  };
}
