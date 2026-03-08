import React, { useState } from 'react';
import { useCollection, useMutation } from '../hooks/useFirestore';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Phone, Building, DollarSign, TrendingUp, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import DetailDrawer from '../components/DetailDrawer';
import type { Lead } from '../types';

const CRMView: React.FC = () => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const { user } = useAuth({ requireAuth: true });
  const { data: leads, isPending: leadsLoading } = useQuery('Lead', {
    orderBy: { createdAt: 'desc' }
  });
  const leadMutation = useMutation('Lead');
  const customerMutation = useMutation('Customer');
  const notificationMutation = useMutation('Notification');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New':
        return 'bg-info text-info-foreground';
      case 'Contacted':
        return 'bg-tertiary text-tertiary-foreground';
      case 'Qualified':
        return 'bg-success text-success-foreground';
      case 'Follow-up':
        return 'bg-warning text-warning-foreground';
      case 'Converted':
        return 'bg-accent text-accent-foreground';
      case 'Lost':
        return 'bg-error text-error-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleCreateLead = async (formData: FormData) => {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const status = formData.get('status') as string;
    const lastFollowUpDate = formData.get('lastFollowUpDate') as string;
    const phoneNumber = formData.get('phoneNumber') as string;
    const address = formData.get('address') as string;
    const company = formData.get('company') as string;
    const jobTitle = formData.get('jobTitle') as string;
    const website = formData.get('website') as string;
    const source = formData.get('source') as string;
    const notes = formData.get('notes') as string;
    const estimatedValue = formData.get('estimatedValue') as string;

    await leadMutation.create({
      name,
      email: email || undefined,
      status,
      lastFollowUpDate: lastFollowUpDate ? new Date(lastFollowUpDate) : undefined,
      phoneNumber: phoneNumber || undefined,
      address: address || undefined,
      company: company || undefined,
      jobTitle: jobTitle || undefined,
      website: website || undefined,
      source: source || undefined,
      notes: notes || undefined,
      estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
    });

    setIsCreateDialogOpen(false);
  };

  const handleFollowUp = async (leadId: string) => {
    await leadMutation.update(leadId, {
      lastFollowUpDate: new Date(),
      status: 'Follow-up',
    });
  };

  const handleStatusChange = async (lead: Lead, newStatus: string) => {
    // Update lead status
    await leadMutation.update(lead.id, { status: newStatus });

    // If status is "Converted", create a customer
    if (newStatus === 'Converted') {
      await customerMutation.create({
        name: lead.name,
        email: lead.email,
        phone: lead.phoneNumber,
        address: lead.address,
        company: lead.company,
        website: lead.website,
        notes: lead.notes,
        status: 'Active',
      });

      // Send notification
      if (user) {
        await notificationMutation.create({
          userId: user.id,
          title: 'Lead Converted to Customer',
          message: `${lead.name} has been converted to a customer!`,
          isRead: false,
        });
      }
    }
  };

  const filteredLeads = React.useMemo(() => {
    if (!leads) return [];
    if (activeTab === 'all') return leads;
    return leads.filter(lead => lead.status === activeTab);
  }, [leads, activeTab]);

  const needsFollowUp = React.useMemo(() => {
    if (!leads) return [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return leads.filter(lead => {
      if (!lead.lastFollowUpDate) return true;
      return new Date(lead.lastFollowUpDate) < thirtyDaysAgo;
    });
  }, [leads]);

  if (leadsLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-40 skeleton rounded" />
            <div className="h-4 w-56 skeleton rounded" />
          </div>
          <div className="h-10 w-28 skeleton rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-6 bg-card rounded-lg border space-y-3">
              <div className="flex justify-between">
                <div className="h-4 w-24 skeleton rounded" />
                <div className="h-5 w-5 skeleton rounded" />
              </div>
              <div className="h-8 w-16 skeleton rounded" />
            </div>
          ))}
        </div>
        <div className="h-10 w-full skeleton rounded" />
        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="h-12 w-full skeleton" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 w-full skeleton border-t" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2 text-foreground">CRM - Leads</h1>
          <p className="text-body text-muted-foreground mt-1">
            {leads?.length || 0} total leads · {needsFollowUp.length} need follow-up
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              New Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Lead</DialogTitle>
            </DialogHeader>
            <LeadForm onSubmit={handleCreateLead} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 stagger-children">
        <Card className="p-6 space-y-2 card-hover metric-card-primary border-l-4 border-l-primary">
          <div className="flex items-center justify-between">
            <p className="text-body-sm text-muted-foreground">Total Leads</p>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="text-h2 text-foreground font-medium animate-count-up">
            {leads?.length || 0}
          </p>
          <p className="text-xs text-muted-foreground">Të gjitha lead-et</p>
        </Card>

        <Card className="p-6 space-y-2 card-hover metric-card-success border-l-4 border-l-success">
          <div className="flex items-center justify-between">
            <p className="text-body-sm text-muted-foreground">Qualified</p>
            <div className="p-2 bg-success/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
          </div>
          <p className="text-h2 text-foreground font-medium animate-count-up">
            {leads?.filter(l => l.status === 'Qualified').length || 0}
          </p>
          <p className="text-xs text-success">Të kualifikuara</p>
        </Card>

        <Card className="p-6 space-y-2 card-hover metric-card-info border-l-4 border-l-accent">
          <div className="flex items-center justify-between">
            <p className="text-body-sm text-muted-foreground">Converted</p>
            <div className="p-2 bg-accent/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-accent" />
            </div>
          </div>
          <p className="text-h2 text-foreground font-medium animate-count-up">
            {leads?.filter(l => l.status === 'Converted').length || 0}
          </p>
          <p className="text-xs text-accent">Të konvertuara</p>
        </Card>

        <Card className="p-6 space-y-2 card-hover metric-card-warning border-l-4 border-l-warning">
          <div className="flex items-center justify-between">
            <p className="text-body-sm text-muted-foreground">Need Follow-up</p>
            <div className="p-2 bg-warning/10 rounded-lg">
              <CalendarIcon className="w-5 h-5 text-warning" />
            </div>
          </div>
          <p className="text-h2 text-foreground font-medium animate-count-up">
            {needsFollowUp.length}
          </p>
          <p className="text-xs text-warning">Kërkojnë ndjekje</p>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Leads</TabsTrigger>
          <TabsTrigger value="New">New</TabsTrigger>
          <TabsTrigger value="Contacted">Contacted</TabsTrigger>
          <TabsTrigger value="Qualified">Qualified</TabsTrigger>
          <TabsTrigger value="Follow-up">Follow-up</TabsTrigger>
          <TabsTrigger value="Converted">Converted</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-4 text-left text-body-sm font-medium text-foreground">
                      Contact
                    </th>
                    <th className="px-6 py-4 text-left text-body-sm font-medium text-foreground">
                      Company
                    </th>
                    <th className="px-6 py-4 text-left text-body-sm font-medium text-foreground">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-body-sm font-medium text-foreground">
                      Source
                    </th>
                    <th className="px-6 py-4 text-left text-body-sm font-medium text-foreground">
                      Est. Value
                    </th>
                    <th className="px-6 py-4 text-left text-body-sm font-medium text-foreground">
                      Last Follow-up
                    </th>
                    <th className="px-6 py-4 text-left text-body-sm font-medium text-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="hover:bg-muted/50 cursor-pointer transition-colors duration-fast"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-body font-normal text-foreground">{lead.name}</p>
                          {lead.jobTitle && (
                            <p className="text-body-sm text-muted-foreground">{lead.jobTitle}</p>
                          )}
                          {lead.email && (
                            <div className="flex items-center gap-1 text-body-sm text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              {lead.email}
                            </div>
                          )}
                          {lead.phoneNumber && (
                            <div className="flex items-center gap-1 text-body-sm text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              {lead.phoneNumber}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {lead.company && (
                            <p className="text-body font-normal text-foreground">{lead.company}</p>
                          )}
                          {lead.website && (
                            <a 
                              href={lead.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-body-sm text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {lead.website}
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Select
                          value={lead.status}
                          onValueChange={(newStatus) => {
                            handleStatusChange(lead, newStatus);
                          }}
                        >
                          <SelectTrigger className="w-[140px]" onClick={(e) => e.stopPropagation()}>
                            <SelectValue>
                              <Badge className={getStatusColor(lead.status)}>
                                {lead.status}
                              </Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="New">New</SelectItem>
                            <SelectItem value="Contacted">Contacted</SelectItem>
                            <SelectItem value="Qualified">Qualified</SelectItem>
                            <SelectItem value="Follow-up">Follow-up</SelectItem>
                            <SelectItem value="Converted">Converted</SelectItem>
                            <SelectItem value="Lost">Lost</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-6 py-4 text-body text-foreground">
                        {lead.source || '-'}
                      </td>
                      <td className="px-6 py-4 text-body text-foreground">
                        {lead.estimatedValue 
                          ? `$${lead.estimatedValue.toLocaleString()}`
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-body text-foreground">
                        {lead.lastFollowUpDate 
                          ? new Date(lead.lastFollowUpDate).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFollowUp(lead.id);
                            }}
                          >
                            Follow Up
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLead(lead);
                            }}
                          >
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <DetailDrawer
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        title={selectedLead?.name || ''}
        data={selectedLead}
      />
    </div>
  );
};

