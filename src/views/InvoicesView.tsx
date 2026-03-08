import React, { useState } from 'react';
import { useCollection, useMutation } from '../hooks/useFirestore';
import { DollarSign, Plus, Calendar as CalendarIcon, CreditCard, Mail, Send, Building2, ShoppingCart, Trash2, Eye, Edit2, Check, X, ExternalLink, Loader2 } from 'lucide-react';
import ExportButton from '../components/ExportButton';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import type { Invoice, Customer, Service, InvoiceItem } from '../types';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Paid':
      return 'bg-success text-success-foreground';
    case 'Pending':
      return 'bg-warning text-warning-foreground';
    case 'Overdue':
      return 'bg-error text-error-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const InvoicesView: React.FC = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const { data: invoices, loading: invoicesLoading } = useCollection<Invoice>('invoices', {
    orderBy: { field: 'createdAt', direction: 'desc' }
  });
  const { data: customers } = useCollection<Customer>('customers');
  const invoiceMutation = useMutation<Invoice>('invoices');

  const handleSendEmail = async (invoiceId: string) => {
    await invoiceMutation.update(invoiceId, { emailSent: true });
    alert('Invoice email sent successfully!');
  };

  const handleSendReminder = async (invoiceId: string) => {
    await invoiceMutation.update(invoiceId, { reminderSent: true });
    alert('Payment reminder sent successfully!');
  };

  const handleStripePayment = async (invoice: Invoice) => {
    const stripeKey = localStorage.getItem('stripe_publishable_key');
    
    if (!stripeKey) {
      alert('Stripe nuk është konfiguruar! Shkoni te Settings → Integrations për të vendosur API keys.');
      return;
    }

    // Në një aplikacion real, kjo do të krijonte një Stripe Checkout Session në backend
    // dhe do të ridrejtonte përdoruesin te Stripe Checkout
    const customer = customers?.find(c => c.id === invoice.customerId);
    
    // Simulojmë krijimin e një payment link
    const mockCheckoutUrl = `https://checkout.stripe.com/pay/demo?amount=${invoice.total}&currency=usd&customer=${encodeURIComponent(customer?.email || '')}&invoice=${invoice.invoiceNumber || invoice.id}`;
    
    // Për demo, tregojmë një dialog konfirmimi
    const confirmed = window.confirm(
      `Do të ridrejtoheni te Stripe Checkout për të paguar:\n\n` +
      `Fatura: ${invoice.invoiceNumber || invoice.id.slice(0, 8)}\n` +
      `Shuma: $${invoice.total?.toLocaleString()}\n` +
      `Klient: ${customer?.name || 'N/A'}\n\n` +
      `Në prodhim, kjo do të hapte Stripe Checkout.\n` +
      `Për tani, do të shënojmë faturën si të paguar?`
    );

    if (confirmed) {
      await invoiceMutation.update(invoice.id, { 
        status: 'Paid',
        paidAt: new Date(),
        paymentMethod: 'Stripe'
      });
    }
  };

  const startEditing = (invoiceId: string, field: string, currentValue: any) => {
    setEditingInvoiceId(invoiceId);
    setEditingField(field);
    setEditValue(String(currentValue || ''));
  };

  const cancelEditing = () => {
    setEditingInvoiceId(null);
    setEditingField(null);
    setEditValue('');
  };

  const saveEdit = async (invoiceId: string, field: string) => {
    const updateData: any = {};
    
    if (field === 'total' || field === 'amount') {
      updateData[field] = parseFloat(editValue) || 0;
    } else {
      updateData[field] = editValue;
    }
    
    await invoiceMutation.update(invoiceId, updateData);
    cancelEditing();
  };

  const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
  const paidInvoices = invoices?.filter(inv => inv.status === 'Paid').length || 0;
  const pendingAmount = invoices?.filter(inv => inv.status === 'Pending').reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;

  if (invoicesLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-32 skeleton rounded" />
            <div className="h-4 w-40 skeleton rounded" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 skeleton rounded" />
            <div className="h-10 w-32 skeleton rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 bg-card rounded-lg border space-y-3">
              <div className="flex justify-between">
                <div className="h-4 w-28 skeleton rounded" />
                <div className="h-5 w-5 skeleton rounded" />
              </div>
              <div className="h-8 w-24 skeleton rounded" />
            </div>
          ))}
        </div>
        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="h-12 w-full skeleton" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 w-full skeleton border-t" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2 text-foreground">Faturat</h1>
          <p className="text-body text-muted-foreground mt-1">
            {invoices?.length || 0} fatura gjithsej
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton 
            data={invoices || []} 
            filename="invoices"
            columns={['invoiceNumber', 'customerId', 'total', 'status', 'dueDate', 'paymentMethod']}
          />
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Faturë e Re
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Krijo Faturë të Re</DialogTitle>
              </DialogHeader>
              <InvoiceForm onClose={() => setIsCreateDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children">
        <Card className="p-6 space-y-2 card-hover metric-card-success border-l-4 border-l-success">
          <div className="flex items-center justify-between">
            <p className="text-body-sm text-muted-foreground">Të Ardhura Totale</p>
            <div className="p-2 bg-success/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-success" />
            </div>
          </div>
          <p className="text-h2 text-foreground font-medium animate-count-up">
            ${totalRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-success">+12% nga muaji i kaluar</p>
        </Card>

        <Card className="p-6 space-y-2 card-hover metric-card-primary border-l-4 border-l-primary">
          <div className="flex items-center justify-between">
            <p className="text-body-sm text-muted-foreground">Fatura të Paguara</p>
            <div className="p-2 bg-primary/10 rounded-lg">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="text-h2 text-foreground font-medium animate-count-up">
            {paidInvoices}
          </p>
          <p className="text-xs text-primary">Të përfunduara</p>
        </Card>

        <Card className="p-6 space-y-2 card-hover metric-card-warning border-l-4 border-l-warning">
          <div className="flex items-center justify-between">
            <p className="text-body-sm text-muted-foreground">Shuma në Pritje</p>
            <div className="p-2 bg-warning/10 rounded-lg">
              <CalendarIcon className="w-5 h-5 text-warning" />
            </div>
          </div>
          <p className="text-h2 text-foreground font-medium animate-count-up">
            ${pendingAmount.toLocaleString()}
          </p>
          <p className="text-xs text-warning">Në pritje të pagesës</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-4 text-left text-body-sm font-medium">Fatura #</th>
                <th className="px-6 py-4 text-left text-body-sm font-medium">Klienti</th>
                <th className="px-6 py-4 text-left text-body-sm font-medium">Totali</th>
                <th className="px-6 py-4 text-left text-body-sm font-medium">Statusi</th>
                <th className="px-6 py-4 text-left text-body-sm font-medium">Afati</th>
                <th className="px-6 py-4 text-left text-body-sm font-medium">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices?.map((invoice) => {
                const customer = customers?.find(c => c.id === invoice.customerId);
                return (
                  <tr key={invoice.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 text-body-sm font-mono">
                      {invoice.invoiceNumber || invoice.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span>{customer?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-body font-medium">
                      {editingInvoiceId === invoice.id && editingField === 'total' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-24 px-2 py-1 border rounded"
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => saveEdit(invoice.id, 'total')}
                          >
                            <Check className="w-4 h-4 text-success" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={cancelEditing}
                          >
                            <X className="w-4 h-4 text-error" />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 px-2 py-1 rounded"
                          onClick={() => startEditing(invoice.id, 'total', invoice.total ?? invoice.amount ?? 0)}
                        >
                          ${((invoice.total ?? invoice.amount ?? 0)).toLocaleString()}
                          <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingInvoiceId === invoice.id && editingField === 'status' ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="px-2 py-1 border rounded"
                            autoFocus
                          >
                            <option value="Pending">Pending</option>
                            <option value="Paid">Paid</option>
                            <option value="Overdue">Overdue</option>
                          </select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => saveEdit(invoice.id, 'status')}
                          >
                            <Check className="w-4 h-4 text-success" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={cancelEditing}
                          >
                            <X className="w-4 h-4 text-error" />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="cursor-pointer hover:bg-muted/50 px-2 py-1 rounded inline-block"
                          onClick={() => startEditing(invoice.id, 'status', invoice.status)}
                        >
                          <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedInvoice(invoice)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {!invoice.emailSent && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendEmail(invoice.id)}
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        )}
                        {invoice.status === 'Pending' && !invoice.reminderSent && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendReminder(invoice.id)}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        )}
                        {invoice.status === 'Pending' && (
                          <Button
                            size="sm"
                            className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
                            onClick={() => handleStripePayment(invoice)}
                          >
                            <CreditCard className="w-4 h-4 mr-1" />
                            Paguaj
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedInvoice && (
        <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detajet e Faturës</DialogTitle>
            </DialogHeader>
            <InvoiceDetails invoice={selectedInvoice} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

const InvoiceForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [lineItems, setLineItems] = useState<Array<{ serviceId: string; quantity: number }>>([]);
  const [tax, setTax] = useState<number>(0);

  const { data: customers } = useQuery('Customer');
  const { data: services } = useQuery('Service');
  const invoiceMutation = useMutation('Invoice');
  const invoiceItemMutation = useMutation('InvoiceItem');

  const addLineItem = () => {
    setLineItems([...lineItems, { serviceId: '', quantity: 1 }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: 'serviceId' | 'quantity', value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => {
      const service = services?.find(s => s.id === item.serviceId);
      return sum + (service?.price || 0) * item.quantity;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const subtotal = calculateSubtotal();
    const total = subtotal + tax;

    const invoice = await invoiceMutation.create({
      customerId: selectedCustomerId,
      projectId: formData.get('projectId') as string || '',
      invoiceNumber: formData.get('invoiceNumber') as string,
      paymentMethod: formData.get('paymentMethod') as string,
      status: formData.get('status') as string,
      dueDate: dueDate || new Date(),
      notes: formData.get('notes') as string,
      subtotal,
      tax,
      total,
      amount: total,
      emailSent: false,
      reminderSent: false,
      paymentUrl: formData.get('paymentUrl') as string,
    });

    for (const item of lineItems) {
      const service = services?.find(s => s.id === item.serviceId);
      if (service) {
        await invoiceItemMutation.create({
          invoiceId: invoice.id,
          serviceId: item.serviceId,
          quantity: item.quantity,
          unitPrice: service.price,
          totalPrice: service.price * item.quantity,
        });
      }
    }

    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="invoiceNumber">Invoice Number</Label>
          <Input id="invoiceNumber" name="invoiceNumber" placeholder="INV-001" />
        </div>

        <div>
          <Label htmlFor="customerId">Customer *</Label>
          <Select name="customerId" value={selectedCustomerId} onValueChange={setSelectedCustomerId} required>
            <SelectTrigger>
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {customers?.map(customer => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name} {customer.company && `(${customer.company})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Line Items *</Label>
          <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
        <div className="space-y-2">
          {lineItems.map((item, index) => (
            <div key={index} className="flex gap-2 items-end">
              <div className="flex-1">
                <Select
                  value={item.serviceId || "placeholder"}
                  onValueChange={(value) => {
                    if (value !== "placeholder") {
                      updateLineItem(index, 'serviceId', value);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder" disabled>Select service</SelectItem>
                    {services?.map(service => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.title} - ${service.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-24">
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value))}
                  placeholder="Qty"
                />
              </div>
              <div className="w-24 text-right">
                ${((services?.find(s => s.id === item.serviceId)?.price || 0) * item.quantity).toFixed(2)}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => removeLineItem(index)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="paymentMethod">Payment Method</Label>
          <Select name="paymentMethod" defaultValue="Stripe">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Stripe">Stripe</SelectItem>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="Bank">Bank Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue="Pending">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Due Date *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dueDate ? dueDate.toLocaleDateString() : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={dueDate} onSelect={setDueDate} />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <Label htmlFor="tax">Tax Amount</Label>
        <Input
          id="tax"
          name="tax"
          type="number"
          step="0.01"
          value={tax}
          onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
        />
      </div>

      <div>
        <Label htmlFor="paymentUrl">Online Payment URL</Label>
        <Input
          id="paymentUrl"
          name="paymentUrl"
          type="url"
          placeholder="https://payment.example.com/invoice/..."
        />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} placeholder="Additional notes..." />
      </div>

      <div className="border-t pt-4">
        <div className="space-y-2 text-right">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal:</span>
            <span className="font-medium">${calculateSubtotal().toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax:</span>
            <span className="font-medium">${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span>${(calculateSubtotal() + tax).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full">
        Create Invoice
      </Button>
    </form>
  );
};

const InvoiceDetails: React.FC<{ invoice: Invoice }> = ({ invoice }) => {
  const { data: customer } = useQuery('Customer', invoice.customerId);
  const { data: invoiceItems } = useQuery('InvoiceItem', {
    where: { invoiceId: invoice.id }
  });
  const { query: queryService } = useLazyQuery('Service');

  const [services, setServices] = React.useState<Record<string, any>>({});

  React.useEffect(() => {
    const loadServices = async () => {
      if (!invoiceItems) return;
      const serviceMap: Record<string, any> = {};
      for (const item of invoiceItems) {
        if (!serviceMap[item.serviceId]) {
          const service = await queryService(item.serviceId);
          serviceMap[item.serviceId] = service;
        }
      }
      setServices(serviceMap);
    };
    loadServices();
  }, [invoiceItems]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-2">Informacioni i Klientit</h3>
          <div className="space-y-1 text-sm">
            <p className="font-medium">{customer?.name}</p>
            {customer?.company && <p className="text-muted-foreground">{customer.company}</p>}
            {customer?.email && <p>{customer.email}</p>}
            {customer?.phone && <p>{customer.phone}</p>}
            {customer?.address && <p className="text-muted-foreground">{customer.address}</p>}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Detajet e Faturës</h3>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Fatura #:</span> {invoice.invoiceNumber || invoice.id.slice(0, 8)}</p>
            <div><span className="text-muted-foreground">Statusi:</span> <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge></div>
            <p><span className="text-muted-foreground">Afati:</span> {new Date(invoice.dueDate).toLocaleDateString('sq-AL')}</p>
            <p><span className="text-muted-foreground">Mënyra e Pagesës:</span> {invoice.paymentMethod}</p>
            {invoice.paidAt && <p><span className="text-muted-foreground">Paguar më:</span> {new Date(invoice.paidAt).toLocaleDateString('sq-AL')}</p>}
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Artikujt</h3>
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2 text-left text-sm">Shërbimi</th>
              <th className="px-4 py-2 text-right text-sm">Sasia</th>
              <th className="px-4 py-2 text-right text-sm">Çmimi</th>
              <th className="px-4 py-2 text-right text-sm">Totali</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {invoiceItems?.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-2">{services[item.serviceId]?.title || 'Duke ngarkuar...'}</td>
                <td className="px-4 py-2 text-right">{item.quantity}</td>
                <td className="px-4 py-2 text-right">${item.unitPrice.toFixed(2)}</td>
                <td className="px-4 py-2 text-right font-medium">${item.totalPrice.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t pt-4">
        <div className="space-y-2 text-right">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nëntotali:</span>
            <span className="font-medium">${(invoice.subtotal || 0).toFixed(2)}</span>
          </div>
          {invoice.tax && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taksa:</span>
              <span className="font-medium">${invoice.tax.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold">
            <span>Totali:</span>
            <span>${(invoice.total || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {invoice.notes && (
        <div>
          <h3 className="font-semibold mb-2">Shënime</h3>
          <p className="text-sm text-muted-foreground">{invoice.notes}</p>
        </div>
      )}

      <div className="space-y-3">
        {invoice.paymentUrl && (
          <Button asChild className="w-full" variant="outline">
            <a href={invoice.paymentUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Hap Linkun e Pagesës
            </a>
          </Button>
        )}
        
        {invoice.status === 'Pending' && (
          <Button 
            className="w-full bg-[#635BFF] hover:bg-[#5851ea] text-white"
            onClick={() => {
              const stripeKey = localStorage.getItem('stripe_publishable_key');
              if (!stripeKey) {
                alert('Stripe nuk është konfiguruar! Shkoni te Settings → Integrations.');
                return;
              }
              // Simulim i pagesës
              alert('Në prodhim, kjo do të hapte Stripe Checkout për pagesë.');
            }}
          >
            <svg viewBox="0 0 60 25" className="w-10 h-4 mr-2" fill="currentColor">
              <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.02 1.04-.06 1.48zm-3.67-3.14c0-1.25-.5-2.7-2.1-2.7-1.52 0-2.22 1.38-2.32 2.7h4.42z"/>
            </svg>
            Paguaj me Stripe
          </Button>
        )}

        {invoice.status === 'Paid' && (
          <div className="flex items-center justify-center gap-2 p-3 bg-success/10 border border-success/20 rounded-lg text-success">
            <Check className="w-5 h-5" />
            <span className="font-medium">Fatura është e paguar</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoicesView;
