import React from 'react';
import { useClientPortal } from '../../hooks/useClientPortal';
import { useCollection } from '../../hooks/useFirestore';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { ShoppingBag, Tag, DollarSign } from 'lucide-react';
import type { Invoice, InvoiceItem, Service } from '../../types';

const PortalServicesView: React.FC = () => {
  const { customerId } = useClientPortal();

  const { data: invoices } = useCollection<Invoice>('invoices', {
    where: [{ field: 'customerId', operator: '==', value: customerId || '' }],
  });

  const { data: invoiceItems } = useCollection<InvoiceItem>('invoiceItems');
  const { data: services, loading } = useCollection<Service>('services');

  // Build a map of purchased services from invoice items
  const purchasedServiceDetails = React.useMemo(() => {
    if (!invoices || !invoiceItems || !services) return [];

    const invoiceIds = new Set(invoices.map(i => i.id));
    const myItems = invoiceItems.filter(item => invoiceIds.has(item.invoiceId));

    // Group by service
    const serviceMap = new Map<string, { service: Service; totalSpent: number; invoiceCount: number; lastPurchase: Date | null }>();

    myItems.forEach(item => {
      if (!item.serviceId) return;
      const service = services.find(s => s.id === item.serviceId);
      if (!service) return;

      const existing = serviceMap.get(service.id);
      const invoice = invoices.find(i => i.id === item.invoiceId);
      const invoiceDate = invoice?.createdAt instanceof Date ? invoice.createdAt : null;

      if (existing) {
        existing.totalSpent += item.totalPrice;
        existing.invoiceCount += 1;
        if (invoiceDate && (!existing.lastPurchase || invoiceDate > existing.lastPurchase)) {
          existing.lastPurchase = invoiceDate;
        }
      } else {
        serviceMap.set(service.id, {
          service,
          totalSpent: item.totalPrice,
          invoiceCount: 1,
          lastPurchase: invoiceDate,
        });
      }
    });

    return Array.from(serviceMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [invoices, invoiceItems, services]);

  // All available services (for browsing)
  const allServices = services || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Duke ngarkuar shërbimet...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Shërbimet</h1>
        <p className="text-muted-foreground mt-1">
          Shërbimet tuaja të blera dhe katalogu i shërbimeve
        </p>
      </div>

      {/* Purchased Services */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Shërbimet e Blera</h2>
        {purchasedServiceDetails.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nuk keni blerë asnjë shërbim akoma</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {purchasedServiceDetails.map(({ service, totalSpent, invoiceCount, lastPurchase }) => (
              <Card key={service.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-primary/10 rounded-lg flex-shrink-0">
                      <ShoppingBag className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{service.title || service.name}</h3>
                      {service.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {service.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {service.category && (
                          <Badge variant="secondary" className="gap-1">
                            <Tag className="h-3 w-3" />
                            {service.category}
                          </Badge>
                        )}
                        <Badge variant="outline" className="gap-1">
                          <DollarSign className="h-3 w-3" />
                          {totalSpent.toLocaleString()} {service.currency || 'ALL'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span>{invoiceCount} faturë</span>
                        {lastPurchase && (
                          <span>Blerje e fundit: {lastPurchase.toLocaleDateString('sq-AL')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Service Catalog */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Katalogu i Shërbimeve</h2>
        {allServices.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nuk ka shërbime në katalog</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allServices.map(service => {
              const isPurchased = purchasedServiceDetails.some(p => p.service.id === service.id);
              return (
                <Card key={service.id} className={`transition-shadow hover:shadow-md ${isPurchased ? 'border-primary/30' : ''}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{service.title || service.name}</h3>
                          {isPurchased && (
                            <Badge className="bg-primary/10 text-primary text-xs">Aktiv</Badge>
                          )}
                        </div>
                        {service.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                            {service.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      {service.category && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Tag className="h-3 w-3" />
                          {service.category}
                        </Badge>
                      )}
                      <span className="font-bold text-lg">
                        {service.price.toLocaleString()} {service.currency || 'ALL'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PortalServicesView;
