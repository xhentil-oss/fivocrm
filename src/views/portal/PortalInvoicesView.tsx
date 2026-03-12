import React, { useState } from 'react';
import { useClientPortal } from '../../hooks/useClientPortal';
import { useCollection } from '../../hooks/useFirestore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Separator } from '../../components/ui/separator';
import { FileText, Search, Eye, DollarSign, Calendar, CreditCard } from 'lucide-react';
import type { Invoice, InvoiceItem, Service, Customer } from '../../types';

const PortalInvoicesView: React.FC = () => {
  const { customerId } = useClientPortal();
  const [statusFilter, setStatusFilter] = useState<string>('__all__');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const { data: invoices, loading } = useCollection<Invoice>('invoices', {
    where: [{ field: 'customerId', operator: '==', value: customerId || '' }],
    orderBy: { field: 'createdAt', direction: 'desc' },
  });

  const { data: invoiceItems } = useCollection<InvoiceItem>('invoiceItems');
  const { data: services } = useCollection<Service>('services');
  const { data: customers } = useCollection<Customer>('customers');

  const customer = customers?.find(c => c.id === customerId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      case 'Draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Paid': return 'E Paguar';
      case 'Pending': return 'Në Pritje';
      case 'Overdue': return 'E Vonuar';
      case 'Draft': return 'Draft';
      default: return status;
    }
  };

  const filteredInvoices = React.useMemo(() => {
    if (!invoices) return [];
    return invoices.filter(inv => {
      if (statusFilter !== '__all__' && inv.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const num = inv.invoiceNumber || `INV-${inv.id.slice(0, 6)}`;
        if (!num.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [invoices, statusFilter, searchQuery]);

  const selectedItems = invoiceItems?.filter(item => item.invoiceId === selectedInvoice?.id) || [];

  const getServiceName = (serviceId?: string) => {
    if (!serviceId) return 'Shërbim';
    const service = services?.find(s => s.id === serviceId);
    return service?.title || service?.name || 'Shërbim';
  };

  const totalPaid = invoices?.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.total || i.amount || 0), 0) || 0;
  const totalPending = invoices?.filter(i => i.status === 'Pending' || i.status === 'Overdue').reduce((s, i) => s + (i.total || i.amount || 0), 0) || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Duke ngarkuar faturat...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Faturat</h1>
        <p className="text-muted-foreground mt-1">
          Shikoni dhe menaxhoni faturat tuaja
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">E Paguar</p>
                <p className="text-xl font-bold">{totalPaid.toLocaleString()} ALL</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <CreditCard className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Në Pritje</p>
                <p className="text-xl font-bold">{totalPending.toLocaleString()} ALL</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Totale Fatura</p>
                <p className="text-xl font-bold">{invoices?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Kërko faturë..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Statusi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Të gjitha</SelectItem>
            <SelectItem value="Paid">E Paguar</SelectItem>
            <SelectItem value="Pending">Në Pritje</SelectItem>
            <SelectItem value="Overdue">E Vonuar</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoices List */}
      {filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nuk u gjet asnjë faturë</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map(invoice => (
            <Card key={invoice.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-muted rounded-lg">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {invoice.invoiceNumber || `INV-${invoice.id.slice(0, 6)}`}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {invoice.createdAt instanceof Date
                          ? invoice.createdAt.toLocaleDateString('sq-AL')
                          : ''}
                        {invoice.dueDate && (
                          <>
                            <span>•</span>
                            <span>
                              Afati: {invoice.dueDate instanceof Date
                                ? invoice.dueDate.toLocaleDateString('sq-AL')
                                : ''}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold">
                      {(invoice.total || invoice.amount || 0).toLocaleString()} ALL
                    </span>
                    <Badge className={getStatusColor(invoice.status)} variant="secondary">
                      {getStatusLabel(invoice.status)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Fatura {selectedInvoice?.invoiceNumber || `INV-${selectedInvoice?.id?.slice(0, 6)}`}
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Data</p>
                  <p className="font-medium">
                    {selectedInvoice.createdAt instanceof Date
                      ? selectedInvoice.createdAt.toLocaleDateString('sq-AL')
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Afati</p>
                  <p className="font-medium">
                    {selectedInvoice.dueDate instanceof Date
                      ? selectedInvoice.dueDate.toLocaleDateString('sq-AL')
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Statusi</p>
                  <Badge className={getStatusColor(selectedInvoice.status)} variant="secondary">
                    {getStatusLabel(selectedInvoice.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Mënyra e Pagesës</p>
                  <p className="font-medium">{selectedInvoice.paymentMethod || '-'}</p>
                </div>
              </div>

              {customer && (
                <>
                  <Separator />
                  <div className="text-sm">
                    <p className="text-muted-foreground mb-1">Klienti</p>
                    <p className="font-medium">{customer.name}</p>
                    {customer.company && <p className="text-muted-foreground">{customer.company}</p>}
                    {customer.email && <p className="text-muted-foreground">{customer.email}</p>}
                  </div>
                </>
              )}

              {selectedItems.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Artikujt</p>
                    <div className="space-y-2">
                      {selectedItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                          <div>
                            <p className="font-medium">{item.description || getServiceName(item.serviceId)}</p>
                            <p className="text-muted-foreground">
                              {item.quantity} × {item.unitPrice.toLocaleString()} ALL
                            </p>
                          </div>
                          <p className="font-semibold">{item.totalPrice.toLocaleString()} ALL</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Totali</span>
                <span>{(selectedInvoice.total || selectedInvoice.amount || 0).toLocaleString()} ALL</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PortalInvoicesView;
