import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Send, Bot, User, Loader2, AlertCircle, ThumbsUp, ThumbsDown, RefreshCcw, X, MessageSquare, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_WIDGET_SETTINGS = {
    theme_color: '#16a34a',
    header_text: 'Chat with an AI Assistant',
    welcome_message: 'Hello! How can I help you today?',
    bot_avatar_url: '',
    launcher_icon: 'MessageSquare',
};

const launcherIcons = {
  MessageSquare: (props) => <MessageSquare {...props} />,
  Bot: (props) => <Bot {...props} />,
  Sparkles: (props) => <Sparkles {...props} />,
};

const AgentPlayground = ({ agent, initialExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [sessionId, setSessionId] = useState(null);
  const webSocket = useRef(null);
  const messagesEndRef = useRef(null);
  const { toast } = useToast();

  const settings = { ...DEFAULT_WIDGET_SETTINGS, ...(agent?.widget_settings || {}) };
  const themeColor = settings.theme_color;
  const LauncherIcon = launcherIcons[settings.launcher_icon] || launcherIcons.MessageSquare;

  const getOrCreateSessionId = useCallback((agentId) => {
    const storageKey = `lyzr_playground_session_${agentId}`;
    let storedSessionId = localStorage.getItem(storageKey);
    if (!storedSessionId) {
      storedSessionId = uuidv4();
      localStorage.setItem(storageKey, storedSessionId);
    }
    return storedSessionId;
  }, []);

  const handleNewSession = () => {
    if (!agent?.id) return;
    const storageKey = `lyzr_playground_session_${agent.id}`;
    localStorage.removeItem(storageKey);
    setMessages([]);
    setSessionId(getOrCreateSessionId(agent.id));
    toast({ title: "New Session Started", description: "Your conversation history has been cleared." });
  };
  
  useEffect(() => {
    if (!agent?.id || !isExpanded) return;
    if (!sessionId) {
      setSessionId(getOrCreateSessionId(agent.id));
      return;
    }
    setConnectionStatus('connecting');
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${import.meta.env.VITE_REACT_APP_WEBSOCKET_HOST}/ws/chat/${agent.id}/${sessionId}/`;
    if (webSocket.current) webSocket.current.close();
    webSocket.current = new WebSocket(wsUrl);
    webSocket.current.onopen = () => setConnectionStatus('open');
    webSocket.current.onmessage = (event) => {
      setIsSending(false);
      const data = JSON.parse(event.data);
      if (data.event_type === 'new_message') {
        const newMessage = data.message;
        setMessages(prev => {
          if (newMessage.sender === 'USER') {
            const newMsgList = [...prev];
            const optimisticMsgIndex = newMsgList.findLastIndex(m => m.id.startsWith('user_'));
            if (optimisticMsgIndex !== -1) { newMsgList[optimisticMsgIndex] = newMessage; return newMsgList; }
          }
          if (prev.find(m => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
      } else if (data.event_type === 'feedback_confirmation') {
        setMessages(prev => prev.map(msg => msg.id === data.message_id ? { ...msg, feedback: msg.pendingFeedback } : msg));
      }
    };
    webSocket.current.onclose = () => setConnectionStatus('closed');
    webSocket.current.onerror = (err) => {
      console.error('WebSocket Error:', err);
      setConnectionStatus('closed');
      toast({ title: "Connection Error", description: "Could not connect to the agent. Please refresh.", variant: "destructive"});
    };
    return () => { if (webSocket.current) webSocket.current.close(); };
  }, [agent, sessionId, isExpanded, getOrCreateSessionId, toast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || connectionStatus !== 'open' || isSending) return;
    const userMessage = { id: `user_${Date.now()}`, sender: 'USER', content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    webSocket.current.send(JSON.stringify({ event_type: 'user_message', message: inputValue }));
    setIsSending(true);
    setInputValue('');
  };

  const handleFeedback = (messageId, feedbackType) => {
    setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, feedback: 'processing', pendingFeedback: feedbackType } : msg));
    webSocket.current.send(JSON.stringify({ event_type: 'feedback', message_id: messageId, feedback: feedbackType }));
    toast({ title: 'Feedback Submitted!', description: 'Thank you for helping improve this agent.' });
  };

  const displayedMessages = messages.length > 0 ? messages : [{ id: 'init', sender: 'AI', content: settings.welcome_message }];

  return (
    <div className="w-full h-full relative">

      <div className={`w-full h-full flex flex-col bg-background rounded-2xl shadow-2xl border overflow-hidden transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} style={isExpanded ? {} : { height: '0px' } }>
        <div 
          className="p-4 text-white flex items-center justify-between rounded-t-lg flex-shrink-0"
          style={{ backgroundColor: themeColor }}
        >
          <div className="flex items-center gap-3">
            {settings.bot_avatar_url ? (<img src={settings.bot_avatar_url} alt="Bot Avatar" className="w-8 h-8 rounded-full bg-white/30 object-cover"/>) : (<div className="p-1.5 bg-white/30 rounded-full"><Bot className="h-5 w-5" /></div>)}
            <h3 className="font-semibold text-sm">{settings.header_text}</h3>
          </div>
          <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleNewSession} title="Start New Session" className="text-white/80 hover:text-white hover:bg-white/20 h-8 w-8"><RefreshCcw className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setIsExpanded(false)} title="Minimize Chat" className="text-white/80 hover:text-white hover:bg-white/20 h-8 w-8"><X className="h-5 w-5" /></Button>
          </div>
        </div>
        
        <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-muted/20">
            {displayedMessages.map((msg) => (<div key={msg.id} className={`flex flex-col items-start gap-2 ${msg.sender === 'USER' ? 'items-end' : ''}`}><div className={`flex items-start gap-3 w-full ${msg.sender === 'USER' ? 'justify-end' : ''}`}>{msg.sender === 'AI' && (<div className="flex-shrink-0 mt-1">{settings.bot_avatar_url ? (<img src={settings.bot_avatar_url} alt="Bot Avatar" className="w-8 h-8 rounded-full object-cover" />) : (<div className="p-2 rounded-full flex items-center justify-center" style={{ backgroundColor: themeColor + '20' }}><Bot className="h-5 w-5" style={{ color: themeColor }} /></div>)}</div>)}<div className={`max-w-md p-3 rounded-lg text-sm break-words shadow-sm ${msg.sender === 'USER' ? 'text-primary-foreground' : 'bg-background'}`} style={msg.sender === 'USER' ? { backgroundColor: themeColor } : {}}>{msg.content}</div>{msg.sender === 'USER' && <div className="p-2 rounded-full bg-muted flex-shrink-0 mt-1"><User className="h-5 w-5" /></div>}</div>{msg.sender === 'AI' && msg.id !== 'init' && (<div className="flex gap-1 ml-12"><Button size="icon" variant="ghost" className={`h-7 w-7 ${msg.feedback === 'POSITIVE' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => handleFeedback(msg.id, 'POSITIVE')} disabled={!!msg.feedback}><ThumbsUp className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className={`h-7 w-7 ${msg.feedback === 'NEGATIVE' ? 'text-destructive' : 'text-muted-foreground'}`} onClick={() => handleFeedback(msg.id, 'NEGATIVE')} disabled={!!msg.feedback}><ThumbsDown className="h-4 w-4" /></Button></div>)}</div>))}
            {isSending && !messages.find(m => m.id.startsWith('user_')) && ( <div className="flex items-start gap-3"><div className="p-2 rounded-full bg-primary/10 flex-shrink-0"><Bot className="h-5 w-5 text-primary" /></div><div className="max-w-md p-3 rounded-lg text-sm bg-background flex items-center"><Loader2 className="h-4 w-4 animate-spin" /></div></div>)}
            <div ref={messagesEndRef} />
        </div>
        
        <div className="p-4 border-t rounded-b-lg">
          {connectionStatus === 'connecting' && <div className="flex justify-center text-sm items-center text-muted-foreground mb-2"><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Connecting...</div>}
          {connectionStatus === 'closed' && <Alert variant="destructive" className="mb-2"><AlertCircle className="h-4 w-4" /><AlertTitle>Connection Lost</AlertTitle><AlertDescription>Please refresh to reconnect.</AlertDescription></Alert>}
          <div className="flex gap-2">
            <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSend()} placeholder={connectionStatus !== 'open' ? "Agent is offline..." : "Ask your agent anything..."} disabled={connectionStatus !== 'open' || isSending}/>
            <Button onClick={handleSend} disabled={connectionStatus !== 'open' || !inputValue.trim() || isSending} style={{ backgroundColor: themeColor, color: 'white' }}><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
      
      <div className={`absolute bottom-0 right-0 transition-opacity duration-300 ${!isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <Button
            onClick={() => setIsExpanded(true)}
            className="w-16 h-16 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
            style={{ backgroundColor: themeColor }}
          >
            <LauncherIcon className="w-8 h-8 text-white" />
          </Button>
      </div>

    </div>
  );
};

export default AgentPlayground;