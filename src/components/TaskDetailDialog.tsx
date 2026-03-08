import React, { useState, useRef, useEffect } from 'react';
import { useCollection, useMutation } from '../hooks/useFirestore';
import { useAuth } from '../contexts/AuthContext';
import { Calendar as CalendarIcon, MessageSquare, Users, ChevronRight, ChevronDown, Clock, Play, Pause, Square, Paperclip, Upload, X, Activity, AtSign, Eye, Plus, Trash2, Edit2, Send, Hash } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';
import type { Task, TaskComment } from '../types';

interface TaskDetailDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comments: TaskComment[];
  onAddComment: (taskId: string, content: string) => void;
  onUpdate: (id: string, data: any) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
  projects?: { id: string; name: string }[];
}

const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({ 
  task, 
  open, 
  onOpenChange, 
  comments, 
  onAddComment, 
  onUpdate, 
  onDelete,
  projects = []
}) => {
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionText, setDescriptionText] = useState(task.description || '');
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [chatMessageText, setChatMessageText] = useState('');
  const [showChat, setShowChat] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Subtask form state
  const [subtaskForm, setSubtaskForm] = useState({
    title: '',
    description: '',
    status: 'Todo',
    priority: 'medium',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    assignedToUserId: '',
  });
  
  // Date editing state
  const [startDate, setStartDate] = useState<Date>(new Date(task.startDate));
  const [endDate, setEndDate] = useState<Date>(new Date(task.endDate));
  
  // Time tracking state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { data: subtasks } = useCollection<Task>('tasks', {
    where: [{ field: 'parentTaskId', operator: '==', value: task.id }]
  });
  
  const { data: taskCollaborators } = useCollection<any>('taskCollaborators', {
    where: [{ field: 'taskId', operator: '==', value: task.id }]
  });

  const { data: timeEntries } = useCollection<any>('timeEntries', {
    where: [{ field: 'taskId', operator: '==', value: task.id }],
    orderBy: { field: 'startTime', direction: 'desc' }
  });

  // Fetch chat messages for this task
  const { data: taskMessages, loading: isLoadingMessages } = useCollection<any>('messages', {
    where: [{ field: 'taskId', operator: '==', value: task.id }],
    orderBy: { field: 'createdAt', direction: 'asc' }
  });

  // Get all active time entries to show who's working on what
  const { data: allActiveTimeEntries } = useCollection<any>('timeEntries', {
    where: [{ field: 'endTime', operator: '==', value: null }]
  });

  // Get team members for @mentions
  const { data: teamMembers } = useCollection<any>('teamMembers', {
    where: [{ field: 'status', operator: '==', value: 'Active' }]
  });

  const taskMutation = useMutation<Task>('tasks');
  const timeEntryMutation = useMutation<any>('timeEntries');
  const notificationMutation = useMutation<any>('notifications');
  const messageMutation = useMutation<any>('messages');

  // Parse attachments from JSON
  const attachments = React.useMemo(() => {
    if (!task.attachments) return [];
    try {
      return JSON.parse(task.attachments);
    } catch {
      return [];
    }
  }, [task.attachments]);

  // Users currently working on this task
  const activeWorkers = React.useMemo(() => {
    if (!allActiveTimeEntries) return [];
    return allActiveTimeEntries.filter(entry => entry.taskId === task.id && entry.userId !== user?.id);
  }, [allActiveTimeEntries, task.id, user?.id]);

  // Filter team members for @mention suggestions
  const mentionSuggestions = React.useMemo(() => {
    if (!teamMembers || !mentionQuery) return [];
    return teamMembers.filter(m => 
      m.userId.toLowerCase().includes(mentionQuery.toLowerCase())
    ).slice(0, 5);
  }, [teamMembers, mentionQuery]);

  // Find running entry for this task
  const runningEntry = React.useMemo(() => {
    if (!timeEntries || !user) return null;
    return timeEntries.find(entry => !entry.endTime && entry.userId === user.id);
  }, [timeEntries, user]);

  // Update elapsed time
  useEffect(() => {
    if (runningEntry) {
      const updateElapsed = () => {
        const elapsed = Math.floor((Date.now() - new Date(runningEntry.startTime).getTime()) / 1000);
        setElapsedSeconds(elapsed);
      };
      
      updateElapsed();
      timerIntervalRef.current = setInterval(updateElapsed, 1000);
    } else {
      setElapsedSeconds(0);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [runningEntry]);

  // Reset state when task changes
  useEffect(() => {
    setDescriptionText(task.description || '');
    setStartDate(new Date(task.startDate));
    setEndDate(new Date(task.endDate));
    setShowSubtaskForm(false);
    setEditingSubtask(null);
    resetSubtaskForm();
    setChatMessageText('');
  }, [task.id, task.description, task.startDate, task.endDate]);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatScrollRef.current && showChat) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [taskMessages, showChat]);

  const resetSubtaskForm = () => {
    setSubtaskForm({
      title: '',
      description: '',
      status: 'Todo',
      priority: 'medium',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      assignedToUserId: user?.id || '',
    });
  };

  const handleCreateSubtask = async () => {
    if (!subtaskForm.title.trim() || !user) return;

    await taskMutation.create({
      title: subtaskForm.title,
      description: subtaskForm.description,
      status: subtaskForm.status,
      priority: subtaskForm.priority,
      startDate: subtaskForm.startDate,
      endDate: subtaskForm.endDate,
      assignedToUserId: subtaskForm.assignedToUserId || user.id,
      projectId: task.projectId,
      parentTaskId: task.id,
      collaboratorIds: '[]',
    });

    resetSubtaskForm();
    setShowSubtaskForm(false);
  };

  const handleUpdateSubtask = async (subtaskId: string, data: any) => {
    await taskMutation.update(subtaskId, data);
    setEditingSubtask(null);
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    await taskMutation.remove(subtaskId);
  };

  const startEditingSubtask = (subtask: any) => {
    setEditingSubtask(subtask.id);
    setSubtaskForm({
      title: subtask.title,
      description: subtask.description || '',
      status: subtask.status,
      priority: subtask.priority || 'medium',
      startDate: new Date(subtask.startDate),
      endDate: new Date(subtask.endDate),
      assignedToUserId: subtask.assignedToUserId,
    });
  };

  const cancelEditingSubtask = () => {
    setEditingSubtask(null);
    resetSubtaskForm();
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const startTimer = async () => {
    if (!user) return;

    await timeEntryMutation.create({
      userId: user.id,
      taskId: task.id,
      projectId: task.projectId,
      description: `Working on: ${task.title}`,
      startTime: new Date(),
      isBillable: false,
      isPomodoroSession: false,
    });
  };

  const stopTimer = async () => {
    if (!runningEntry || !user) return;

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - new Date(runningEntry.startTime).getTime()) / 60000);

    await timeEntryMutation.update(runningEntry.id, {
      endTime,
      duration,
    });
  };

  // Handle @mention detection in comment input
  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCommentText(value);

    // Check for @mention
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const afterAt = value.slice(lastAtIndex + 1);
      const spaceIndex = afterAt.indexOf(' ');
      if (spaceIndex === -1) {
        setMentionQuery(afterAt);
        setShowMentionSuggestions(true);
      } else {
        setShowMentionSuggestions(false);
      }
    } else {
      setShowMentionSuggestions(false);
    }
  };

  // Insert @mention
  const insertMention = (userId: string) => {
    const lastAtIndex = commentText.lastIndexOf('@');
    const newText = commentText.slice(0, lastAtIndex) + `@${userId} `;
    setCommentText(newText);
    setShowMentionSuggestions(false);
  };

  // Parse @mentions and send notifications
  const handleAddComment = async () => {
    if (commentText.trim()) {
      // Find all @mentions in the comment
      const mentionRegex = /@(\S+)/g;
      const mentions = commentText.match(mentionRegex) || [];
      
      // Send notifications to mentioned users
      for (const mention of mentions) {
        const userId = mention.slice(1); // Remove @ symbol
        if (userId !== user?.id) {
          await notificationMutation.create({
            userId,
            title: 'Ju përmendën në një koment',
            message: `${user?.name || 'Dikush'} ju përmendi në detyrën: ${task.title}`,
            isRead: false,
          });
        }
      }

      onAddComment(task.id, commentText);
      setCommentText('');
    }
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments = [...attachments];
    
    for (const file of Array.from(files)) {
      // In a real app, you'd upload to a storage service
      // For now, we'll create a mock URL
      const attachment = {
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file), // Mock URL
        uploadedBy: user?.id,
        uploadedAt: new Date().toISOString(),
      };
      newAttachments.push(attachment);
    }

    await onUpdate(task.id, { attachments: JSON.stringify(newAttachments) });
  };

  // Remove attachment
  const handleRemoveAttachment = async (index: number) => {
    const newAttachments = attachments.filter((_: any, i: number) => i !== index);
    await onUpdate(task.id, { attachments: JSON.stringify(newAttachments) });
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Render comment with highlighted @mentions
  const renderCommentWithMentions = (content: string) => {
    const parts = content.split(/(@\S+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="text-primary font-medium bg-primary/10 px-1 rounded">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const totalMinutes = timeEntries?.reduce((sum, entry) => sum + (entry.duration || 0), 0) || 0;

  const handleStartDateChange = async (date: Date | undefined) => {
    if (date) {
      setStartDate(date);
      await onUpdate(task.id, { startDate: date });
    }
  };

  const handleEndDateChange = async (date: Date | undefined) => {
    if (date) {
      setEndDate(date);
      await onUpdate(task.id, { endDate: date });
    }
  };

  // Send chat message
  const handleSendChatMessage = async () => {
    if (!chatMessageText.trim() || !user) return;

    try {
      await messageMutation.create({
        content: chatMessageText,
        senderId: user.id,
        taskId: task.id,
        isRead: false,
      });
      setChatMessageText('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Generate task label from title (first 2-3 words or abbreviation)
  const taskLabel = React.useMemo(() => {
    const words = task.title.split(' ').slice(0, 3);
    if (words.length === 1 && words[0].length > 15) {
      return words[0].slice(0, 12) + '...';
    }
    return words.join(' ');
  }, [task.title]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>{task.title}</DialogTitle>
            {activeWorkers.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-success">
                <Eye className="w-4 h-4 animate-pulse" />
                <span>{activeWorkers.length} duke punuar tani</span>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          {/* Details Section */}
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              {isEditingDescription ? (
                <Textarea
                  value={descriptionText}
                  onChange={(e) => setDescriptionText(e.target.value)}
                  onBlur={async () => {
                    if (descriptionText !== task.description) {
                      await onUpdate(task.id, { description: descriptionText });
                    }
                    setIsEditingDescription(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setDescriptionText(task.description || '');
                      setIsEditingDescription(false);
                    }
                  }}
                  className="min-h-[80px]"
                  autoFocus
                />
              ) : (
                <p 
                  className="text-muted-foreground cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors text-sm"
                  onClick={() => setIsEditingDescription(true)}
                >
                  {task.description || 'Click to add description...'}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Start Date</h4>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate.toLocaleDateString()}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar 
                      mode="single" 
                      selected={startDate} 
                      onSelect={handleStartDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <h4 className="font-medium mb-2">End Date</h4>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate.toLocaleDateString()}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar 
                      mode="single" 
                      selected={endDate} 
                      onSelect={handleEndDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Status</h4>
                <Select 
                  value={task.status} 
                  onValueChange={async (newStatus) => {
                    await onUpdate(task.id, { status: newStatus });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todo">To Do</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Review">Review</SelectItem>
                    <SelectItem value="Done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <h4 className="font-medium mb-2">Priority</h4>
                <Select 
                  value={task.priority || 'medium'} 
                  onValueChange={async (newPriority) => {
                    await onUpdate(task.id, { priority: newPriority });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Assigned To</h4>
              <p className="text-sm text-muted-foreground">{task.assignedToUserId}</p>
            </div>

            {taskCollaborators && taskCollaborators.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Collaborators ({taskCollaborators.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {taskCollaborators.map(collab => (
                    <Badge key={collab.id} variant="secondary">
                      <Users className="w-3 h-3 mr-1" />
                      {collab.userId.slice(0, 8)} ({collab.role || 'collaborator'})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {task.parentTaskId && (
              <div>
                <h4 className="font-medium mb-2">Parent Task</h4>
                <p className="text-sm text-muted-foreground">Subtask of: {task.parentTaskId}</p>
              </div>
            )}

            {/* File Attachments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  Skedarët ({attachments.length})
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Ngarko
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
              
              {attachments.length > 0 ? (
                <div className="space-y-2">
                  {attachments.map((file: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(file.url, '_blank')}
                        >
                          Shiko
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAttachment(index)}
                        >
                          <X className="w-4 h-4 text-error" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded">
                  Asnjë skedar i ngarkuar. Kliko "Ngarko" për të shtuar skedarë.
                </p>
              )}
            </div>

            {/* Active Workers - Real-time collaboration */}
            {activeWorkers.length > 0 && (
              <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                <h4 className="font-medium text-success flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4" />
                  Duke punuar tani
                </h4>
                <div className="flex flex-wrap gap-2">
                  {activeWorkers.map(entry => (
                    <Badge key={entry.id} variant="secondary" className="bg-success/20">
                      {entry.userId.slice(0, 8)}...
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Subtasks Section - Only show if this is NOT a subtask itself */}
            {!task.parentTaskId && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium flex items-center gap-2">
                    Nën-detyra ({subtasks?.length || 0})
                  </h4>
                  <div className="flex items-center gap-2">
                    {subtasks && subtasks.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSubtasks(!showSubtasks)}
                      >
                        {showSubtasks ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        resetSubtaskForm();
                        setShowSubtaskForm(!showSubtaskForm);
                        setEditingSubtask(null);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Shto Nën-detyrë
                    </Button>
                  </div>
                </div>

                {/* Subtask Creation/Edit Form */}
                {(showSubtaskForm || editingSubtask) && (
                  <div className="bg-muted/50 border rounded-lg p-4 mb-4 space-y-4">
                    <h5 className="font-medium text-sm">
                      {editingSubtask ? 'Ndrysho Nën-detyrën' : 'Nën-detyrë e Re'}
                    </h5>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Titulli *</label>
                        <Input
                          placeholder="Titulli i nën-detyrës"
                          value={subtaskForm.title}
                          onChange={(e) => setSubtaskForm({ ...subtaskForm, title: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1 block">Përshkrimi</label>
                        <Textarea
                          placeholder="Përshkrimi i nën-detyrës"
                          value={subtaskForm.description}
                          onChange={(e) => setSubtaskForm({ ...subtaskForm, description: e.target.value })}
                          className="min-h-[60px]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Statusi</label>
                          <Select
                            value={subtaskForm.status}
                            onValueChange={(value) => setSubtaskForm({ ...subtaskForm, status: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Todo">Për të bërë</SelectItem>
                              <SelectItem value="In Progress">Në progres</SelectItem>
                              <SelectItem value="Review">Në rishikim</SelectItem>
                              <SelectItem value="Done">Përfunduar</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-1 block">Prioriteti</label>
                          <Select
                            value={subtaskForm.priority}
                            onValueChange={(value) => setSubtaskForm({ ...subtaskForm, priority: value })}
                          >
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

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Data e Fillimit</label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {subtaskForm.startDate.toLocaleDateString()}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={subtaskForm.startDate}
                                onSelect={(date) => date && setSubtaskForm({ ...subtaskForm, startDate: date })}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-1 block">Data e Mbarimit</label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {subtaskForm.endDate.toLocaleDateString()}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={subtaskForm.endDate}
                                onSelect={(date) => date && setSubtaskForm({ ...subtaskForm, endDate: date })}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1 block">Caktuar te</label>
                        <Input
                          placeholder="ID e përdoruesit"
                          value={subtaskForm.assignedToUserId}
                          onChange={(e) => setSubtaskForm({ ...subtaskForm, assignedToUserId: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          ID juaj: {user?.id || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      {editingSubtask ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateSubtask(editingSubtask, subtaskForm)}
                            disabled={!subtaskForm.title.trim()}
                          >
                            Ruaj Ndryshimet
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={cancelEditingSubtask}
                          >
                            Anulo
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            onClick={handleCreateSubtask}
                            disabled={!subtaskForm.title.trim()}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Krijo Nën-detyrë
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowSubtaskForm(false)}
                          >
                            Anulo
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Subtasks List */}
                {showSubtasks && subtasks && subtasks.length > 0 && (
                  <div className="space-y-2">
                    {subtasks.map(subtask => (
                      <div 
                        key={subtask.id} 
                        className={`p-3 rounded-lg border ${
                          subtask.status === 'Done' ? 'bg-success/10 border-success/20' : 'bg-card'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox 
                            checked={subtask.status === 'Done'}
                            onCheckedChange={(checked) => {
                              handleUpdateSubtask(subtask.id, { 
                                status: checked ? 'Done' : 'Todo' 
                              });
                            }}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-medium ${subtask.status === 'Done' ? 'line-through text-muted-foreground' : ''}`}>
                                {subtask.title}
                              </span>
                              <Badge 
                                variant={subtask.status === 'Done' ? 'secondary' : 'default'}
                                className="text-xs"
                              >
                                {subtask.status}
                              </Badge>
                              <Badge 
                                variant="outline"
                                className={`text-xs ${
                                  subtask.priority === 'urgent' ? 'border-error text-error' :
                                  subtask.priority === 'high' ? 'border-warning text-warning' :
                                  ''
                                }`}
                              >
                                {subtask.priority === 'low' ? 'I ulët' :
                                 subtask.priority === 'medium' ? 'Mesatar' :
                                 subtask.priority === 'high' ? 'I lartë' : 'Urgjent'}
                              </Badge>
                            </div>
                            {subtask.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {subtask.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" />
                                {new Date(subtask.endDate).toLocaleDateString()}
                              </span>
                              <span>
                                Caktuar: {subtask.assignedToUserId?.slice(0, 8)}...
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditingSubtask(subtask)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSubtask(subtask.id)}
                            >
                              <Trash2 className="w-4 h-4 text-error" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(!subtasks || subtasks.length === 0) && !showSubtaskForm && (
                  <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded">
                    Asnjë nën-detyrë. Kliko "Shto Nën-detyrë" për të krijuar një.
                  </p>
                )}
              </div>
            )}

            {/* Show notice if this is a subtask */}
            {task.parentTaskId && (
              <div className="bg-muted/50 border rounded-lg p-3">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <ChevronRight className="w-4 h-4" />
                  Kjo është një nën-detyrë. Nën-detyrat nuk mund të kenë nën-detyra të tjera.
                </p>
              </div>
            )}
          </div>

          {/* Time Tracking Section */}
          <div className="border-t pt-4 space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Time Tracking
            </h4>
            <div className="flex items-center gap-4">
              <div className="text-2xl font-mono font-bold text-foreground">
                {formatTime(elapsedSeconds)}
              </div>

              {runningEntry ? (
                <Button onClick={stopTimer} variant="destructive" size="sm">
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              ) : (
                <Button onClick={startTimer} size="sm" className="bg-success">
                  <Play className="w-4 h-4 mr-2" />
                  Start
                </Button>
              )}

              <div className="flex-1 text-right text-sm text-muted-foreground">
                Total: {formatDuration(totalMinutes)} ({timeEntries?.length || 0} entries)
              </div>
            </div>

            {timeEntries && timeEntries.length > 0 && (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {timeEntries.slice(0, 3).map(entry => (
                  <div key={entry.id} className="flex items-center justify-between text-sm bg-muted p-2 rounded">
                    <span className="text-muted-foreground">
                      {new Date(entry.startTime).toLocaleDateString()}
                    </span>
                    {entry.endTime ? (
                      <Badge variant="secondary" className="text-xs">{formatDuration(entry.duration || 0)}</Badge>
                    ) : (
                      <Badge variant="default" className="text-xs">Running</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Task Chat Section */}
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Chat i Detyrës
                <Badge variant="secondary" className="text-xs">
                  <Hash className="w-3 h-3 mr-1" />
                  {taskLabel}
                </Badge>
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChat(!showChat)}
              >
                {showChat ? 'Mbyll Chat' : `Hap Chat (${taskMessages?.length || 0})`}
              </Button>
            </div>

            {showChat && (
              <div className="border rounded-lg overflow-hidden">
                {/* Chat Header with Task Label */}
                <div className="bg-muted px-4 py-2 border-b flex items-center gap-2">
                  <Hash className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">{task.title}</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {taskMessages?.length || 0} mesazhe
                  </Badge>
                </div>

                {/* Chat Messages */}
                <ScrollArea className="h-64 p-4" ref={chatScrollRef}>
                  <div className="space-y-3">
                    {isLoadingMessages ? (
                      <div className="text-center text-muted-foreground py-8">
                        Duke ngarkuar mesazhet...
                      </div>
                    ) : taskMessages && taskMessages.length > 0 ? (
                      taskMessages.map((message) => {
                        const isOwnMessage = message.senderId === user?.id;
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg p-3 ${
                                isOwnMessage
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium">
                                  {isOwnMessage ? 'Ti' : `${message.senderId.slice(0, 8)}...`}
                                </span>
                                <span className={`text-xs ${
                                  isOwnMessage ? 'text-primary-foreground/60' : 'text-muted-foreground'
                                }`}>
                                  {new Date(message.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <p className="text-sm break-words">{message.content}</p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Asnjë mesazh ende në këtë detyrë.</p>
                        <p className="text-xs mt-1">Fillo bisedën për këtë detyrë!</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Chat Input */}
                <div className="border-t p-3">
                  <div className="flex gap-2">
                    <Input
                      value={chatMessageText}
                      onChange={(e) => setChatMessageText(e.target.value)}
                      placeholder={`Shkruaj mesazh për "${taskLabel}"...`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendChatMessage();
                        }
                      }}
                      disabled={messageMutation.isPending}
                    />
                    <Button 
                      onClick={handleSendChatMessage} 
                      disabled={!chatMessageText.trim() || messageMutation.isPending}
                      size="sm"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Comments Section - Always visible at bottom */}
          <div className="border-t pt-4 space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Komente ({comments.length})
            </h4>
            
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {comments.length > 0 ? (
                comments.map(comment => (
                  <div key={comment.id} className="bg-muted p-3 rounded">
                    <p className="text-sm">{renderCommentWithMentions(comment.content)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(comment.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Asnjë koment ende
                </p>
              )}
            </div>
            
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Shkruaj koment... përdor @emri për të përmendur dikë"
                    value={commentText}
                    onChange={handleCommentChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !showMentionSuggestions) {
                        handleAddComment();
                      }
                      if (e.key === 'Escape') {
                        setShowMentionSuggestions(false);
                      }
                    }}
                  />
                  {showMentionSuggestions && mentionSuggestions.length > 0 && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border rounded-lg shadow-lg z-50">
                      <div className="p-1">
                        <p className="text-xs text-muted-foreground px-2 py-1">Përmend dikë</p>
                        {mentionSuggestions.map(member => (
                          <button
                            key={member.id}
                            className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded flex items-center gap-2"
                            onClick={() => insertMention(member.userId)}
                          >
                            <AtSign className="w-3 h-3 text-primary" />
                            {member.userId}
                            <Badge variant="outline" className="text-xs ml-auto">{member.role}</Badge>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <Button onClick={handleAddComment} size="sm">
                  <MessageSquare className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Tip: Përdor @emri për të njoftuar dikë
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Close
          </Button>
          <Button variant="destructive" onClick={() => {
            onDelete(task.id);
            onOpenChange(false);
          }}>
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;