const LeadForm: React.FC<{
  onSubmit: (data: FormData) => void;
  initialData?: Lead;
}> = ({ onSubmit, initialData }) => {
  const [lastFollowUpDate, setLastFollowUpDate] = useState<Date | undefined>(
    initialData?.lastFollowUpDate ? new Date(initialData.lastFollowUpDate) : undefined
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (lastFollowUpDate) {
      formData.set('lastFollowUpDate', lastFollowUpDate.toISOString());
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input id="name" name="name" required defaultValue={initialData?.name} />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={initialData?.email} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phoneNumber">Phone Number</Label>
          <Input id="phoneNumber" name="phoneNumber" type="tel" defaultValue={initialData?.phoneNumber} />
        </div>

        <div>
          <Label htmlFor="company">Company</Label>
          <Input id="company" name="company" defaultValue={initialData?.company} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="jobTitle">Job Title</Label>
          <Input id="jobTitle" name="jobTitle" defaultValue={initialData?.jobTitle} />
        </div>

        <div>
          <Label htmlFor="website">Website</Label>
          <Input id="website" name="website" type="url" defaultValue={initialData?.website} />
        </div>
      </div>

      <div>
        <Label htmlFor="address">Address</Label>
        <Textarea id="address" name="address" rows={2} defaultValue={initialData?.address} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="status">Status *</Label>
          <Select name="status" defaultValue={initialData?.status || 'New'}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Contacted">Contacted</SelectItem>
              <SelectItem value="Qualified">Qualified</SelectItem>
              <SelectItem value="Follow-up">Follow-up</SelectItem>
              <SelectItem value="Converted">Converted</SelectItem>
              <SelectItem value="Lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="source">Source</Label>
          <Select name="source" defaultValue={initialData?.source}>
            <SelectTrigger>
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Website">Website</SelectItem>
              <SelectItem value="Referral">Referral</SelectItem>
              <SelectItem value="Cold Call">Cold Call</SelectItem>
              <SelectItem value="Social Media">Social Media</SelectItem>
              <SelectItem value="Email Campaign">Email Campaign</SelectItem>
              <SelectItem value="Event">Event</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="estimatedValue">Estimated Value ($)</Label>
          <Input 
            id="estimatedValue" 
            name="estimatedValue" 
            type="number" 
            step="0.01"
            defaultValue={initialData?.estimatedValue} 
          />
        </div>

        <div>
          <Label>Last Follow-up Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {lastFollowUpDate ? lastFollowUpDate.toLocaleDateString() : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={lastFollowUpDate} onSelect={setLastFollowUpDate} />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={initialData?.notes} />
      </div>

      <Button type="submit" className="w-full">
        {initialData ? 'Update Lead' : 'Create Lead'}
      </Button>
    </form>
  );
};

export default CRMView;
