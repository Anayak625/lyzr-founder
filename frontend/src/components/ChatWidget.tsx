// src/components/ChatWidget.jsx
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, X, Send, ThumbsUp, ThumbsDown, Bot, Maximize2, Minimize2 } from 'lucide-react';

// This is your public agent ID from your database.
// In a real multi-agent app, you'd get this dynamically.
const AGENT_ID = 'YOUR_AGENT_ID_HERE'; // <-- IMPORTANT: Replace with a real Agent UUID

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [agentConfig, setAgentConfig] = useState(null);
  const webSocket = useRef(null);
  const messagesEndRef = useRef(null);

  // Effect to fetch agent config when widget is first opened
  useEffect(() => {
    if (isOpen && !agentConfig) {
      fetch(`${import.meta.env.VITE_REACT_APP_API_BASE_URL}/public/agent-config/${AGENT_ID}/`)
        .then(res => res.json())
        .then(data => {
          setAgentConfig(data);
          // Set initial welcome message from config
          setMessages([{
            id: 'initial',
            content: data.widget_settings?.welcomeMessage || 'Hello! How can I help you today?',
            sender: 'AI',
          }]);
        })
        .catch(err => console.error("Failed to fetch agent config:", err));
    }
  }, [isOpen, agentConfig]);

  // Effect for WebSocket connection management
  useEffect(() => {
    if (!isOpen || !agentConfig) return;

    // A unique ID for the end-user session
    let sessionId = localStorage.getItem('lyzr_chat_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('lyzr_chat_session_id', sessionId);
    }
    
    const wsUrl = `${import.meta.env.VITE_REACT_APP_WEBSOCKET_BASE_URL}/chat/${AGENT_ID}/?${sessionId}`;
    webSocket.current = new WebSocket(wsUrl);

    webSocket.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'chat_message') {
        setMessages(prev => [...prev, {
          id: data.message_id || `ai_${Date.now()}`,
          content: data.message,
          sender: data.sender
        }]);
      } else if (data.type === 'feedback_confirmation') {
        // Find the message and show confirmation
        setMessages(prev => prev.map(msg =>
          msg.id === data.message_id ? { ...msg, feedbackSubmitted: true } : msg
        ));
      }
    };

    webSocket.current.onclose = () => console.log('WebSocket disconnected');
    webSocket.current.onerror = (error) => console.error('WebSocket error:', error);

    // Cleanup on component unmount or when widget is closed
    return () => {
      if (webSocket.current) {
        webSocket.current.close();
      }
    };
  }, [isOpen, agentConfig]);

  // Effect to scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const sendMessage = (content) => {
    if (webSocket.current?.readyState === WebSocket.OPEN) {
      webSocket.current.send(JSON.stringify({
        event_type: 'user_message',
        message: content,
      }));
    }
  };

  const sendFeedback = (messageId, feedback) => {
    if (webSocket.current?.readyState === WebSocket.OPEN) {
      setMessages(prev => prev.map(msg =>
        msg.id === messageId ? { ...msg, feedbackSent: feedback } : msg
      ));
      webSocket.current.send(JSON.stringify({
        event_type: 'feedback',
        message_id: messageId,
        feedback: feedback, // 'positive' or 'negative'
      }));
    }
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const userMessage = {
      id: `user_${Date.now()}`,
      content: inputValue,
      sender: 'USER',
    };
    setMessages(prev => [...prev, userMessage]);
    sendMessage(inputValue);
    setInputValue('');
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full shadow-glow"
          variant="gradient"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className={`shadow-elegant border-0 bg-gradient-card backdrop-blur-sm transition-all duration-300 ${isMinimized ? 'w-80 h-16' : 'w-80 md:w-96 h-[500px] md:h-[600px]'}`}>
        <div className="flex items-center justify-between p-4 border-b border-primary/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-sm">{agentConfig?.name || 'Support'}</h3>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-muted-foreground">Online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => setIsMinimized(!isMinimized)}>
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <div className="flex flex-col h-[calc(100%-65px)]">
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {messages.map((message) => (
                <div key={message.id}>
                  <div className={`flex ${message.sender === 'USER' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-lg text-sm ${message.sender === 'USER' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {message.content}
                    </div>
                  </div>
                  {message.sender === 'AI' && message.id !== 'initial' && (
                    <div className="flex justify-start pt-1">
                      {message.feedbackSubmitted ? (
                        <Badge variant="outline" className="text-xs">Thank you for your feedback!</Badge>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => sendFeedback(message.id, 'positive')} disabled={message.feedbackSent}>
                            <ThumbsUp className={`h-3 w-3 ${message.feedbackSent === 'positive' ? 'text-primary' : ''}`} />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => sendFeedback(message.id, 'negative')} disabled={message.feedbackSent}>
                            <ThumbsDown className={`h-3 w-3 ${message.feedbackSent === 'negative' ? 'text-destructive' : ''}`} />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-primary/10">
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  className="flex-1"
                />
                <Button size="icon" variant="gradient" onClick={handleSend} disabled={!inputValue.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ChatWidget;