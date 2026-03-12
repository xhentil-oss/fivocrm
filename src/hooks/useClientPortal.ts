import { useEffect, useState } from 'react';
import { useCollection, useMutation } from './useFirestore';
import { useAuth } from '../contexts/AuthContext';
import type { ClientPortalAccess, Customer } from '../types';

/**
 * Hook that checks if the current authenticated user has client portal access.
 * Auto-links the userId if the user's email matches a portal access record.
 * Auto-creates Customer + portal access if user has no records yet.
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
  const { data: matchingCustomers, loading: customersLoading } = useCollection<Customer>(
    'customers',
    user?.email
      ? {
          where: [{ field: 'email', operator: '==', value: user.email }],
        }
      : undefined
  );

  const accessMutation = useMutation<ClientPortalAccess>('clientPortalAccess');
  const customerMutation = useMutation<Customer>('customers');

  // Auto-link: if we found by email but userId is empty, update it
  useEffect(() => {
    if (!user || byUserIdLoading || byEmailLoading) return;
    if (byUserId && byUserId.length > 0) return; // Already linked

    const emailMatch = byEmail?.find(a => !a.userId);
    if (emailMatch) {
      accessMutation.update(emailMatch.id, { userId: user.uid });
    }
  }, [user, byUserId, byEmail, byUserIdLoading, byEmailLoading]);

  // Auto-create: if customer exists but no portal access, create access
  // If NO customer exists, create customer + access
  useEffect(() => {
    if (!user?.email || byUserIdLoading || byEmailLoading || customersLoading || autoCreating) return;
    if (byUserId && byUserId.length > 0) return;
    if (byEmail && byEmail.length > 0) return;

    const customer = matchingCustomers?.[0];
    if (customer) {
      // Customer exists but no portal access — create access
      setAutoCreating(true);
      accessMutation.create({
        customerId: customer.id,
        userId: user.uid,
        email: user.email,
        status: 'Active',
      }).catch(() => setAutoCreating(false));
    } else {
      // No customer at all — create customer + access
      setAutoCreating(true);
      customerMutation.create({
        name: user.displayName || user.email,
        email: user.email,
        status: 'Pending',
      } as any).then((newCustomer) => {
        return accessMutation.create({
          customerId: newCustomer.id,
          userId: user.uid,
          email: user.email!,
          status: 'Active',
        });
      }).catch(() => setAutoCreating(false));
    }
  }, [user, byUserId, byEmail, byUserIdLoading, byEmailLoading, matchingCustomers, customersLoading, autoCreating]);

  const access = byUserId?.[0] || byEmail?.[0] || null;

  return {
    isClient: !!access || autoCreating,
    portalAccess: access,
    customerId: access?.customerId || (autoCreating ? matchingCustomers?.[0]?.id : null) || null,
    isLoading: authLoading || byUserIdLoading || byEmailLoading,
  };
}
