import React, { useState } from 'react';
import { useQuery, useMutation, useAuth } from '@animaapp/playground-react-sdk';
import { Target, Plus, TrendingUp, AlertCircle, CheckCircle2, Calendar, Users, ChevronRight } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import type { Goal, Team, Milestone } from '@animaapp/playground-react-sdk';

const GoalsView: React.FC = () => {
  const { user } = useAuth({ requireAuth: true });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Fetch data
  const { data: allGoals, isPending: goalsLoading } = useQuery('Goal', {
    orderBy: { dueDate: 'asc' }
  });
  const { data: teams } = useQuery('Team');
  const { data: milestones } = useQuery('Milestone');

  // Mutations
  const goalMutation = useMutation('Goal');
  const milestoneMutation = useMutation('Milestone');

  // Filter goals
  const goals = React.useMemo(() => {
    if (!allGoals) return [];
    let filtered = allGoals;
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(g => g.status === filterStatus);
    }
    
    return filtered;
  }, [allGoals, filterStatus]);

  const myGoals = React.useMemo(() => {
    if (!user || !allGoals) return [];
    return allGoals.filter(g => g.ownerId === user.id);
  }, [allGoals, user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'On Track':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'At Risk':
        return <AlertCircle className="w-4 h-4 text-warning" />;
      case 'Off Track':
        return <AlertCircle className="w-4 h-4 text-error" />;
      case 'Achieved':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      default:
        return <Target className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'On Track':
        return 'bg-success text-success-foreground';
      case 'At Risk':
        return 'bg-warning text-warning-foreground';
      case 'Off Track':
        return 'bg-error text-error-foreground';
      case 'Achieved':
        return 'bg-success text-success-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleCreateGoal = async (formData: FormData) => {
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const status = formData.get('status') as string;
    const progress = parseInt(formData.get('progress') as string) || 0;
    const startDate = new Date(formData.get('startDate') as string);
    const dueDate = new Date(formData.get('dueDate') as string);
    const ownerId = formData.get('ownerId') as string;
    const teamId = formData.get('teamId') as string;
    const parentGoalId = formData.get('parentGoalId') as string;

    await goalMutation.create({
      title,
      description,
      status,
      progress,
      startDate,
      dueDate,
      ownerId,
      teamId: teamId || undefined,
      parentGoalId: parentGoalId || undefined,
    });

    setIsCreateDialogOpen(false);
  };

  if (goalsLoading) {
    return <div className="flex items-center justify-center h-96">Loading goals...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2 text-foreground">Goals</h1>
          <p className="text-body text-muted-foreground mt-1">
            {goals.length} total goals · {myGoals.length} owned by you
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Goals</SelectItem>
              <SelectItem value="On Track">On Track</SelectItem>
              <SelectItem value="At Risk">At Risk</SelectItem>
              <SelectItem value="Off Track">Off Track</SelectItem>
              <SelectItem value="Achieved">Achieved</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                New Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Goal</DialogTitle>
              </DialogHeader>
              <GoalForm onSubmit={handleCreateGoal} teams={teams || []} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {goals.map((goal) => {
          const goalMilestones = milestones?.filter(m => m.goalId === goal.id) || [];
          const completedMilestones = goalMilestones.filter(m => m.status === 'Completed').length;
          
          return (
            <Card
              key={goal.id}
              className="p-6 space-y-4 cursor-pointer transition-all duration-normal hover:shadow-lg"
              onClick={() => setSelectedGoal(goal)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getStatusIcon(goal.status)}
                  <div className="flex-1">
                    <h3 className="text-h4 text-foreground mb-1">{goal.title}</h3>
                    <p className="text-body-sm text-muted-foreground line-clamp-2">
                      {goal.description}
                    </p>
                  </div>
                </div>
                <Badge className={getStatusColor(goal.status)}>
                  {goal.status}
                </Badge>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{goal.progress || 0}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-normal"
                    style={{ width: `${goal.progress || 0}%` }}
                  />
                </div>
              </div>

              {/* Milestones */}
              {goalMilestones.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {completedMilestones} / {goalMilestones.length} milestones completed
                  </span>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-border text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Due {new Date(goal.dueDate).toLocaleDateString()}</span>
                </div>
                {goal.teamId && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>Team Goal</span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Goal Detail Dialog */}
      {selectedGoal && (
        <GoalDetailDialog
          goal={selectedGoal}
          open={!!selectedGoal}
          onOpenChange={(open) => !open && setSelectedGoal(null)}
          milestones={milestones?.filter(m => m.goalId === selectedGoal.id) || []}
          onUpdate={goalMutation.update}
          onDelete={goalMutation.remove}
        />
      )}
    </div>
  );
};

// Goal Form Component
const GoalForm: React.FC<{
  onSubmit: (data: FormData) => void;
  teams: Team[];
  initialData?: Goal;
}> = ({ onSubmit, teams, initialData }) => {
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialData?.startDate ? new Date(initialData.startDate) : undefined
  );
  const [dueDate, setDueDate] = useState<Date | undefined>(
    initialData?.dueDate ? new Date(initialData.dueDate) : undefined
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (startDate) formData.set('startDate', startDate.toISOString());
    if (dueDate) formData.set('dueDate', dueDate.toISOString());
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Goal Title</Label>
        <Input id="title" name="title" required defaultValue={initialData?.title} />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={initialData?.description} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="mr-2 h-4 w-4" />
                {startDate ? startDate.toLocaleDateString() : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent mode="single" selected={startDate} onSelect={setStartDate} />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label>Due Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="mr-2 h-4 w-4" />
                {dueDate ? dueDate.toLocaleDateString() : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent mode="single" selected={dueDate} onSelect={setDueDate} />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue={initialData?.status || 'On Track'}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="On Track">On Track</SelectItem>
              <SelectItem value="At Risk">At Risk</SelectItem>
              <SelectItem value="Off Track">Off Track</SelectItem>
              <SelectItem value="Achieved">Achieved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="progress">Progress (%)</Label>
          <Input 
            id="progress" 
            name="progress" 
            type="number" 
            min="0" 
            max="100" 
            defaultValue={initialData?.progress || 0} 
          />
        </div>
      </div>

      <div>
        <Label htmlFor="ownerId">Owner (User ID)</Label>
        <Input id="ownerId" name="ownerId" required defaultValue={initialData?.ownerId} />
      </div>

      <div>
        <Label htmlFor="teamId">Team (Optional)</Label>
        <Select name="teamId" defaultValue={initialData?.teamId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a team" />
          </SelectTrigger>
          <SelectContent>
            {teams.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="parentGoalId">Parent Goal (for nested goals)</Label>
        <Input 
          id="parentGoalId" 
          name="parentGoalId" 
          placeholder="Leave empty for top-level goal"
          defaultValue={initialData?.parentGoalId}
        />
      </div>

      <Button type="submit" className="w-full">
        {initialData ? 'Update Goal' : 'Create Goal'}
      </Button>
    </form>
  );
};

// Goal Detail Dialog
const GoalDetailDialog: React.FC<{
  goal: Goal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestones: Milestone[];
  onUpdate: (id: string, data: any) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
}> = ({ goal, open, onOpenChange, milestones, onUpdate, onDelete }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            {goal.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-2">Description</h4>
            <p className="text-muted-foreground">{goal.description}</p>
          </div>

          <div>
            <h4 className="font-medium mb-2">Progress</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current Progress</span>
                <span className="font-medium">{goal.progress || 0}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="bg-primary h-3 rounded-full transition-all duration-normal"
                  style={{ width: `${goal.progress || 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Start Date</h4>
              <p>{new Date(goal.startDate).toLocaleDateString()}</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Due Date</h4>
              <p>{new Date(goal.dueDate).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Status</h4>
              <Badge className={
                goal.status === 'On Track' ? 'bg-success text-success-foreground' :
                goal.status === 'At Risk' ? 'bg-warning text-warning-foreground' :
                goal.status === 'Off Track' ? 'bg-error text-error-foreground' :
                goal.status === 'Achieved' ? 'bg-success text-success-foreground' :
                'bg-muted text-muted-foreground'
              }>
                {goal.status}
              </Badge>
            </div>
            <div>
              <h4 className="font-medium mb-2">Owner</h4>
              <p className="text-sm">{goal.ownerId}</p>
            </div>
          </div>

          {milestones.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-4">Milestones ({milestones.length})</h4>
              <div className="space-y-3">
                {milestones.map(milestone => (
                  <div key={milestone.id} className="flex items-center gap-3 p-3 bg-muted rounded">
                    <CheckCircle2 className={`w-5 h-5 ${
                      milestone.status === 'Completed' ? 'text-success' : 'text-muted-foreground'
                    }`} />
                    <div className="flex-1">
                      <p className="font-medium">{milestone.title}</p>
                      <p className="text-sm text-muted-foreground">{milestone.description}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{milestone.status}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(milestone.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button variant="destructive" onClick={() => {
              onDelete(goal.id);
              onOpenChange(false);
            }}>
              Delete Goal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoalsView;
