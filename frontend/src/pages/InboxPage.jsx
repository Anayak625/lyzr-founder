// src/pages/InboxPage.jsx

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchUnticketedConversations } from '@/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MailQuestion, Inbox, Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import CreateTicketDialog from '@/components/tickets/CreateTicketDialog';

const InboxPage = () => {
  const [selectedConvo, setSelectedConvo] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['unticketedConversations'],
    queryFn: fetchUnticketedConversations,
  });

  const conversations = data?.results || [];

  return (
    <div className="space-y-6 h-[calc(100vh-4rem)] flex flex-col">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-3xl font-bold flex items-center gap-2"><MailQuestion /> Triage Inbox</CardTitle>
        <CardDescription>Review conversations and escalate them to tickets when necessary.</CardDescription>
      </CardHeader>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1"><Skeleton className="md:col-span-1 h-full" /><Skeleton className="md:col-span-2 h-full" /></div>
      ) : error ? (
        <div className="p-8 text-center text-destructive">Error loading inbox.</div>
      ) : conversations.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground"><Inbox className="mx-auto h-12 w-12" /><h3 className="mt-4 text-lg font-medium">Inbox Zero!</h3><p>No conversations are currently awaiting review.</p></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 overflow-hidden">
          {/* Conversation List */}
          <Card className="md:col-span-1 flex flex-col">
            <CardContent className="p-2 flex-1 overflow-y-auto">
              <div className="space-y-1">
                {conversations.map((convo) => (
                  <button
                    key={convo.id}
                    onClick={() => setSelectedConvo(convo)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg hover:bg-muted transition-colors flex flex-col items-start",
                      selectedConvo?.id === convo.id && "bg-muted"
                    )}
                  >
                    <p className="text-sm font-semibold truncate">Chat with {convo.end_user_id.substring(0,8)}...</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(convo.updated_at).toLocaleString()}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Conversation Detail View */}
          <Card className="md:col-span-2 flex flex-col">
            {selectedConvo ? (
              <>
                <CardHeader className="flex flex-row items-center justify-between border-b">
                    <div>
                        <CardTitle>Conversation Details</CardTitle>
                        <CardDescription>Review the full chat history before taking action.</CardDescription>
                    </div>
                    <CreateTicketDialog conversationId={selectedConvo.id} />
                </CardHeader>
                <CardContent className="p-4 space-y-4 flex-1 overflow-y-auto">
                   {selectedConvo.messages.map(msg => (
                        <div key={msg.id} className={`flex items-start gap-3 ${msg.sender_type === 'USER' ? 'justify-end' : ''}`}>
                            {msg.sender_type === 'AI' && <div className="p-2 rounded-full bg-primary/10 flex-shrink-0"><Bot className="h-5 w-5 text-primary" /></div>}
                            <div className={`max-w-xl p-3 rounded-lg shadow-sm ${msg.sender_type === 'USER' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                <p className="text-xs text-right mt-2 opacity-70">{new Date(msg.created_at).toLocaleString()}</p>
                            </div>
                            {msg.sender_type === 'USER' && <div className="p-2 rounded-full bg-muted flex-shrink-0"><User className="h-5 w-5" /></div>}
                        </div>
                    ))}
                </CardContent>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <p>Select a conversation to view its details</p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default InboxPage;