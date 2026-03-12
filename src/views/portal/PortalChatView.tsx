import React, { useState, useEffect, useRef } from 'react';
import { useClientPortal } from '../../hooks/useClientPortal';
import { useCollection, useMutation } from '../../hooks/useFirestore';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Badge } from '../../components/ui/badge';
import { Send, MessageSquare, Paperclip, X, FileIcon } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import type { ChatMessage } from '../../types';

const PortalChatView: React.FC = () => {
  const { user } = useAuth();
  const { customerId } = useClientPortal();
  const { toast } = useToast();
  const [messageText, setMessageText] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Client-specific support channel: client-{customerId}
  const channelId = `client-${customerId}`;

  const { data: messages, loading } = useCollection<ChatMessage>('messages', {
    where: [{ field: 'channelId', operator: '==', value: channelId }],
    orderBy: { field: 'createdAt', direction: 'asc' },
  });

  // Fetch team members for display names
  const { data: teamMembers } = useCollection<any>('teamMembers', {
    where: [{ field: 'status', operator: '==', value: 'Active' }],
  });

  // Fetch user profiles for display names
  const { data: userProfiles } = useCollection<any>('userProfiles');

  const messageMutation = useMutation<ChatMessage>('messages');

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageText.trim() && !attachmentUrl.trim()) || !user) return;

    try {
      await messageMutation.create({
        content: messageText || '📎 Bashkëngjitje',
        senderId: user.uid,
        channelId,
        isRead: false,
        attachmentUrl: attachmentUrl.trim() || undefined,
        senderType: 'client',
      } as any);
      setMessageText('');
      setAttachmentUrl('');
      setShowAttachmentInput(false);
    } catch (err) {
      toast({
        title: 'Gabim',
        description: 'Mesazhi nuk u dërgua. Provoni përsëri.',
        variant: 'destructive',
      });
    }
  };

  const getDisplayName = (senderId: string) => {
    if (senderId === user?.uid) return 'Ju';

    // Check user profiles
    const profile = userProfiles?.find((p: any) => p.userId === senderId);
    if (profile?.displayName) return profile.displayName;

    // Check team members
    const member = teamMembers?.find((m: any) => m.userId === senderId);
    if (member) return `Staff - ${member.role}`;

    return 'Ekipi';
  };

  const isOwnMessage = (senderId: string) => senderId === user?.uid;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Duke ngarkuar chatin...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Support Chat</h1>
        <p className="text-muted-foreground mt-1">
          Komunikoni me ekipin tonë të suportit
        </p>
      </div>

      <Card className="flex flex-col" style={{ height: 'calc(100vh - 260px)' }}>
        <CardHeader className="pb-3 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Kanali Juaj i Suportit</CardTitle>
              <p className="text-xs text-muted-foreground">
                Mesazhet shfaqen në kohë reale
              </p>
            </div>
            <Badge variant="outline" className="ml-auto">
              {messages?.length || 0} mesazhe
            </Badge>
          </div>
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            <div ref={scrollRef} className="p-4 space-y-4">
              {!messages || messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium">Mirë se vini në Support Chat!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Shkruani mesazhin tuaj më poshtë për të filluar bisedën me ekipin tonë.
                  </p>
                </div>
              ) : (
                messages.map((msg: any) => {
                  const own = isOwnMessage(msg.senderId);
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${own ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                          own
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted rounded-bl-md'
                        }`}
                      >
                        {!own && (
                          <p className={`text-xs font-semibold mb-1 ${own ? 'text-primary-foreground/80' : 'text-foreground'}`}>
                            {getDisplayName(msg.senderId)}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        {msg.attachmentUrl && (
                          <a
                            href={msg.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-1.5 text-xs mt-2 underline ${
                              own ? 'text-primary-foreground/80' : 'text-primary'
                            }`}
                          >
                            <FileIcon className="h-3 w-3" />
                            Shiko bashkëngjitjen
                          </a>
                        )}
                        <p
                          className={`text-[10px] mt-1 ${
                            own ? 'text-primary-foreground/60' : 'text-muted-foreground'
                          }`}
                        >
                          {msg.createdAt instanceof Date
                            ? msg.createdAt.toLocaleString('sq-AL', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit',
                              })
                            : ''}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>

        {/* Message Input */}
        <div className="border-t p-4 flex-shrink-0">
          {showAttachmentInput && (
            <div className="flex items-center gap-2 mb-3">
              <Input
                placeholder="URL e bashkëngjitjes..."
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                className="flex-1"
              />
              <Button variant="ghost" size="icon" onClick={() => { setShowAttachmentInput(false); setAttachmentUrl(''); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowAttachmentInput(!showAttachmentInput)}
              className="flex-shrink-0"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              placeholder="Shkruani mesazhin tuaj..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!messageText.trim() && !attachmentUrl.trim()} className="flex-shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default PortalChatView;
