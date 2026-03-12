import React, { useState } from 'react';
import { useClientPortal } from '../../hooks/useClientPortal';
import { useAuth } from '../../contexts/AuthContext';
import { useCollection, useMutation } from '../../hooks/useFirestore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Separator } from '../../components/ui/separator';
import { ClipboardList, Plus, Clock, CheckCircle2, XCircle, AlertTriangle, Eye } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import type { ClientRequest, Team } from '../../types';

const CATEGORIES = [
  { value: 'Design', label: 'Dizajn' },
  { value: 'Development', label: 'Zhvillim' },
  { value: 'Support', label: 'Suport Teknik' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Consulting', label: 'Konsulencë' },
  { value: 'Other', label: 'Tjetër' },
] as const;

const PRIORITIES = [
  { value: 'low', label: 'E Ulët', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Mesatare', color: 'bg-blue-100 text-blue-800' },
  { value: 'high', label: 'E Lartë', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgjente', color: 'bg-red-100 text-red-800' },
] as const;

const PortalRequestsView: React.FC = () => {
  const { user } = useAuth();
  const { customerId } = useClientPortal();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ClientRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('__all__');

  const { data: requests, loading } = useCollection<ClientRequest>('clientRequests', {
    where: [{ field: 'customerId', operator: '==', value: customerId || '' }],
    orderBy: { field: 'createdAt', direction: 'desc' },
  });

  const { data: teams } = useCollection<Team>('teams');

  const requestMutation = useMutation<ClientRequest>('clientRequests');

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'New': return <Clock className="h-4 w-4" />;
      case 'In Review': return <Eye className="h-4 w-4" />;
      case 'In Progress': return <AlertTriangle className="h-4 w-4" />;
      case 'Completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'Rejected': return <XCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const getPriorityInfo = (priority: string) => {
    return PRIORITIES.find(p => p.value === priority) || PRIORITIES[1];
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.label || category;
  };

  // Smart routing: map category to team by department
  const getTeamForCategory = (category: string): string | undefined => {
    if (!teams) return undefined;
    const deptMap: Record<string, string[]> = {
      'Design': ['design', 'dizajn', 'kreativ', 'creative'],
      'Development': ['development', 'zhvillim', 'dev', 'it', 'tech', 'teknologji'],
      'Support': ['support', 'suport', 'helpdesk', 'help desk'],
      'Marketing': ['marketing'],
      'Consulting': ['consulting', 'konsulencë', 'management', 'menaxhim'],
    };

    const keywords = deptMap[category] || [];
    const match = teams.find(team => {
      const dept = (team.department || '').toLowerCase();
      const name = (team.name || '').toLowerCase();
      return keywords.some(k => dept.includes(k) || name.includes(k));
    });
    return match?.id;
  };

  const handleCreateRequest = async (formData: FormData) => {
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const priority = formData.get('priority') as string;
    const attachmentUrl = formData.get('attachmentUrl') as string;

    if (!title || !description || !category || !priority || !user || !customerId) return;

    const assignedTeamId = getTeamForCategory(category);

    await requestMutation.create({
      customerId,
      clientUserId: user.uid,
      title,
      description,
      category: category as ClientRequest['category'],
      status: 'New',
      priority: priority as ClientRequest['priority'],
      assignedTeamId,
      attachmentUrl: attachmentUrl || undefined,
    });

    setIsCreateOpen(false);
    toast({
      title: 'Kërkesa u dërgua',
      description: 'Ekipi ynë do ta shqyrtojë kërkesën tuaj së shpejti.',
    });
  };

  const filteredRequests = React.useMemo(() => {
    if (!requests) return [];
    if (statusFilter === '__all__') return requests;
    return requests.filter(r => r.status === statusFilter);
  }, [requests, statusFilter]);

  const stats = React.useMemo(() => {
    if (!requests) return { total: 0, active: 0, completed: 0 };
    return {
      total: requests.length,
      active: requests.filter(r => r.status !== 'Completed' && r.status !== 'Rejected').length,
      completed: requests.filter(r => r.status === 'Completed').length,
    };
  }, [requests]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Duke ngarkuar kërkesat...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kërkesat</h1>
          <p className="text-muted-foreground mt-1">
            Dërgoni dhe ndiqni kërkesat tuaja
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Kërkesë e Re
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Kërkesë e Re</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateRequest(new FormData(e.currentTarget));
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="title">Titulli</Label>
                <Input id="title" name="title" required placeholder="Përshkruani shkurt kërkesën" />
              </div>
              <div>
                <Label htmlFor="category">Kategoria</Label>
                <Select name="category" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Zgjidhni kategorinë" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Prioriteti</Label>
                <Select name="priority" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Zgjidhni prioritetin" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Përshkrimi</Label>
                <Textarea
                  id="description"
                  name="description"
                  required
                  rows={4}
                  placeholder="Përshkruani në detaje kërkesën tuaj..."
                />
              </div>
              <div>
                <Label htmlFor="attachmentUrl">Bashkëngjitje (URL, opsionale)</Label>
                <Input id="attachmentUrl" name="attachmentUrl" placeholder="https://..." />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Anulo
                </Button>
                <Button type="submit">Dërgo Kërkesën</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClipboardList className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Totale</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Aktive</p>
              <p className="text-xl font-bold">{stats.active}</p>
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
              <p className="text-xl font-bold">{stats.completed}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['__all__', 'New', 'In Review', 'In Progress', 'Completed', 'Rejected'].map(status => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status === '__all__' ? 'Të gjitha' : getStatusLabel(status)}
          </Button>
        ))}
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nuk ka kërkesa</p>
            <p className="text-sm text-muted-foreground mt-1">
              Klikoni "Kërkesë e Re" për të dërguar kërkesën tuaj të parë.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map(request => {
            const priorityInfo = getPriorityInfo(request.priority);
            const teamName = teams?.find(t => t.id === request.assignedTeamId)?.name;
            return (
              <Card
                key={request.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedRequest(request)}
              >
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        {getStatusIcon(request.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{request.title}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {getCategoryLabel(request.category)}
                          </span>
                          {teamName && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">
                                Ekipi: {teamName}
                              </span>
                            </>
                          )}
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {request.createdAt instanceof Date
                              ? request.createdAt.toLocaleDateString('sq-AL')
                              : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={priorityInfo.color} variant="secondary">
                        {priorityInfo.label}
                      </Badge>
                      <Badge className={getStatusColor(request.status)} variant="secondary">
                        {getStatusLabel(request.status)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Request Detail Dialog */}
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
                <Badge className={getPriorityInfo(selectedRequest.priority).color} variant="secondary">
                  {getPriorityInfo(selectedRequest.priority).label}
                </Badge>
                <Badge variant="outline">
                  {getCategoryLabel(selectedRequest.category)}
                </Badge>
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
                    className="text-sm text-primary underline"
                  >
                    {selectedRequest.attachmentUrl}
                  </a>
                </div>
              )}

              {selectedRequest.adminNotes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Përgjigja e Ekipit</p>
                    <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-lg">
                      {selectedRequest.adminNotes}
                    </p>
                  </div>
                </>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Krijuar</p>
                  <p className="font-medium">
                    {selectedRequest.createdAt instanceof Date
                      ? selectedRequest.createdAt.toLocaleString('sq-AL')
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ekipi</p>
                  <p className="font-medium">
                    {teams?.find(t => t.id === selectedRequest.assignedTeamId)?.name || 'Pa caktuar'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PortalRequestsView;
