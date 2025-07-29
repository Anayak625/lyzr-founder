import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Bot, User, Loader2, AlertCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';

const AgentPlayground = ({ agent }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const webSocket = useRef(null);
  const messagesEndRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!agent?.id) return;

    setConnectionStatus('connecting');
    setMessages([]);

    const sessionId = `playground_session_${agent.id}_${Date.now()}`;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${import.meta.env.VITE_REACT_APP_WEBSOCKET_HOST}/ws/chat/${agent.id}/${sessionId}/`;
    
    if (webSocket.current) webSocket.current.close();
    
    webSocket.current = new WebSocket(wsUrl);

    webSocket.current.onopen = () => {
      setConnectionStatus('open');
      setMessages([{
          id: 'init', 
          sender: 'AI', 
          content: `Hi there! I'm '${agent.name}'. Ask me anything to test my knowledge.`
      }]);
    };

    webSocket.current.onmessage = (event) => {
      setIsSending(false);
      const data = JSON.parse(event.data);
      if (data.event_type === 'new_message' && data.message.sender === 'AI') {
        setMessages(prev => [...prev, { ...data.message, feedback: null }]);
      } else if (data.event_type === 'feedback_confirmation') {
        setMessages(prev => prev.map(msg => 
            msg.id === data.message_id ? { ...msg, feedback: msg.feedback === 'processing' ? 'saved' : msg.feedback } : msg
        ));
      }
    };

    webSocket.current.onclose = () => setConnectionStatus('closed');
    webSocket.current.onerror = (err) => {
        console.error('WebSocket Error:', err);
        setConnectionStatus('closed');
    };

    return () => { if (webSocket.current) webSocket.current.close(); };
  }, [agent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || connectionStatus !== 'open' || isSending) return;
    
    setMessages(prev => [...prev, { id: `user_${Date.now()}`, sender: 'USER', content: inputValue }]);
    
    webSocket.current.send(JSON.stringify({ event_type: 'user_message', message: inputValue }));
    setIsSending(true);
    setInputValue('');
  };

  const handleFeedback = (messageId, feedbackType) => {
    // Optimistically update the UI to show feedback is being processed
    setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, feedback: 'processing' } : msg
    ));

    webSocket.current.send(JSON.stringify({
        event_type: 'feedback',
        message_id: messageId,
        feedback: feedbackType,
    }));

    toast({ title: 'Feedback Submitted!', description: 'Thank you for helping improve this agent.' });
  };

  return (
    <Card className="h-full flex flex-col min-h-[70vh] shadow-lg sticky top-8">
      <CardHeader>
        <CardTitle>Testing Playground</CardTitle>
        <CardDescription>Interact with your agent and provide feedback.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto p-4 space-y-4 bg-muted/20">
        {messages.map((msg, index) => (
          <div key={msg.id || index} className={`flex flex-col items-start gap-2 ${msg.sender === 'USER' ? 'items-end' : ''}`}>
            <div className={`flex items-start gap-3 w-full ${msg.sender === 'USER' ? 'justify-end' : ''}`}>
                {msg.sender === 'AI' && <div className="p-2 rounded-full bg-primary/10 flex-shrink-0 mt-1"><Bot className="h-5 w-5 text-primary" /></div>}
                <div className={`max-w-md p-3 rounded-lg text-sm break-words shadow-sm ${msg.sender === 'USER' ? 'bg-primary text-primary-foreground' : 'bg-background'}`}>
                  {msg.content}
                </div>
                {msg.sender === 'USER' && <div className="p-2 rounded-full bg-muted flex-shrink-0 mt-1"><User className="h-5 w-5" /></div>}
            </div>
            {/* Feedback Buttons for AI messages */}
            {msg.sender === 'AI' && msg.id !== 'init' && (
                <div className="flex gap-1 ml-12">
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        className={`h-7 w-7 ${msg.feedback === 'positive' || msg.feedback === 'saved' ? 'text-primary' : 'text-muted-foreground'}`}
                        onClick={() => handleFeedback(msg.id, 'positive')}
                        disabled={!!msg.feedback}
                    >
                        <ThumbsUp className="h-4 w-4" />
                    </Button>
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        className={`h-7 w-7 ${msg.feedback === 'negative' || msg.feedback === 'saved' ? 'text-destructive' : 'text-muted-foreground'}`}
                        onClick={() => handleFeedback(msg.id, 'negative')}
                        disabled={!!msg.feedback}
                    >
                        <ThumbsDown className="h-4 w-4" />
                    </Button>
                    {msg.feedback === 'processing' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
            )}
          </div>
        ))}
        {isSending && (
            <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-primary/10 flex-shrink-0"><Bot className="h-5 w-5 text-primary" /></div>
                <div className="max-w-md p-3 rounded-lg text-sm bg-background flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin" />
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>
      <div className="p-4 border-t">
        {/* ... (Connection status alerts remain the same) ... */}
        {connectionStatus === 'connecting' && <div className="flex justify-center text-sm items-center text-muted-foreground mb-2"><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Connecting...</div>}
        {connectionStatus === 'closed' && 
            <Alert variant="destructive" className="mb-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Connection Lost</AlertTitle>
                <AlertDescription>The agent is offline. Please refresh to reconnect.</AlertDescription>
            </Alert>
        }
        <div className="flex gap-2">
          <Input 
            value={inputValue} 
            onChange={(e) => setInputValue(e.target.value)} 
            onKeyPress={e => e.key === 'Enter' && handleSend()} 
            placeholder={connectionStatus !== 'open' ? "Agent is offline..." : "Ask your agent anything..."}
            disabled={connectionStatus !== 'open' || isSending}
          />
          <Button onClick={handleSend} disabled={connectionStatus !== 'open' || !inputValue.trim() || isSending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default AgentPlayground;