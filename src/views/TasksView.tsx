import React, { useState } from 'react';
import { useCollection, useMutation } from '../hooks/useFirestore';
import { useAuth } from '../contexts/AuthContext';
import { Calendar as CalendarIcon, User, Flag, MoreVertical, Plus, MessageSquare, CalendarDays, Filter, List, LayoutGrid, Users, ChevronRight, ChevronDown, Target, Clock, Play, Pause, Square, Check, X } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import type { Task, TaskComment, Project, Notification, TaskCollaborator, UserProfile, TimeEntry } from '../types';
import TaskDetailPanel from '../components/TaskDetailPanel';

const TasksView: React.FC = () => {
  const { user } = useAuth({ requireAuth: true });
  const [viewMode, setViewMode] = useState<'board' | 'calendar' | 'list'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Fetch data
  const { data: allTasks, isPending: tasksLoading } = useQuery('Task', {
    orderBy: { createdAt: 'desc' }
  });
  const { data: projects } = useQuery('Project');
  const { data: comments } = useQuery('TaskComment');
  const { data: collaborators } = useQuery('TaskCollaborator');
  const { data: userProfiles } = useQuery('UserProfile');
  
  // Get all active time entries to show who's working on what
  const { data: activeTimeEntries } = useQuery('TimeEntry', {
    where: { endTime: undefined }
  });

  // Get tasks that are currently being worked on
  const tasksBeingWorkedOn = React.useMemo(() => {
    if (!activeTimeEntries) return new Set<string>();
    return new Set(activeTimeEntries.map(entry => entry.taskId).filter(Boolean));
  }, [activeTimeEntries]);

  // Mutations
  const taskMutation = useMutation('Task');
  const commentMutation = useMutation('TaskComment');
  const notificationMutation = useMutation('Notification');
  const collaboratorMutation = useMutation('TaskCollaborator');

  // Lazy queries
  const { query: queryTasks } = useLazyQuery('Task');

  // Filter tasks - exclude subtasks from main list
  const tasks = React.useMemo(() => {
    if (!allTasks) return [];
    let filtered = allTasks.filter(t => !t.parentTaskId); // Only show parent tasks
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      );
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }
    
    return filtered;
  }, [allTasks, filterStatus, searchQuery]);

  const myTasks = React.useMemo(() => {
    if (!user || !allTasks) return [];
    return allTasks.filter(t => t.assignedToUserId === user.id && !t.parentTaskId);
  }, [allTasks, user]);

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-error text-error-foreground';
      case 'high':
        return 'bg-warning text-warning-foreground';
      case 'medium':
        return 'bg-info text-info-foreground';
      case 'low':
        return 'bg-success text-success-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Todo':
        return 'bg-gray-200 text-gray-700';
      case 'In Progress':
        return 'bg-tertiary text-tertiary-foreground';
      case 'Review':
        return 'bg-warning text-warning-foreground';
      case 'Done':
        return 'bg-success text-success-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleCreateTask = async (formData: FormData) => {
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const startDate = new Date(formData.get('startDate') as string);
    const endDate = new Date(formData.get('endDate') as string);
    // Default to current user if not specified
    const assignedToUserId = (formData.get('assignedToUserId') as string) || user?.id || '';
    const projectId = formData.get('projectId') as string;
    const priority = formData.get('priority') as string;
    const status = formData.get('status') as string;
    const parentTaskId = formData.get('parentTaskId') as string;
    const collaboratorIdsRaw = formData.get('collaboratorIds') as string;
    const isRecurringRaw = formData.get('isRecurring') as string;
    const recurringFrequency = formData.get('recurringFrequency') as string;

    const collaboratorIds = collaboratorIdsRaw ? JSON.parse(collaboratorIdsRaw) : [];
    const isRecurring = isRecurringRaw === 'true';

    let nextRecurringDate: Date | undefined;
    if (isRecurring && recurringFrequency) {
      const baseDate = new Date(endDate);
      if (recurringFrequency === 'weekly') {
        nextRecurringDate = new Date(baseDate.setDate(baseDate.getDate() + 7));
      } else if (recurringFrequency === 'monthly') {
        nextRecurringDate = new Date(baseDate.setMonth(baseDate.getMonth() + 1));
      } else if (recurringFrequency === 'yearly') {
        nextRecurringDate = new Date(baseDate.setFullYear(baseDate.getFullYear() + 1));
      }
    }

    const newTask = await taskMutation.create({
      title,
      description,
      startDate,
      endDate,
      assignedToUserId,
      projectId: projectId || undefined,
      status,
      priority,
      parentTaskId: parentTaskId || undefined,
      collaboratorIds: JSON.stringify(collaboratorIds),
      dueNotificationSent: false,
      isRecurring,
      recurringFrequency: isRecurring ? recurringFrequency : undefined,
      nextRecurringDate,
    });

    for (const collabId of collaboratorIds) {
      await collaboratorMutation.create({
        taskId: newTask.id,
        userId: collabId,
        role: 'collaborator',
      });
    }

    if (assignedToUserId && assignedToUserId !== user?.id) {
      await notificationMutation.create({
        userId: assignedToUserId,
        title: 'New Task Assigned',
        message: `You have been assigned to: ${title}`,
        isRead: false,
      });
    }

    for (const collabId of collaboratorIds) {
      if (collabId !== user?.id) {
        await notificationMutation.create({
          userId: collabId,
          title: 'Added as Collaborator',
          message: `You were added as a collaborator on: ${title}`,
          isRead: false,
        });
      }
    }

    setIsCreateDialogOpen(false);
    setSelectedTask(newTask);
    
    checkTaskDueDate(newTask);
  };

  const checkTaskDueDate = async (task: Task) => {
    const now = new Date();
    const dueDate = new Date(task.endDate);
    const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 2 && daysDiff >= 0 && !task.dueNotificationSent) {
      await notificationMutation.create({
        userId: task.assignedToUserId,
        title: 'Task Due Soon',
        message: `Task "${task.title}" is due in ${daysDiff} day(s)!`,
        isRead: false,
      });

      await taskMutation.update(task.id, { dueNotificationSent: true });
    }
  };

  React.useEffect(() => {
    if (tasks) {
      tasks.forEach(task => {
        if (!task.dueNotificationSent) {
          checkTaskDueDate(task);
        }
      });
    }
  }, [tasks]);

  const handleAddComment = async (taskId: string, content: string) => {
    await commentMutation.create({
      taskId,
      content,
    });

    const task = tasks.find(t => t.id === taskId);
    if (task && task.assignedToUserId !== user?.id) {
      await notificationMutation.create({
        userId: task.assignedToUserId,
        title: 'New Comment',
        message: `New comment on: ${task.title}`,
        isRead: false,
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      await taskMutation.update(taskId, { status: newStatus });
    }
  };

  const columns = [
    { id: 'Todo', title: 'To Do', status: 'Todo' },
    { id: 'In Progress', title: 'In Progress', status: 'In Progress' },
    { id: 'Review', title: 'Review', status: 'Review' },
    { id: 'Done', title: 'Done', status: 'Done' },
  ];

  // Format date compactly
  const formatDateCompact = (date: Date) => {
    const now = new Date();
    const taskDate = new Date(date);
    const diffDays = Math.ceil((taskDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)} ditë më parë`, className: 'text-error' };
    }
    if (diffDays === 0) {
      return { text: 'Sot', className: 'text-warning font-medium' };
    }
    if (diffDays === 1) {
      return { text: 'Nesër', className: 'text-warning' };
    }
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return { text: `${months[taskDate.getMonth()]} ${taskDate.getDate()}`, className: 'text-muted-foreground' };
  };

  if (tasksLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-32 skeleton rounded" />
            <div className="h-4 w-48 skeleton rounded" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-48 skeleton rounded" />
            <div className="h-10 w-32 skeleton rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((col) => (
            <div key={col} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-5 w-24 skeleton rounded" />
                <div className="h-5 w-8 skeleton rounded-full" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((card) => (
                  <div key={card} className="p-4 bg-card rounded-lg border space-y-3">
                    <div className="h-5 w-3/4 skeleton rounded" />
                    <div className="h-4 w-full skeleton rounded" />
                    <div className="flex gap-2">
                      <div className="h-5 w-16 skeleton rounded" />
                      <div className="h-5 w-20 skeleton rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex">
      {/* Left Side - Task List */}
      <div className={`${selectedTask ? 'w-1/2 border-r' : 'w-full'} flex flex-col transition-all duration-300`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Detyrat e Mia</h1>
            <p className="text-sm text-muted-foreground">
              {tasks.length} detyra · {myTasks.length} të caktuara për ty
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="list" className="text-xs px-2"><List className="w-3 h-3 mr-1" />List</TabsTrigger>
                <TabsTrigger value="board" className="text-xs px-2"><LayoutGrid className="w-3 h-3 mr-1" />Board</TabsTrigger>
                <TabsTrigger value="calendar" className="text-xs px-2"><CalendarDays className="w-3 h-3 mr-1" />Calendar</TabsTrigger>
              </TabsList>
            </Tabs>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-1" />
                  Detyrë e Re
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Krijo Detyrë të Re</DialogTitle>
                </DialogHeader>
                <TaskForm onSubmit={handleCreateTask} projects={projects || []} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="px-4 py-2 border-b bg-muted/30 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              placeholder="Kërko detyra..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <svg className="w-4 h-4 absolute left-2.5 top-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue placeholder="Filtro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Të gjitha</SelectItem>
              <SelectItem value="Todo">Për të bërë</SelectItem>
              <SelectItem value="In Progress">Në progres</SelectItem>
              <SelectItem value="Review">Rishikim</SelectItem>
              <SelectItem value="Done">Përfunduar</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Task List Content */}
        <div className="flex-1 overflow-y-auto">
          {viewMode === 'list' && (
            <div className="divide-y">
              {tasks.map((task) => {
                const dateInfo = formatDateCompact(new Date(task.endDate));
                const isSelected = selectedTask?.id === task.id;
                const isOverdue = new Date(task.endDate) < new Date() && task.status !== 'Done';
                
                return (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                      isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                    } ${isOverdue ? 'bg-error/5' : ''}`}
                    onClick={() => setSelectedTask(task)}
                  >
                    <Checkbox 
                      checked={task.status === 'Done'}
                      onCheckedChange={async (checked) => {
                        await taskMutation.update(task.id, { 
                          status: checked ? 'Done' : 'Todo' 
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={task.status === 'Done' ? 'bg-success border-success' : ''}
                    />
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm ${task.status === 'Done' ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </span>
                    </div>
                    {/* Assignee */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="w-3 h-3 text-primary" />
                      </div>
                      <span className="max-w-[80px] truncate">
                        {task.assignedToUserId 
                          ? task.assignedToUserId.includes('@') 
                            ? task.assignedToUserId.split('@')[0]
                            : task.assignedToUserId.slice(0, 8)
                          : 'Pa caktuar'}
                      </span>
                    </div>
                    <span className={`text-xs ${dateInfo.className}`}>
                      {dateInfo.text}
                    </span>
                  </div>
                );
              })}
              
              {tasks.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Asnjë detyrë</p>
                  <Button 
                    variant="link" 
                    className="mt-2"
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    Krijo detyrën e parë
                  </Button>
                </div>
              )}
            </div>
          )}

          {viewMode === 'board' && (
            <div className="grid grid-cols-4 gap-4 p-4 h-full">
              {columns.map((column) => {
                const columnTasks = tasks.filter(task => task.status === column.status);
                
                return (
                  <div 
                    key={column.id} 
                    className="flex flex-col"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, column.status)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-muted-foreground">{column.title}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {columnTasks.length}
                      </Badge>
                    </div>

                    <div className="space-y-2 flex-1 overflow-y-auto">
                      {columnTasks.map((task) => (
                        <Card
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          className={`p-3 cursor-pointer hover:shadow-md transition-shadow ${
                            selectedTask?.id === task.id ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => setSelectedTask(task)}
                        >
                          <p className="text-sm font-medium mb-2">{task.title}</p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{task.assignedToUserId?.slice(0, 6)}...</span>
                            <span>{formatDateCompact(new Date(task.endDate)).text}</span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === 'calendar' && (
            <CalendarView tasks={tasks} onTaskClick={setSelectedTask} />
          )}
        </div>
      </div>

      {/* Right Side - Task Detail Panel */}
      {selectedTask && (
        <div className="w-1/2 h-full">
          <TaskDetailPanel
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            comments={comments?.filter(c => c.taskId === selectedTask.id) || []}
            onAddComment={handleAddComment}
            onUpdate={taskMutation.update}
            onDelete={taskMutation.remove}
            projects={projects}
          />
        </div>
      )}
    </div>
  );
};

// Task Form Component
const TaskForm: React.FC<{
  onSubmit: (data: FormData) => void;
  projects: Project[];
  initialData?: Task;
}> = ({ onSubmit, projects, initialData }) => {
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialData?.startDate ? new Date(initialData.startDate) : new Date()
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    initialData?.endDate ? new Date(initialData.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );
  const [status, setStatus] = useState(initialData?.status || 'Todo');
  const [priority, setPriority] = useState(initialData?.priority || 'medium');
  const [projectId, setProjectId] = useState(initialData?.projectId || '__none__');
  const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring || false);
  const [recurringFrequency, setRecurringFrequency] = useState(initialData?.recurringFrequency || 'weekly');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (startDate) {
      formData.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      formData.set('endDate', endDate.toISOString());
    }
    
    formData.set('status', status);
    formData.set('priority', priority);
    
    if (projectId && projectId !== '__none__') {
      formData.set('projectId', projectId);
    }
    
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Titulli</Label>
        <Input id="title" name="title" required defaultValue={initialData?.title} placeholder="Emri i detyrës" />
      </div>

      <div>
        <Label htmlFor="description">Përshkrimi</Label>
        <Textarea id="description" name="description" defaultValue={initialData?.description} placeholder="Përshkruaj detyrën..." rows={3} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Data e Fillimit</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-sm" type="button">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? startDate.toLocaleDateString() : "Zgjidh"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar 
                mode="single" 
                selected={startDate} 
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label>Afati</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-sm" type="button">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? endDate.toLocaleDateString() : "Zgjidh"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar 
                mode="single" 
                selected={endDate} 
                onSelect={setEndDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="status">Statusi</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todo">Për të bërë</SelectItem>
              <SelectItem value="In Progress">Në progres</SelectItem>
              <SelectItem value="Review">Rishikim</SelectItem>
              <SelectItem value="Done">Përfunduar</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="priority">Prioriteti</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">I ulët</SelectItem>
              <SelectItem value="medium">Mesatar</SelectItem>
              <SelectItem value="high">I lartë</SelectItem>
              <SelectItem value="urgent">Urgjent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="assignedToUserId">Cakto te</Label>
        <Input 
          id="assignedToUserId" 
          name="assignedToUserId" 
          required 
          defaultValue={initialData?.assignedToUserId || (typeof window !== 'undefined' ? (window as any).__CURRENT_USER_ID__ : '')} 
          placeholder="User ID (lër bosh për veten)"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Lër bosh për ta caktuar vetes
        </p>
      </div>

      <div>
        <Label htmlFor="projectId">Projekti (Opsional)</Label>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger>
            <SelectValue placeholder="Zgjidh projektin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Asnjë</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center gap-2">
          <Checkbox 
            id="isRecurring" 
            checked={isRecurring}
            onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
          />
          <Label htmlFor="isRecurring" className="cursor-pointer text-sm">
            Detyrë e përsëritur
          </Label>
        </div>

        {isRecurring && (
          <div>
            <Label htmlFor="recurringFrequency">Frekuenca</Label>
            <Select value={recurringFrequency} onValueChange={setRecurringFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Çdo javë</SelectItem>
                <SelectItem value="monthly">Çdo muaj</SelectItem>
                <SelectItem value="yearly">Çdo vit</SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" name="isRecurring" value={isRecurring.toString()} />
            <input type="hidden" name="recurringFrequency" value={recurringFrequency} />
          </div>
        )}
      </div>

      <Button type="submit" className="w-full">
        {initialData ? 'Ruaj Ndryshimet' : 'Krijo Detyrën'}
      </Button>
    </form>
  );
};

// Calendar View Component
const CalendarView: React.FC<{
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}> = ({ tasks, onTaskClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();

  const firstDay = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="min-h-[80px] bg-muted/20" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dayTasks = tasks.filter(task => {
      const taskDate = new Date(task.endDate);
      return taskDate.toDateString() === date.toDateString();
    });

    days.push(
      <div key={day} className="min-h-[80px] border border-border p-1 bg-background">
        <div className="font-medium text-xs mb-1 text-muted-foreground">
          {day}
        </div>
        <div className="space-y-1">
          {dayTasks.slice(0, 2).map(task => (
            <div
              key={task.id}
              className="text-xs p-1 bg-primary/10 rounded cursor-pointer hover:bg-primary/20 truncate"
              onClick={() => onTaskClick(task)}
            >
              {task.title}
            </div>
          ))}
          {dayTasks.length > 2 && (
            <div className="text-xs text-muted-foreground">
              +{dayTasks.length - 2} më shumë
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
        >
          Para
        </Button>
        <h2 className="text-sm font-medium">
          {currentDate.toLocaleDateString('sq-AL', { month: 'long', year: 'numeric' })}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
        >
          Pas
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-px bg-border">
        {['Diel', 'Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht'].map(day => (
          <div key={day} className="bg-muted p-1 text-center text-xs font-medium">
            {day}
          </div>
        ))}
        {days}
      </div>
    </div>
  );
};

export default TasksView;
