// src/components/AgentPlayground.jsx
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const AgentPlayground = ({ agent }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isConnecting, setIsConnecting] = useState(true);
  const webSocket = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!agent) return;

    setIsConnecting(true);
    setMessages([{ 
        id: 'init', 
        sender: 'AI', 
        content: agent.widget_settings?.welcomeMessage || `Hi! I'm ${agent.name}. How can I help you today?` 
    }]);

    const sessionId = `playground_session_${agent.id}_${Date.now()}`;
    const wsUrl = `${process.env.REACT_APP_WEBSOCKET_BASE_URL}/chat/${agent.id}/?${sessionId}`;
    
    webSocket.current = new WebSocket(wsUrl);

    webSocket.current.onopen = () => setIsConnecting(false);
    webSocket.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages(prev => [...prev, { id: `ai_${Date.now()}`, sender: data.sender, content: data.message }]);
    };
    webSocket.current.onclose = () => setIsConnecting(false);

    return () => webSocket.current.close();
  }, [agent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || isConnecting) return;
    const userMessage = { id: `user_${Date.now()}`, sender: 'USER', content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    
    webSocket.current.send(JSON.stringify({ event_type: 'user_message', message: inputValue }));
    setInputValue('');
  };

  if (!agent) {
    return (
        <div className="flex items-center justify-center h-[70vh]">
            <Alert>
                <AlertTitle>No Agent Selected</AlertTitle>
                <AlertDescription>Please create or select an agent to begin testing.</AlertDescription>
            </Alert>
        </div>
    );
  }

  return (
    <Card className="h-[70vh] flex flex-col">
      <CardHeader>
        <CardTitle>Testing Playground</CardTitle>
        <CardDescription>Interact with your agent '{agent.name}' in real-time.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'USER' ? 'justify-end' : ''}`}>
            {msg.sender === 'AI' && <div className="p-2 rounded-full bg-primary/10"><Bot className="h-5 w-5 text-primary" /></div>}
            <div className={`max-w-md p-3 rounded-lg ${msg.sender === 'USER' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              {msg.content}
            </div>
            {msg.sender === 'USER' && <div className="p-2 rounded-full bg-muted"><User className="h-5 w-5" /></div>}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </CardContent>
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input 
            value={inputValue} 
            onChange={(e) => setInputValue(e.target.value)} 
            onKeyPress={e => e.key === 'Enter' && handleSend()} 
            placeholder={isConnecting ? "Connecting to agent..." : "Test your agent..."}
            disabled={isConnecting}
          />
          <Button onClick={handleSend} disabled={isConnecting}>
            {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default AgentPlayground;