import React, { useState, useEffect, useRef } from 'react';
import { useCollection, useMutation } from '../hooks/useFirestore';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Send, MessageSquare, Users, Hash, Paperclip, X, FileIcon, User, Circle } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import type { ChatMessage, Channel, UserProfile } from '../types';

type Message = {
  id: string;
  content: string;
  senderId: string;
  receiverId?: string;
  channelId?: string;
  isRead: boolean;
  attachmentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  createdByUserId: string | null;
};

type MessageDraft = {
  content: string;
  senderId: string;
  receiverId?: string;
  channelId?: string;
  isRead: boolean;
  attachmentUrl?: string;
};

type TeamMember = {
  id: string;
  userId: string;
  teamId: string;
  role: string;
  status: string;
  createdAt: Date;
};

type ChatMode = 'channel' | 'direct';

const ChatView: React.FC = () => {
  const { user } = useAuth({ requireAuth: true });
  const { toast } = useToast();
  const [messageText, setMessageText] = useState('');
  const [chatMode, setChatMode] = useState<ChatMode>('channel');
  const [activeChannel, setActiveChannel] = useState<'general' | 'team' | 'support'>('general');
  const [activeDirectUserId, setActiveDirectUserId] = useState<string | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch team members for direct messaging
  const { data: teamMembers } = useCollection<any>('teamMembers', {
    where: [{ field: 'status', operator: '==', value: 'Active' }],
  });

  // Fetch messages for the active channel
  const { data: channelMessages, loading: channelPending } = useCollection<ChatMessage>('messages', {
    where: [{ field: 'channelId', operator: '==', value: activeChannel }],
    orderBy: { field: 'createdAt', direction: 'asc' },
  });

  // Fetch all direct messages where user is sender or receiver
  const { data: allDirectMessages, loading: directPending } = useCollection<ChatMessage>('messages');

  // Filter direct messages for the active conversation
  const directMessages = allDirectMessages?.filter(m => 
    !m.channelId && (
      (m.senderId === user?.id && m.receiverId === activeDirectUserId) ||
      (m.senderId === activeDirectUserId && m.receiverId === user?.id)
    )
  ) || [];

  // Get messages based on chat mode
  const messages = chatMode === 'channel' ? channelMessages : directMessages;
  const isPending = chatMode === 'channel' ? channelPending : directPending;
  const error = chatMode === 'channel' ? channelError : directError;

  // Get unique users from direct messages for conversation list
  const directConversations = React.useMemo(() => {
    if (!allDirectMessages || !user) return [];
    
    const userIds = new Set<string>();
    allDirectMessages.forEach(m => {
      if (!m.channelId) {
        if (m.senderId !== user.id) userIds.add(m.senderId);
        if (m.receiverId && m.receiverId !== user.id) userIds.add(m.receiverId);
      }
    });
    
    return Array.from(userIds);
  }, [allDirectMessages, user]);

  // Get unread count for a direct conversation
  const getUnreadCount = (userId: string) => {
    return allDirectMessages?.filter(m => 
      !m.channelId && 
      m.senderId === userId && 
      m.receiverId === user?.id && 
      !m.isRead
    ).length || 0;
  };

  // Get other team members (excluding current user)
  const otherMembers = teamMembers?.filter(m => m.userId !== user?.id) || [];

  const { create, isPending: isSending, error: sendError } = useMutation('Message');

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageText.trim() && !attachmentUrl.trim()) || !user) return;

    try {
      if (chatMode === 'channel') {
        await create({
          content: messageText || '📎 Attachment',
          senderId: user.id,
          channelId: activeChannel,
          isRead: false,
          attachmentUrl: attachmentUrl.trim() || undefined,
        });
      } else if (activeDirectUserId) {
        await create({
          content: messageText || '📎 Attachment',
          senderId: user.id,
          receiverId: activeDirectUserId,
          isRead: false,
          attachmentUrl: attachmentUrl.trim() || undefined,
        });
      }
      setMessageText('');
      setAttachmentUrl('');
      setShowAttachmentInput(false);
      toast({
        title: 'Message sent',
        description: 'Your message has been delivered.',
      });
    } catch (err) {
      toast({
        title: 'Failed to send message',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleSelectChannel = (channelId: 'general' | 'team' | 'support') => {
    setChatMode('channel');
    setActiveChannel(channelId);
    setActiveDirectUserId(null);
  };

  const handleSelectDirectMessage = (userId: string) => {
    setChatMode('direct');
    setActiveDirectUserId(userId);
  };

  const channels = [
    { id: 'general' as const, name: 'General', icon: Hash, description: 'Company-wide discussions' },
    { id: 'team' as const, name: 'Team', icon: Users, description: 'Team collaboration' },
    { id: 'support' as const, name: 'Support', icon: MessageSquare, description: 'Customer support' },
  ];

  // Get display name for a user ID
  const getUserDisplayName = (userId: string) => {
    const member = teamMembers?.find(m => m.userId === userId);
    if (member) {
      return `${member.role} - ${userId.slice(0, 8)}`;
    }
    return `User ${userId.slice(0, 8)}`;
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading messages...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-destructive">Error loading messages: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Internal Chat</h1>
        <p className="text-muted-foreground mt-2">
          Communicate with your team in real-time
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Channel & DM List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Kanalet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-2">
            {channels.map((channel) => {
              const Icon = channel.icon;
              const chMessages = channelMessages?.filter(m => m.channelId === channel.id) || [];
              const unreadCount = chMessages.filter(m => !m.isRead && m.senderId !== user?.id).length;

              return (
                <button
                  key={channel.id}
                  onClick={() => handleSelectChannel(channel.id)}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left ${
                    chatMode === 'channel' && activeChannel === channel.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                >
                  <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{channel.name}</span>
                      {unreadCount > 0 && (
                        <Badge variant="destructive" className="h-5 min-w-5 px-1.5">
                          {unreadCount}
                        </Badge>
                      )}
                    </div>
                    <p className={`text-xs mt-0.5 truncate ${
                      chatMode === 'channel' && activeChannel === channel.id ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    }`}>
                      {channel.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </CardContent>

          <Separator className="my-2" />

          <CardHeader className="pt-2 pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-4 w-4" />
              Mesazhe Direkte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Existing conversations */}
            {directConversations.map((userId) => {
              const unreadCount = getUnreadCount(userId);
              return (
                <button
                  key={userId}
                  onClick={() => handleSelectDirectMessage(userId)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                    chatMode === 'direct' && activeDirectUserId === userId
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                >
                  <div className="relative">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                    <Circle className="h-3 w-3 absolute -bottom-0.5 -right-0.5 fill-green-500 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate text-sm">
                        {getUserDisplayName(userId)}
                      </span>
                      {unreadCount > 0 && (
                        <Badge variant="destructive" className="h-5 min-w-5 px-1.5">
                          {unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Team members not in conversations yet */}
            {otherMembers.filter(m => !directConversations.includes(m.userId)).length > 0 && (
              <>
                <p className="text-xs text-muted-foreground px-3 pt-2">Anëtarë të Ekipit</p>
                {otherMembers
                  .filter(m => !directConversations.includes(m.userId))
                  .map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleSelectDirectMessage(member.userId)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                        chatMode === 'direct' && activeDirectUserId === member.userId
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent'
                      }`}
                    >
                      <div className="relative">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-4 w-4" />
                        </div>
                        <Circle className="h-3 w-3 absolute -bottom-0.5 -right-0.5 fill-gray-400 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium truncate text-sm block">
                          {member.role} - {member.userId.slice(0, 8)}
                        </span>
                      </div>
                    </button>
                  ))}
              </>
            )}

            {otherMembers.length === 0 && directConversations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nuk ka anëtarë të tjerë në ekip
              </p>
            )}
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-3 flex flex-col h-[600px]">
          <CardHeader className="border-b">
            <div className="flex items-center gap-2">
              {chatMode === 'channel' ? (
                <>
                  {React.createElement(channels.find(c => c.id === activeChannel)?.icon || Hash, {
                    className: 'h-5 w-5'
                  })}
                  <CardTitle className="text-lg">
                    {channels.find(c => c.id === activeChannel)?.name}
                  </CardTitle>
                </>
              ) : (
                <>
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-lg">
                    {activeDirectUserId ? getUserDisplayName(activeDirectUserId) : 'Zgjidh një përdorues'}
                  </CardTitle>
                </>
              )}
              <Badge variant="secondary" className="ml-auto">
                {messages?.length || 0} mesazhe
              </Badge>
            </div>
          </CardHeader>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages && messages.length > 0 ? (
                messages.map((message) => {
                  const isOwnMessage = message.senderId === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          isOwnMessage
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">
                            {isOwnMessage ? 'You' : `User ${message.senderId.slice(0, 8)}`}
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
                        {message.attachmentUrl && (
                          <a
                            href={message.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 mt-2 p-2 rounded border ${
                              isOwnMessage
                                ? 'border-primary-foreground/20 hover:bg-primary-foreground/10'
                                : 'border-border hover:bg-accent'
                            }`}
                          >
                            <FileIcon className="h-4 w-4 flex-shrink-0" />
                            <span className="text-xs truncate">
                              {message.attachmentUrl.split('/').pop() || 'Attachment'}
                            </span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {chatMode === 'direct' && !activeDirectUserId 
                    ? 'Zgjidh një anëtar ekipi për të filluar bisedën'
                    : 'Nuk ka mesazhe ende. Fillo bisedën!'}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Message Input */}
          <CardContent className="border-t p-4">
            <form onSubmit={handleSendMessage} className="space-y-2">
              {showAttachmentInput && (
                <div className="flex gap-2 items-center p-2 bg-muted rounded-lg">
                  <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Input
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    placeholder="Paste file URL..."
                    disabled={isSending}
                    className="flex-1 h-8"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAttachmentInput(false);
                      setAttachmentUrl('');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowAttachmentInput(!showAttachmentInput)}
                  disabled={isSending}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your message..."
                  disabled={isSending}
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  disabled={isSending || (!messageText.trim() && !attachmentUrl.trim()) || (chatMode === 'direct' && !activeDirectUserId)}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
            {sendError && (
              <p className="text-sm text-destructive mt-2">
                Error: {sendError.message}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatView;
