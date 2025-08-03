import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Send,
  Bot,
  User,
  Loader2,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  RefreshCcw,
  X,
  MessageSquare,
  Sparkles,
  LifeBuoy,
  Ticket,  
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetchAgentStatus } from "@/api";

const DEFAULT_WIDGET_SETTINGS = {
  theme_color: "#16a34a",
  header_text: "Chat with an AI Assistant",
  welcome_message: "Hello! How can I help you today?",
  bot_avatar_url: "",
  launcher_icon: "MessageSquare",
};

const ESCALATION_PHRASE = "connect you with a support team member";
const isEscalationMessage = (content) => {
  return typeof content === "string" && content.includes(ESCALATION_PHRASE);
};
const launcherIcons = {
  MessageSquare: (props) => <MessageSquare {...props} />,
  Bot: (props) => <Bot {...props} />,
  Sparkles: (props) => <Sparkles {...props} />,
};

const AgentPlayground = ({ agent, initialExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("pending_setup");
  const [sessionId, setSessionId] = useState(null);
  const [isTicketCreated, setIsTicketCreated] = useState(false);
  const webSocket = useRef(null);
  const messagesEndRef = useRef(null);
  const { toast } = useToast();

   const { data: agentStatus, isError: isStatusError } = useQuery({
    queryKey: ['agentStatus', agent?.id],
    queryFn: () => fetchAgentStatus(agent.id),
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.is_ready ? false : 3000;
    },
    enabled: !!agent?.id && isExpanded,
    refetchOnWindowFocus: false,
  });

  const settings = {
    ...DEFAULT_WIDGET_SETTINGS,
    ...(agent?.widget_settings || {}),
  };
  const themeColor = settings.theme_color;
  const LauncherIcon =
    launcherIcons[settings.launcher_icon] || launcherIcons.MessageSquare;

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
    if (webSocket.current) {
        webSocket.current.close();
    }
    const storageKey = `lyzr_playground_session_${agent.id}`;
    localStorage.removeItem(storageKey);
    setMessages([]);
    setIsTicketCreated(false);
    setSessionId(getOrCreateSessionId(agent.id)); // This will trigger the useEffect to reconnect
    setConnectionStatus('pending_setup');
    toast({
      title: "New Session Started",
      description: "Your conversation history has been cleared.",
    });
  };

  useEffect(() => {
    if (!isExpanded || !agent?.id) {
      return;
    }

    if (!agentStatus?.is_ready) {
      setConnectionStatus("pending_setup");
      return;
    }

    // Agent is ready, proceed with connection logic
    if (!sessionId) {
      setSessionId(getOrCreateSessionId(agent.id));
      return;
    }
    
    // Prevent reconnection if already open
    if (webSocket.current && webSocket.current.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus("connecting");
    const getChatWebSocketURL = (agentId, sessionId) => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = import.meta.env.VITE_APP_WS_URL || "127.0.0.1:8000"; // Fallback for safety
      return `${protocol}//${host}/ws/chat/${agentId}/${sessionId}/`;
    };

    const wsUrl = getChatWebSocketURL(agent.id, sessionId);
    webSocket.current = new WebSocket(wsUrl);

    webSocket.current.onopen = () => {
      setConnectionStatus("open");
    };
    
    webSocket.current.onmessage = (event) => {
      setIsSending(false);
      const data = JSON.parse(event.data);
      if (data.event_type === "new_message" || data.event_type === "ticket_created") {
        const newMessage = data.message;
        if (newMessage.sender === "SYSTEM" && newMessage.content.includes("support ticket")) {
          setIsTicketCreated(true);
        }
        setMessages((prev) => {
          if (prev.find((m) => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
      } else if (data.event_type === "feedback_confirmation") {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.message_id ? { ...msg, feedback: msg.pendingFeedback } : msg
          )
        );
      }
    };

    webSocket.current.onerror = (err) => {
      console.error("WebSocket Error:", err);
      // The onclose event will handle the state change
    };

    webSocket.current.onclose = () => {
      setConnectionStatus("closed");
    };

    return () => {
      if (webSocket.current) {
        webSocket.current.close();
      }
    };
  }, [agentStatus, agent?.id, isExpanded, sessionId, getOrCreateSessionId]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || connectionStatus !== "open" || isSending) return;
    const optimisticId = `user_${uuidv4()}`;
    const userMessage = {
      id: optimisticId,
      sender: "USER",
      content: inputValue,
    };
    setMessages((prev) => [...prev, userMessage]);
    webSocket.current.send(
      JSON.stringify({ event_type: "user_message", message: inputValue })
    );
    setIsSending(true);
    setInputValue("");
  };

  const handleEscalate = () => {
    if (connectionStatus !== "open" || isTicketCreated) return;
    webSocket.current.send(
      JSON.stringify({ event_type: "escalate_to_ticket" })
    );
  };

  const handleFeedback = (messageId, feedbackType) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, feedback: "processing", pendingFeedback: feedbackType }
          : msg
      )
    );
    webSocket.current.send(
      JSON.stringify({
        event_type: "feedback",
        message_id: messageId,
        feedback: feedbackType,
      })
    );
    toast({
      title: "Feedback Submitted!",
      description: "Thank you for helping improve this agent.",
    });
  };

  const displayedMessages =
    messages.length > 0
      ? messages
      : [{ id: "init", sender: "AI", content: settings.welcome_message }];

  return (
    <div className="w-full h-full relative">
      <div
        className={`w-full h-full flex flex-col bg-background rounded-2xl shadow-2xl border overflow-hidden transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        style={isExpanded ? { height: "600px" } : { height: "0px" }}
      >
        <div
          className="p-4 text-white flex items-center justify-between rounded-t-lg flex-shrink-0"
          style={{ backgroundColor: themeColor }}
        >
          <div className="flex items-center gap-3">
            {settings.bot_avatar_url ? (
              <img src={settings.bot_avatar_url} alt="Bot Avatar" className="w-8 h-8 rounded-full bg-white/30 object-cover" />
            ) : (
              <div className="p-1.5 bg-white/30 rounded-full"><Bot className="h-5 w-5" /></div>
            )}
            <h3 className="font-semibold text-sm">{settings.header_text}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleEscalate} title="Request Support" className="text-white/80 hover:text-white hover:bg-white/20 h-8 w-8" disabled={isTicketCreated}>
              <LifeBuoy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNewSession} title="Start New Session" className="text-white/80 hover:text-white hover:bg-white/20 h-8 w-8">
              <RefreshCcw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsExpanded(false)} title="Minimize Chat" className="text-white/80 hover:text-white hover:bg-white/20 h-8 w-8">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-white">
          {displayedMessages.map((msg, index) => (
            <div key={msg.id || index} className={`flex flex-col items-start gap-2 ${msg.sender === "USER" ? "items-end" : ""}`}>
              <div className={`flex items-start gap-3 w-full ${msg.sender === "USER" ? "justify-end" : ""}`}>
                {msg.sender === "AI" && (
                  <div className="flex-shrink-0 mt-1">
                    {settings.bot_avatar_url ? (
                      <img src={settings.bot_avatar_url} alt="Bot Avatar" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="p-2 rounded-full flex items-center justify-center" style={{ backgroundColor: themeColor + "20" }}>
                        <Bot className="h-5 w-5" style={{ color: themeColor }} />
                      </div>
                    )}
                  </div>
                )}
                <div
                  className={`max-w-md p-3 rounded-lg text-sm break-words shadow-sm ${msg.sender === "USER" ? "text-primary-foreground user-msg-box" : "bg-background"}`}
                  style={msg.sender === "USER" ? { backgroundColor: themeColor } : {}}
                >
                  {isEscalationMessage(msg.content) && !isTicketCreated ? (
                    <div>
                      <p className="mb-3">{msg.content}</p>
                      <Button onClick={handleEscalate} className="w-full">
                        <Ticket className="mr-2 h-4 w-4" /> Create Support Ticket
                      </Button>
                    </div>
                  ) : msg.sender === 'SYSTEM' ? (
                    <p className="italic text-muted-foreground">{msg.content}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown></div>
                  )}
                </div>
                {msg.sender === "USER" && (
                  <div className="p-2 rounded-full bg-muted flex-shrink-0 mt-1"><User className="h-5 w-5" /></div>
                )}
              </div>
              {msg.sender === "AI" && msg.id !== "init" && (
                <div className="flex gap-1 ml-12">
                  <Button size="icon" variant="ghost" className={`h-7 w-7 ${msg.feedback === "POSITIVE" ? "text-primary" : "text-muted-foreground"}`} onClick={() => handleFeedback(msg.id, "POSITIVE")} disabled={!!msg.feedback}>
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className={`h-7 w-7 ${msg.feedback === "NEGATIVE" ? "text-destructive" : "text-muted-foreground"}`} onClick={() => handleFeedback(msg.id, "NEGATIVE")} disabled={!!msg.feedback}>
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
          {isSending && (
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div className="max-w-md p-3 rounded-lg text-sm bg-background flex items-center bot-msg-box">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 border-t bg-white rounded-b-lg">
          {connectionStatus === "pending_setup" && (
            <div className="flex justify-center text-sm items-center text-muted-foreground mb-2">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up your agent, please wait...
            </div>
          )}
          {connectionStatus === "connecting" && (
             <div className="flex justify-center text-sm items-center text-muted-foreground mb-2">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting to agent...
            </div>
          )}
          {connectionStatus === "closed" && (
             <Alert variant="destructive" className="mb-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Connection Lost</AlertTitle>
              <AlertDescription>The connection to the agent was lost. Please try starting a new session.</AlertDescription>
            </Alert>
          )}
          {isStatusError && (
             <Alert variant="destructive" className="mb-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>Could not verify agent status.</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder={
                connectionStatus === 'open' 
                  ? "Ask me anything or /raise_ticket..." 
                  : "Agent is getting ready..."
              }
              disabled={connectionStatus !== "open" || isSending}
            />
            <Button
              onClick={handleSend}
              disabled={connectionStatus !== "open" || !inputValue.trim() || isSending}
              style={{ backgroundColor: themeColor, color: "white" }}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <div className={`absolute bottom-0 right-0 transition-opacity duration-300 ${!isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <Button onClick={() => setIsExpanded(true)} className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110" style={{ backgroundColor: themeColor }}>
          <LauncherIcon className="w-8 h-8 text-white" />
        </Button>
      </div>
      <style>{`
          .user-msg-box p { color: white !important; }
          .user-msg-box { border-radius:8px !important; }
          .bot-msg-box { border-radius:8px !important; }
          .input-button-box button, .input-button-box input { border-radius:8px !important; }
      `}</style>
    </div>
  );
};

export default AgentPlayground;