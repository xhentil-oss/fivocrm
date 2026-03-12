import React, { useState } from 'react';
import { useCollection, useMutation } from '../hooks/useFirestore';
import { usePermissions } from '../hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';
import {
  Users2,
  ShieldCheck,
  ClipboardList,
  Search,
  Plus,
  Eye,
  UserPlus,
  Ban,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import type { ClientPortalAccess, ClientRequest, Customer, Team } from '../types';

const ClientPortalManagementView: React.FC = () => {
  const permissions = usePermissions();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('access');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ClientRequest | null>(null);
  const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false);
  const [requestStatusFilter, setRequestStatusFilter] = useState<string>('__all__');

  const { data: portalAccess, loading: accessLoading } = useCollection<ClientPortalAccess>('clientPortalAccess');
  const { data: customers } = useCollection<Customer>('customers');
  const { data: requests, loading: requestsLoading } = useCollection<ClientRequest>('clientRequests', {
    orderBy: { field: 'createdAt', direction: 'desc' },
  });
  const { data: teams } = useCollection<Team>('teams');

  const accessMutation = useMutation<ClientPortalAccess>('clientPortalAccess');
  const requestMutation = useMutation<ClientRequest>('clientRequests');

  // Customers that don't already have portal access
  const customersWithoutAccess = React.useMemo(() => {
    if (!customers || !portalAccess) return [];
    const accessedCustomerIds = new Set(portalAccess.map(a => a.customerId));
    return customers.filter(c => !accessedCustomerIds.has(c.id) && c.email);
  }, [customers, portalAccess]);

  const filteredAccess = React.useMemo(() => {
    if (!portalAccess) return [];
    if (!searchQuery) return portalAccess;
    const q = searchQuery.toLowerCase();
    return portalAccess.filter(a => {
      const customer = customers?.find(c => c.id === a.customerId);
      return (
        a.email.toLowerCase().includes(q) ||
        customer?.name?.toLowerCase().includes(q) ||
        customer?.company?.toLowerCase().includes(q)
      );
    });
  }, [portalAccess, searchQuery, customers]);

  const filteredRequests = React.useMemo(() => {
    if (!requests) return [];
    if (requestStatusFilter === '__all__') return requests;
    return requests.filter(r => r.status === requestStatusFilter);
  }, [requests, requestStatusFilter]);

  const getCustomerName = (customerId: string) => {
    return customers?.find(c => c.id === customerId)?.name || 'Pa emër';
  };

  const handleGrantAccess = async (customerId: string) => {
    const customer = customers?.find(c => c.id === customerId);
    if (!customer?.email) return;

    await accessMutation.create({
      customerId,
      userId: '',
      email: customer.email,
      status: 'Active',
    });

    setIsGrantDialogOpen(false);
    toast({
      title: 'Akses i dhënë',
      description: `${customer.name} tani ka akses në portalin e klientëve.`,
    });
  };

  const handleToggleAccess = async (access: ClientPortalAccess) => {
    const newStatus = access.status === 'Active' ? 'Suspended' : 'Active';
    await accessMutation.update(access.id, { status: newStatus });
    toast({
      title: newStatus === 'Active' ? 'Aksesi u aktivizua' : 'Aksesi u pezullua',
      description: `Aksesi për ${access.email} u ${newStatus === 'Active' ? 'aktivizua' : 'pezullua'}.`,
    });
  };

  const handleUpdateRequestStatus = async (requestId: string, newStatus: string, adminNotes?: string) => {
    const update: Record<string, any> = { status: newStatus };
    if (adminNotes !== undefined) update.adminNotes = adminNotes;
    await requestMutation.update(requestId, update);
    setSelectedRequest(null);
    toast({ title: 'Statusi u përditësua' });
  };

  const handleAssignTeam = async (requestId: string, teamId: string) => {
    await requestMutation.update(requestId, { assignedTeamId: teamId });
    toast({ title: 'Ekipi u caktua' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-800';
      case 'In Review': return 'bg-purple-100 text-purple-800';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'New': return 'E Re';
      case 'In Review': return 'Në Shqyrtim';
      case 'In Progress': return 'Në Progres';
      case 'Completed': return 'Përfunduar';
      case 'Rejected': return 'Refuzuar';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'low': return 'E Ulët';
      case 'medium': return 'Mesatare';
      case 'high': return 'E Lartë';
      case 'urgent': return 'Urgjente';
      default: return priority;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Portali i Klientëve</h1>
        <p className="text-muted-foreground mt-1">
          Menaxhoni aksesin e klientëve dhe kërkesat e tyre
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Klientë Aktiv</p>
              <p className="text-xl font-bold">
                {portalAccess?.filter(a => a.status === 'Active').length || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClipboardList className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Kërkesa të Reja</p>
              <p className="text-xl font-bold">
                {requests?.filter(r => r.status === 'New').length || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Në Progres</p>
              <p className="text-xl font-bold">
                {requests?.filter(r => r.status === 'In Progress' || r.status === 'In Review').length || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Përfunduara</p>
              <p className="text-xl font-bold">
                {requests?.filter(r => r.status === 'Completed').length || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="access" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Aksesi i Portalit
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Kërkesat
            {requests && requests.filter(r => r.status === 'New').length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                {requests.filter(r => r.status === 'New').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Portal Access Tab */}
        <TabsContent value="access" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Kërko klient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {permissions.canEdit && (
              <Dialog open={isGrantDialogOpen} onOpenChange={setIsGrantDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Jep Akses
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Jep Akses në Portal</DialogTitle>
                  </DialogHeader>
                  {customersWithoutAccess.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Të gjithë klientët me email kanë akses tashmë, ose nuk ka klientë.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {customersWithoutAccess.map(customer => (
                        <div
                          key={customer.id}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent"
                        >
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-sm text-muted-foreground">{customer.email}</p>
                          </div>
                          <Button size="sm" onClick={() => handleGrantAccess(customer.id)}>
                            Jep Akses
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            )}
          </div>

          {filteredAccess.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nuk ka akses të klientëve akoma</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredAccess.map(access => {
                const customer = customers?.find(c => c.id === access.customerId);
                return (
                  <Card key={access.id}>
                    <CardContent className="py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded-full">
                            <Users2 className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-semibold">{customer?.name || 'Pa emër'}</p>
                            <p className="text-sm text-muted-foreground">{access.email}</p>
                            {customer?.company && (
                              <p className="text-xs text-muted-foreground">{customer.company}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={access.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                          >
                            {access.status === 'Active' ? 'Aktiv' : 'Pezulluar'}
                          </Badge>
                          {access.userId && (
                            <Badge variant="outline" className="text-xs">
                              I lidhur
                            </Badge>
                          )}
                          {permissions.canEdit && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleAccess(access)}
                            >
                              {access.status === 'Active' ? (
                                <><Ban className="h-3.5 w-3.5 mr-1" /> Pezullo</>
                              ) : (
                                <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aktivizo</>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {['__all__', 'New', 'In Review', 'In Progress', 'Completed', 'Rejected'].map(status => (
              <Button
                key={status}
                variant={requestStatusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRequestStatusFilter(status)}
              >
                {status === '__all__' ? 'Të gjitha' : getStatusLabel(status)}
                {status !== '__all__' && requests && (
                  <span className="ml-1 text-xs">
                    ({requests.filter(r => r.status === status).length})
                  </span>
                )}
              </Button>
            ))}
          </div>

          {filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nuk ka kërkesa</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map(request => (
                <Card
                  key={request.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedRequest(request)}
                >
                  <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold truncate">{request.title}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{getCustomerName(request.customerId)}</span>
                          <span>•</span>
                          <span>{request.category}</span>
                          <span>•</span>
                          <span>
                            {request.createdAt instanceof Date
                              ? request.createdAt.toLocaleDateString('sq-AL')
                              : ''}
                          </span>
                          {request.assignedTeamId && (
                            <>
                              <span>•</span>
                              <span>Ekipi: {teams?.find(t => t.id === request.assignedTeamId)?.name || '-'}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(request.priority)} variant="secondary">
                          {getPriorityLabel(request.priority)}
                        </Badge>
                        <Badge className={getStatusColor(request.status)} variant="secondary">
                          {getStatusLabel(request.status)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Request Detail / Management Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedRequest?.title}</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge className={getStatusColor(selectedRequest.status)} variant="secondary">
                  {getStatusLabel(selectedRequest.status)}
                </Badge>
                <Badge className={getPriorityColor(selectedRequest.priority)} variant="secondary">
                  {getPriorityLabel(selectedRequest.priority)}
                </Badge>
                <Badge variant="outline">{selectedRequest.category}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Klienti</p>
                  <p className="font-medium">{getCustomerName(selectedRequest.customerId)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data</p>
                  <p className="font-medium">
                    {selectedRequest.createdAt instanceof Date
                      ? selectedRequest.createdAt.toLocaleString('sq-AL')
                      : '-'}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Përshkrimi</p>
                <p className="text-sm whitespace-pre-wrap">{selectedRequest.description}</p>
              </div>

              {selectedRequest.attachmentUrl && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Bashkëngjitje</p>
                  <a
                    href={selectedRequest.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Hap bashkëngjitjen
                  </a>
                </div>
              )}

              {permissions.canEdit && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div>
                      <Label>Ndrysho Statusin</Label>
                      <Select
                        value={selectedRequest.status}
                        onValueChange={(val) => handleUpdateRequestStatus(selectedRequest.id, val)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="New">E Re</SelectItem>
                          <SelectItem value="In Review">Në Shqyrtim</SelectItem>
                          <SelectItem value="In Progress">Në Progres</SelectItem>
                          <SelectItem value="Completed">Përfunduar</SelectItem>
                          <SelectItem value="Rejected">Refuzuar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Cakto Ekipin</Label>
                      <Select
                        value={selectedRequest.assignedTeamId || ''}
                        onValueChange={(val) => handleAssignTeam(selectedRequest.id, val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Zgjidhni ekipin" />
                        </SelectTrigger>
                        <SelectContent>
                          {teams?.map(team => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name} {team.department ? `(${team.department})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Shënim Administrativ</Label>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          handleUpdateRequestStatus(
                            selectedRequest.id,
                            selectedRequest.status,
                            fd.get('adminNotes') as string
                          );
                        }}
                        className="flex gap-2"
                      >
                        <Textarea
                          name="adminNotes"
                          defaultValue={selectedRequest.adminNotes || ''}
                          placeholder="Shkruani përgjigjen ose shënimin..."
                          rows={3}
                        />
                        <Button type="submit" size="sm" className="self-end">
                          Ruaj
                        </Button>
                      </form>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientPortalManagementView;
