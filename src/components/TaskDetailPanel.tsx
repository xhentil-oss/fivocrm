import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useAuth } from '@animaapp/playground-react-sdk';
import { Calendar as CalendarIcon, MessageSquare, Users, ChevronRight, ChevronDown, Clock, Play, Pause, Square, Paperclip, Upload, X, AtSign, Eye, Plus, Trash2, Edit2, Send, Hash, Check } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';
import type { Task, TaskComment } from '@animaapp/playground-react-sdk';

interface TaskDetailPanelProps {
  task: Task;
  onClose: () => void;
  comments: TaskComment[];
  onAddComment: (taskId: string, content: string) => void;
  onUpdate: (id: string, data: any) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
  projects?: { id: string; name: string }[];
}

const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({ 
  task, 
  onClose, 
  comments, 
  onAddComment, 
  onUpdate, 
  onDelete,
  projects = []
}) => {
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(task.title);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionText, setDescriptionText] = useState(task.description || '');
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [chatMessageText, setChatMessageText] = useState('');
  const [showChat, setShowChat] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  // Subtask form state
  const [subtaskForm, setSubtaskForm] = useState({
    title: '',
    description: '',
    status: 'Todo',
    priority: 'medium',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    assignedToUserId: '',
  });
  
  // Date editing state
  const [startDate, setStartDate] = useState<Date>(new Date(task.startDate));
  const [endDate, setEndDate] = useState<Date>(new Date(task.endDate));
  
  // Time tracking state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { data: subtasks } = useQuery('Task', {
    where: { parentTaskId: task.id }
  });
  
  const { data: taskCollaborators } = useQuery('TaskCollaborator', {
    where: { taskId: task.id }
  });

  const { data: timeEntries } = useQuery('TimeEntry', {
    where: { taskId: task.id },
    orderBy: { startTime: 'desc' }
  });

  const { data: taskMessages, isPending: isLoadingMessages } = useQuery('Message', {
    where: { taskId: task.id },
    orderBy: { createdAt: 'asc' }
  });

  const { data: allActiveTimeEntries } = useQuery('TimeEntry', {
    where: { endTime: undefined }
  });

  const { data: teamMembers } = useQuery('TeamMember', {
    where: { status: 'Active' }
  });


  const taskMutation = useMutation('Task');
  const timeEntryMutation = useMutation('TimeEntry');
  const notificationMutation = useMutation('Notification');
  const messageMutation = useMutation('Message');

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
    setTitleText(task.title);
    setDescriptionText(task.description || '');
    setStartDate(new Date(task.startDate));
    setEndDate(new Date(task.endDate));
    setShowSubtaskForm(false);
    setEditingSubtask(null);
    setIsEditingTitle(false);
    resetSubtaskForm();
    setChatMessageText('');
  }, [task.id, task.title, task.description, task.startDate, task.endDate]);

  // Focus title input when editing
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Auto-scroll chat to bottom
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

  const handleSaveTitle = async () => {
    if (titleText.trim() && titleText !== task.title) {
      await onUpdate(task.id, { title: titleText });
    } else {
      setTitleText(task.title);
    }
    setIsEditingTitle(false);
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

    const endTimeVal = new Date();
    const duration = Math.floor((endTimeVal.getTime() - new Date(runningEntry.startTime).getTime()) / 60000);

    await timeEntryMutation.update(runningEntry.id, {
      endTime: endTimeVal,
      duration,
    });
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCommentText(value);

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

  const insertMention = (userId: string) => {
    const lastAtIndex = commentText.lastIndexOf('@');
    const newText = commentText.slice(0, lastAtIndex) + `@${userId} `;
    setCommentText(newText);
    setShowMentionSuggestions(false);
  };

  const handleAddCommentSubmit = async () => {
    if (commentText.trim()) {
      const mentionRegex = /@(\S+)/g;
      const mentions = commentText.match(mentionRegex) || [];
      
      for (const mention of mentions) {
        const userId = mention.slice(1);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments = [...attachments];
    
    for (const file of Array.from(files)) {
      const attachment = {
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
        uploadedBy: user?.id,
        uploadedAt: new Date().toISOString(),
      };
      newAttachments.push(attachment);
    }

    await onUpdate(task.id, { attachments: JSON.stringify(newAttachments) });
  };

  const handleRemoveAttachment = async (index: number) => {
    const newAttachments = attachments.filter((_: any, i: number) => i !== index);
    await onUpdate(task.id, { attachments: JSON.stringify(newAttachments) });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

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

  const taskLabel = React.useMemo(() => {
    const words = task.title.split(' ').slice(0, 3);
    if (words.length === 1 && words[0].length > 15) {
      return words[0].slice(0, 12) + '...';
    }
    return words.join(' ');
  }, [task.title]);

  // Format date compactly
  const formatDateCompact = (date: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  return (
    <div className="h-full flex flex-col bg-background border-l">
      {/* Header with Status Badge and Close */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/30">
        <Badge 
          className={`${task.status === 'Done' ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}`}
        >
          {task.status === 'Done' && <Check className="w-3 h-3 mr-1" />}
          {task.status}
        </Badge>
        <div className="flex items-center gap-2">
          {activeWorkers.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-success">
              <Eye className="w-3 h-3 animate-pulse" />
              <span>{activeWorkers.length} duke punuar</span>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Editable Title */}
          <div>
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  ref={titleInputRef}
                  value={titleText}
                  onChange={(e) => setTitleText(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') {
                      setTitleText(task.title);
                      setIsEditingTitle(false);
                    }
                  }}
                  className="text-2xl font-semibold h-auto py-1 px-2"
                />
              </div>
            ) : (
              <h1 
                className="text-2xl font-semibold text-foreground cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 transition-colors"
                onClick={() => setIsEditingTitle(true)}
              >
                {task.title}
              </h1>
            )}
          </div>

          {/* Compact Info Row: Assignee + Dates */}
          <div className="space-y-3">
            {/* Assignee - Editable */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground w-20">Caktuar te</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button 
                    className="flex items-center gap-2 hover:bg-muted/50 rounded px-2 py-1 -mx-2 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                      {task.assignedToUserId?.slice(0, 2).toUpperCase() || '?'}
                    </div>
                    <span className="text-sm">
                      {teamMembers?.find(m => m.userId === task.assignedToUserId)?.userId?.slice(0, 12) || 
                       task.assignedToUserId?.slice(0, 12) || 'Pa caktuar'}
                      {task.assignedToUserId && '...'}
                    </span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground px-2 py-1">Zgjidh përdoruesin</p>
                    
                    {/* Current user option */}
                    {user && (
                      <button
                        className={`w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-muted/50 text-left ${
                          task.assignedToUserId === user.id ? 'bg-primary/10' : ''
                        }`}
                        onClick={async () => {
                          await onUpdate(task.id, { assignedToUserId: user.id });
                        }}
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                          {user.name?.slice(0, 2).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name || 'Ti'}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        {task.assignedToUserId === user.id && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </button>
                    )}
                    
                    {/* Team members */}
                    {teamMembers && teamMembers.length > 0 && (
                      <>
                        <div className="border-t my-2" />
                        <p className="text-xs text-muted-foreground px-2 py-1">Anëtarët e ekipit</p>
                        {teamMembers
                          .filter(m => m.userId !== user?.id)
                          .map(member => (
                            <button
                              key={member.id}
                              className={`w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-muted/50 text-left ${
                                task.assignedToUserId === member.userId ? 'bg-primary/10' : ''
                              }`}
                              onClick={async () => {
                                  await onUpdate(task.id, { assignedToUserId: member.userId });
                              }}
                            >
                              <div className="w-6 h-6 rounded-full bg-secondary/50 flex items-center justify-center text-xs font-medium">
                                {member.userId?.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">{member.userId?.slice(0, 20)}...</p>
                                <p className="text-xs text-muted-foreground">{member.role}</p>
                              </div>
                              {task.assignedToUserId === member.userId && (
                                <Check className="w-4 h-4 text-primary" />
                              )}
                            </button>
                          ))}
                      </>
                    )}
                    
                    {/* Manual input option */}
                    <div className="border-t my-2" />
                    <div className="px-2">
                      <p className="text-xs text-muted-foreground mb-1">Ose shkruaj User ID:</p>
                      <Input
                        placeholder="User ID..."
                        className="h-8 text-xs"
                        defaultValue={task.assignedToUserId || ''}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            const newUserId = (e.target as HTMLInputElement).value;
                              if (newUserId) {
                              await onUpdate(task.id, { assignedToUserId: newUserId });
                            }
                          }
                        }}
                        onBlur={async (e) => {
                          const newUserId = e.target.value;
                          if (newUserId && newUserId !== task.assignedToUserId) {
                            await onUpdate(task.id, { assignedToUserId: newUserId });
                          }
                        }}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Due Date - Compact */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground w-20">Afati</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 text-sm hover:bg-muted/50 rounded px-2 py-1 -mx-2 transition-colors">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    <span>{formatDateCompact(endDate)}</span>
                    <X className="w-3 h-3 text-muted-foreground hover:text-foreground" onClick={(e) => e.stopPropagation()} />
                  </button>
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

            {/* Start Date - Compact (optional, smaller) */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground w-20">Fillimi</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 text-sm text-muted-foreground hover:bg-muted/50 rounded px-2 py-1 -mx-2 transition-colors">
                    <CalendarIcon className="w-3 h-3" />
                    <span className="text-xs">{formatDateCompact(startDate)}</span>
                  </button>
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

            {/* Project */}
            {task.projectId && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground w-20">Projekti</span>
                <span className="text-sm">{task.projectId.slice(0, 12)}...</span>
              </div>
            )}

            {/* Status & Priority - Inline */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground w-20">Statusi</span>
              <Select 
                value={task.status} 
                onValueChange={async (newStatus) => {
                  await onUpdate(task.id, { status: newStatus });
                }}
              >
                <SelectTrigger className="w-32 h-8 text-sm">
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

            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground w-20">Prioriteti</span>
              <Select 
                value={task.priority || 'medium'} 
                onValueChange={async (newPriority) => {
                  await onUpdate(task.id, { priority: newPriority });
                }}
              >
                <SelectTrigger className="w-32 h-8 text-sm">
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

          {/* Description - Larger Area */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Përshkrimi</h4>
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
                className="min-h-[150px] text-sm"
                placeholder="Shto përshkrim..."
                autoFocus
              />
            ) : (
              <div 
                className="min-h-[100px] text-sm cursor-pointer hover:bg-muted/50 p-3 rounded border border-dashed border-transparent hover:border-border transition-colors whitespace-pre-wrap"
                onClick={() => setIsEditingDescription(true)}
              >
                {task.description || (
                  <span className="text-muted-foreground">Kliko për të shtuar përshkrim...</span>
                )}
              </div>
            )}
          </div>

          {/* Collaborators */}
          {taskCollaborators && taskCollaborators.length > 0 && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Bashkëpunëtorët</h4>
              <div className="flex flex-wrap gap-2">
                {taskCollaborators.map(collab => (
                  <Badge key={collab.id} variant="secondary" className="text-xs">
                    <Users className="w-3 h-3 mr-1" />
                    {collab.userId.slice(0, 8)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Time Tracking - Compact */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Koha
              </h4>
              <span className="text-xs text-muted-foreground">
                Total: {formatDuration(totalMinutes)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xl font-mono font-bold">
                {formatTime(elapsedSeconds)}
              </div>
              {runningEntry ? (
                <Button onClick={stopTimer} variant="destructive" size="sm">
                  <Square className="w-3 h-3 mr-1" />
                  Stop
                </Button>
              ) : (
                <Button onClick={startTimer} size="sm" className="bg-success hover:bg-success/90">
                  <Play className="w-3 h-3 mr-1" />
                  Start
                </Button>
              )}
            </div>
          </div>

          {/* Subtasks */}
          {!task.parentTaskId && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Nën-detyra ({subtasks?.length || 0})
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    resetSubtaskForm();
                    setShowSubtaskForm(!showSubtaskForm);
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {showSubtaskForm && (
                <div className="bg-muted/50 rounded-lg p-3 mb-3 space-y-3">
                  <Input
                    placeholder="Titulli i nën-detyrës"
                    value={subtaskForm.title}
                    onChange={(e) => setSubtaskForm({ ...subtaskForm, title: e.target.value })}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleCreateSubtask} disabled={!subtaskForm.title.trim()}>
                      Shto
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowSubtaskForm(false)}>
                      Anulo
                    </Button>
                  </div>
                </div>
              )}

              {subtasks && subtasks.length > 0 && (
                <div className="space-y-2">
                  {subtasks.map(subtask => (
                    <div 
                      key={subtask.id} 
                      className={`flex items-center gap-3 p-2 rounded ${
                        subtask.status === 'Done' ? 'bg-success/10' : 'hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox 
                        checked={subtask.status === 'Done'}
                        onCheckedChange={(checked) => {
                          handleUpdateSubtask(subtask.id, { 
                            status: checked ? 'Done' : 'Todo' 
                          });
                        }}
                      />
                      <span className={`flex-1 text-sm ${subtask.status === 'Done' ? 'line-through text-muted-foreground' : ''}`}>
                        {subtask.title}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        onClick={() => handleDeleteSubtask(subtask.id)}
                      >
                        <Trash2 className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Attachments */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Skedarët ({attachments.length})
              </h4>
              <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
            
            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((file: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleRemoveAttachment(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              Komente ({comments.length})
            </h4>
            
            {comments.length > 0 && (
              <div className="space-y-3 mb-4">
                {comments.map(comment => {
                  // Get commenter info
                  const commenterMember = teamMembers?.find(m => m.userId === comment.createdByUserId);
                  const isCurrentUser = comment.createdByUserId === user?.id;
                  const commenterName = isCurrentUser 
                    ? (user?.name || 'Ti') 
                    : (commenterMember?.userId?.slice(0, 12) || comment.createdByUserId?.slice(0, 12) || 'Anonim');
                  
                  return (
                    <div key={comment.id} className="bg-muted/50 p-3 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                          {commenterName.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">{commenterName}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleString('sq-AL')}
                        </span>
                      </div>
                      <p className="text-sm pl-8">{renderCommentWithMentions(comment.content)}</p>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Comment Input */}
            <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-2">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium flex-shrink-0">
                {user?.name?.slice(0, 2).toUpperCase() || 'U'}
              </div>
              <Input
                placeholder="Shto koment..."
                value={commentText}
                onChange={handleCommentChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !showMentionSuggestions) {
                    handleAddCommentSubmit();
                  }
                }}
                className="border-0 bg-transparent focus-visible:ring-0 text-sm"
              />
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/30">
        <Button variant="ghost" size="sm" className="text-error hover:text-error" onClick={() => {
          if (window.confirm('Je i sigurt që dëshiron të fshish këtë detyrë?')) {
            onDelete(task.id);
            onClose();
          }
        }}>
          <Trash2 className="w-4 h-4 mr-1" />
          Fshi
        </Button>
      </div>
    </div>
  );
};

export default TaskDetailPanel;
