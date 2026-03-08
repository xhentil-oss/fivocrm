import React, { useState, useMemo } from 'react';
import { useCollection, useMutation } from '../hooks/useFirestore';
import { Building2, Plus, Mail, Phone, MapPin, Search, Filter, X, CheckCircle2, XCircle, AlertCircle, Star, Users } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import type { Customer } from '../types';

// Status options with Albanian labels
const STATUS_OPTIONS = [
  { value: 'Active', label: 'Aktiv', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  { value: 'Inactive', label: 'Joaktiv', color: 'bg-gray-100 text-gray-800', icon: XCircle },
  { value: 'VIP', label: 'VIP', color: 'bg-purple-100 text-purple-800', icon: Star },
  { value: 'Pending', label: 'Në Pritje', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  { value: 'Suspended', label: 'Pezulluar', color: 'bg-red-100 text-red-800', icon: XCircle },
];

// Industry options
const INDUSTRY_OPTIONS = [
  'Teknologji',
  'Shërbime Financiare',
  'Shëndetësi',
  'Arsim',
  'Prodhim',
  'Tregti me Pakicë',
  'Ndërtim',
  'Hoteleri',
  'Transport',
  'Tjetër',
];

const CustomersView: React.FC = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('__all__');
  const [industryFilter, setIndustryFilter] = useState<string>('__all__');
  const [creditLimitFilter, setCreditLimitFilter] = useState<string>('__all__');
  const [showFilters, setShowFilters] = useState(false);

  const { data: customers, loading: customersLoading } = useCollection<Customer>('customers', {
    orderBy: { field: 'createdAt', direction: 'desc' }
  });
  const customerMutation = useMutation<Customer>('customers');

  // Filter customers based on search and filters
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    
    return customers.filter((customer) => {
      // Search filter - searches across multiple fields
      const searchLower = searchQuery.toLowerCase().trim();
      if (searchLower) {
        const matchesSearch = 
          customer.name?.toLowerCase().includes(searchLower) ||
          customer.email?.toLowerCase().includes(searchLower) ||
          customer.phone?.toLowerCase().includes(searchLower) ||
          customer.company?.toLowerCase().includes(searchLower) ||
          customer.taxId?.toLowerCase().includes(searchLower) ||
          customer.contactPerson?.toLowerCase().includes(searchLower) ||
          customer.industry?.toLowerCase().includes(searchLower) ||
          customer.id?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (statusFilter !== '__all__') {
        const customerStatus = customer.status || 'Active';
        if (customerStatus !== statusFilter) return false;
      }
      
      // Industry filter
      if (industryFilter !== '__all__') {
        if (customer.industry !== industryFilter) return false;
      }
      
      // Credit limit filter
      if (creditLimitFilter !== '__all__') {
        const limit = customer.creditLimit || 0;
        switch (creditLimitFilter) {
          case 'none':
            if (limit > 0) return false;
            break;
          case 'low':
            if (limit <= 0 || limit > 10000) return false;
            break;
          case 'medium':
            if (limit <= 10000 || limit > 50000) return false;
            break;
          case 'high':
            if (limit <= 50000) return false;
            break;
        }
      }
      
      return true;
    });
  }, [customers, searchQuery, statusFilter, industryFilter, creditLimitFilter]);

  // Count customers by status
  const statusCounts = useMemo(() => {
    if (!customers) return {};
    return customers.reduce((acc, c) => {
      const status = c.status || 'Active';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [customers]);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('__all__');
    setIndustryFilter('__all__');
    setCreditLimitFilter('__all__');
  };

  const hasActiveFilters = searchQuery || statusFilter !== '__all__' || industryFilter !== '__all__' || creditLimitFilter !== '__all__';

  const handleCreateCustomer = async (formData: FormData) => {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const company = formData.get('company') as string;
    const address = formData.get('address') as string;
    const website = formData.get('website') as string;
    const industry = formData.get('industry') as string;
    const taxId = formData.get('taxId') as string;
    const billingAddress = formData.get('billingAddress') as string;
    const shippingAddress = formData.get('shippingAddress') as string;
    const contactPerson = formData.get('contactPerson') as string;
    const contactPhone = formData.get('contactPhone') as string;
    const notes = formData.get('notes') as string;
    const status = formData.get('status') as string;
    const creditLimit = formData.get('creditLimit') as string;
    const paymentTerms = formData.get('paymentTerms') as string;
    const tags = formData.get('tags') as string;

    await customerMutation.create({
      name,
      email: email || undefined,
      phone: phone || undefined,
      company: company || undefined,
      address: address || undefined,
      website: website || undefined,
      industry: industry || undefined,
      taxId: taxId || undefined,
      billingAddress: billingAddress || undefined,
      shippingAddress: shippingAddress || undefined,
      contactPerson: contactPerson || undefined,
      contactPhone: contactPhone || undefined,
      notes: notes || undefined,
      status: status || undefined,
      creditLimit: creditLimit ? parseFloat(creditLimit) : undefined,
      paymentTerms: paymentTerms || undefined,
      tags: tags || undefined,
    });

    setIsCreateDialogOpen(false);
  };

  const handleUpdateCustomer = async (formData: FormData) => {
    if (!selectedCustomer) return;

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const company = formData.get('company') as string;
    const address = formData.get('address') as string;
    const website = formData.get('website') as string;
    const industry = formData.get('industry') as string;
    const taxId = formData.get('taxId') as string;
    const billingAddress = formData.get('billingAddress') as string;
    const shippingAddress = formData.get('shippingAddress') as string;
    const contactPerson = formData.get('contactPerson') as string;
    const contactPhone = formData.get('contactPhone') as string;
    const notes = formData.get('notes') as string;
    const status = formData.get('status') as string;
    const creditLimit = formData.get('creditLimit') as string;
    const paymentTerms = formData.get('paymentTerms') as string;
    const tags = formData.get('tags') as string;

    await customerMutation.update(selectedCustomer.id, {
      name,
      email: email || undefined,
      phone: phone || undefined,
      company: company || undefined,
      address: address || undefined,
      website: website || undefined,
      industry: industry || undefined,
      taxId: taxId || undefined,
      billingAddress: billingAddress || undefined,
      shippingAddress: shippingAddress || undefined,
      contactPerson: contactPerson || undefined,
      contactPhone: contactPhone || undefined,
      notes: notes || undefined,
      status: status || undefined,
      creditLimit: creditLimit ? parseFloat(creditLimit) : undefined,
      paymentTerms: paymentTerms || undefined,
      tags: tags || undefined,
    });

    setIsEditDialogOpen(false);
    setSelectedCustomer(null);
  };

  if (customersLoading) {
    return <div className="flex items-center justify-center h-96">Duke ngarkuar klientët...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2 text-foreground">Klientët</h1>
          <p className="text-body text-muted-foreground mt-1">
            {filteredCustomers.length} nga {customers?.length || 0} klientë
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Klient i Ri
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Krijo Klient të Ri</DialogTitle>
            </DialogHeader>
            <CustomerForm onSubmit={handleCreateCustomer} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {STATUS_OPTIONS.map((status) => {
          const count = statusCounts[status.value] || 0;
          const Icon = status.icon;
          const isActive = statusFilter === status.value;
          return (
            <button
              key={status.value}
              onClick={() => setStatusFilter(isActive ? '__all__' : status.value)}
              className={`p-3 rounded-lg border transition-all ${
                isActive 
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-sm font-medium">{status.label}</span>
              </div>
              <p className="text-2xl font-bold mt-1">{count}</p>
            </button>
          );
        })}
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          {/* Search Bar */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Kërko sipas emrit, email, telefon, NIPT, kompani..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button
              variant={showFilters ? 'default' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              Filtrat
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {[statusFilter !== '__all__', industryFilter !== '__all__', creditLimitFilter !== '__all__'].filter(Boolean).length}
                </Badge>
              )}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="gap-2 text-muted-foreground">
                <X className="w-4 h-4" />
                Pastro
              </Button>
            )}
          </div>

          {/* Filter Dropdowns */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Statusi</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Të gjithë statuset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Të gjithë statuset</SelectItem>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        <div className="flex items-center gap-2">
                          <status.icon className="w-4 h-4" />
                          {status.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Industria</Label>
                <Select value={industryFilter} onValueChange={setIndustryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Të gjitha industritë" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Të gjitha industritë</SelectItem>
                    {INDUSTRY_OPTIONS.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Limiti i Kredisë</Label>
                <Select value={creditLimitFilter} onValueChange={setCreditLimitFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Të gjitha limitet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Të gjitha limitet</SelectItem>
                    <SelectItem value="none">Pa limit</SelectItem>
                    <SelectItem value="low">Deri 10,000 ALL</SelectItem>
                    <SelectItem value="medium">10,000 - 50,000 ALL</SelectItem>
                    <SelectItem value="high">Mbi 50,000 ALL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Results Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-4 text-left text-body-sm font-medium text-foreground">
                  Klienti
                </th>
                <th className="px-6 py-4 text-left text-body-sm font-medium text-foreground">
                  Kontakti
                </th>
                <th className="px-6 py-4 text-left text-body-sm font-medium text-foreground">
                  Info Kompanie
                </th>
                <th className="px-6 py-4 text-left text-body-sm font-medium text-foreground">
                  Statusi
                </th>
                <th className="px-6 py-4 text-left text-body-sm font-medium text-foreground">
                  Limiti Kredisë
                </th>
                <th className="px-6 py-4 text-left text-body-sm font-medium text-foreground">
                  Veprime
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">
                      {hasActiveFilters 
                        ? 'Nuk u gjet asnjë klient me këto filtra'
                        : 'Nuk ka klientë ende'}
                    </p>
                    {hasActiveFilters && (
                      <Button variant="link" onClick={clearFilters} className="mt-2">
                        Pastro filtrat
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const statusOption = STATUS_OPTIONS.find(s => s.value === (customer.status || 'Active'));
                  const StatusIcon = statusOption?.icon || CheckCircle2;
                  
                  return (
                    <tr
                      key={customer.id}
                      className="hover:bg-muted/50 transition-colors duration-fast"
                    >
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-body font-medium text-foreground">{customer.name}</p>
                          {customer.taxId && (
                            <p className="text-body-sm text-muted-foreground">
                              NIPT: {customer.taxId}
                            </p>
                          )}
                          {customer.contactPerson && (
                            <p className="text-body-sm text-muted-foreground">
                              Kontakt: {customer.contactPerson}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {customer.email && (
                            <div className="flex items-center gap-1 text-body-sm text-foreground">
                              <Mail className="w-3 h-3 text-muted-foreground" />
                              {customer.email}
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-1 text-body-sm text-foreground">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              {customer.phone}
                            </div>
                          )}
                          {customer.contactPhone && (
                            <div className="flex items-center gap-1 text-body-sm text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              {customer.contactPhone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {customer.company && (
                            <p className="text-body font-normal text-foreground">{customer.company}</p>
                          )}
                          {customer.industry && (
                            <Badge variant="outline" className="text-xs">
                              {customer.industry}
                            </Badge>
                          )}
                          {customer.website && (
                            <a 
                              href={customer.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-body-sm text-primary hover:underline block"
                            >
                              {customer.website}
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={`${statusOption?.color || 'bg-gray-100 text-gray-800'} gap-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusOption?.label || customer.status || 'Aktiv'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-body text-foreground">
                        {customer.creditLimit 
                          ? `${customer.creditLimit.toLocaleString()} ALL`
                          : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          Ndrysho
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedCustomer && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ndrysho Klientin</DialogTitle>
            </DialogHeader>
            <CustomerForm onSubmit={handleUpdateCustomer} initialData={selectedCustomer} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

const CustomerForm: React.FC<{
  onSubmit: (data: FormData) => void;
  initialData?: Customer;
}> = ({ onSubmit, initialData }) => {
  const [status, setStatus] = useState(initialData?.status || 'Active');
  const [industry, setIndustry] = useState(initialData?.industry || '');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('status', status);
    formData.set('industry', industry);
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Emri *</Label>
          <Input id="name" name="name" required defaultValue={initialData?.name} />
        </div>

        <div>
          <Label htmlFor="company">Kompania</Label>
          <Input id="company" name="company" defaultValue={initialData?.company} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={initialData?.email} />
        </div>

        <div>
          <Label htmlFor="phone">Telefon</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={initialData?.phone} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="contactPerson">Personi i Kontaktit</Label>
          <Input id="contactPerson" name="contactPerson" defaultValue={initialData?.contactPerson} />
        </div>

        <div>
          <Label htmlFor="contactPhone">Telefoni i Kontaktit</Label>
          <Input id="contactPhone" name="contactPhone" type="tel" defaultValue={initialData?.contactPhone} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="website">Website</Label>
          <Input id="website" name="website" type="url" defaultValue={initialData?.website} />
        </div>

        <div>
          <Label>Industria</Label>
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger>
              <SelectValue placeholder="Zgjidh industrinë" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Pa industri</SelectItem>
              {INDUSTRY_OPTIONS.map((ind) => (
                <SelectItem key={ind} value={ind}>
                  {ind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="taxId">NIPT</Label>
          <Input id="taxId" name="taxId" defaultValue={initialData?.taxId} placeholder="L12345678A" />
        </div>

        <div>
          <Label>Statusi</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    <opt.icon className="w-4 h-4" />
                    {opt.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="address">Adresa</Label>
        <Textarea id="address" name="address" rows={2} defaultValue={initialData?.address} />
      </div>

      <div>
        <Label htmlFor="billingAddress">Adresa e Faturimit</Label>
        <Textarea id="billingAddress" name="billingAddress" rows={2} defaultValue={initialData?.billingAddress} />
      </div>

      <div>
        <Label htmlFor="shippingAddress">Adresa e Dërgesës</Label>
        <Textarea id="shippingAddress" name="shippingAddress" rows={2} defaultValue={initialData?.shippingAddress} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="creditLimit">Limiti i Kredisë (ALL)</Label>
          <Input 
            id="creditLimit" 
            name="creditLimit" 
            type="number" 
            step="0.01"
            defaultValue={initialData?.creditLimit} 
          />
        </div>

        <div>
          <Label htmlFor="paymentTerms">Kushtet e Pagesës</Label>
          <Input id="paymentTerms" name="paymentTerms" defaultValue={initialData?.paymentTerms} placeholder="p.sh. 30 ditë" />
        </div>
      </div>

      <div>
        <Label htmlFor="tags">Etiketat (të ndara me presje)</Label>
        <Input id="tags" name="tags" defaultValue={initialData?.tags} placeholder="p.sh. VIP, Prioritet, Lokal" />
      </div>

      <div>
        <Label htmlFor="notes">Shënime</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={initialData?.notes} />
      </div>

      <Button type="submit" className="w-full">
        {initialData ? 'Përditëso Klientin' : 'Krijo Klientin'}
      </Button>
    </form>
  );
};

export default CustomersView;
