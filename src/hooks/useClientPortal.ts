import { useEffect, useState } from 'react';
import { useCollection, useMutation } from './useFirestore';
import { useAuth } from '../contexts/AuthContext';
import type { ClientPortalAccess, Customer } from '../types';

/**
 * Hook that checks if the current authenticated user has client portal access.
 * Auto-links the userId if the user's email matches a portal access record.
 * Auto-creates portal access if a Customer record exists with matching email.
 */
export function useClientPortal() {
  const { user, loading: authLoading } = useAuth();
  const [autoCreating, setAutoCreating] = useState(false);

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

  // Check for matching customer (for auto-creating access)
  const { data: matchingCustomers } = useCollection<Customer>(
    'customers',
    user?.email
      ? {
          where: [{ field: 'email', operator: '==', value: user.email }],
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

  // Auto-create: if customer exists but no portal access, create one
  useEffect(() => {
    if (!user || byUserIdLoading || byEmailLoading || autoCreating) return;
    if (byUserId && byUserId.length > 0) return;
    if (byEmail && byEmail.length > 0) return;

    const customer = matchingCustomers?.[0];
    if (customer && customer.email) {
      setAutoCreating(true);
      accessMutation.create({
        customerId: customer.id,
        userId: user.uid,
        email: customer.email,
        status: 'Active',
      }).catch(() => setAutoCreating(false));
    }
  }, [user, byUserId, byEmail, byUserIdLoading, byEmailLoading, matchingCustomers, autoCreating]);

  const access = byUserId?.[0] || byEmail?.[0] || null;

  return {
    isClient: !!access || autoCreating,
    portalAccess: access,
    customerId: access?.customerId || (autoCreating ? matchingCustomers?.[0]?.id : null) || null,
    isLoading: authLoading || byUserIdLoading || byEmailLoading,
  };
}
