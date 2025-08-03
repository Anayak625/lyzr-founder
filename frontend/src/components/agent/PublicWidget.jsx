import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Loader2, LifeBuoy, Ticket, RefreshCcw, X, MessageSquare, Sparkles } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const DEFAULT_WIDGET_SETTINGS = {
  theme_color: "#16a34a",
  header_text: "Chat with an AI Assistant",
  welcome_message: "Hello! How can I help you today?",
  launcher_icon: "MessageSquare",
};

const ESCALATION_PHRASE = "connect you with a support team member";
const isEscalationMessage = (content) => typeof content === "string" && content.includes(ESCALATION_PHRASE);
const launcherIcons = { MessageSquare, Bot, Sparkles };

const PublicWidget = ({ agentConfig }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [sessionId, setSessionId] = useState(null);
  const [isTicketCreated, setIsTicketCreated] = useState(false);
  const webSocket = useRef(null);
  const messagesEndRef = useRef(null);

  const settings = { ...DEFAULT_WIDGET_SETTINGS, ...(agentConfig?.widget_settings || {}) };
  const themeColor = settings.theme_color;
  const LauncherIcon = launcherIcons[settings.launcher_icon] || launcherIcons.MessageSquare;

  const getOrCreateSessionId = useCallback((agentId) => {
    const storageKey = `lyzr_widget_session_${agentId}`;
    let storedSessionId = localStorage.getItem(storageKey);
    if (!storedSessionId) {
      storedSessionId = uuidv4();
      localStorage.setItem(storageKey, storedSessionId);
    }
    return storedSessionId;
  }, []);

  useEffect(() => {
    if (agentConfig?.id) {
        setSessionId(getOrCreateSessionId(agentConfig.id));
    }
  }, [agentConfig, getOrCreateSessionId]);

  useEffect(() => {
    if (!isExpanded || !sessionId || !agentConfig?.id) return;
    
    const getChatWebSocketURL = (agentId, sessionId) => {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = import.meta.env.VITE_APP_WS_URL || "127.0.0.1:8000";
        return `${protocol}//${host}/ws/chat/${agentId}/${sessionId}/`;
    };

    const wsUrl = getChatWebSocketURL(agentConfig.id, sessionId);
    webSocket.current = new WebSocket(wsUrl);
    setConnectionStatus("connecting");

    webSocket.current.onopen = () => setConnectionStatus("open");
    webSocket.current.onclose = () => setConnectionStatus("closed");
    webSocket.current.onerror = (err) => console.error("Lyzr Widget WS Error:", err);
    webSocket.current.onmessage = (event) => {
        setIsSending(false);
        const data = JSON.parse(event.data);
        if (data.event_type === "new_message") {
            const newMessage = data.message;
            if (newMessage.sender === "SYSTEM" && newMessage.content.includes("support ticket")) {
                setIsTicketCreated(true);
            }
            setMessages((prev) => [...prev, newMessage]);
        }
    };

    return () => {
        if (webSocket.current) webSocket.current.close();
    };
  }, [isExpanded, sessionId, agentConfig]);

  const handleSend = () => {
    if (!inputValue.trim() || connectionStatus !== "open" || isSending) return;
    setMessages((prev) => [...prev, { id: `user_${uuidv4()}`, sender: "USER", content: inputValue }]);
    webSocket.current.send(JSON.stringify({ event_type: "user_message", message: inputValue }));
    setIsSending(true);
    setInputValue("");
  };

  const handleNewSession = () => {
    if (!agentConfig?.id) return;
    if (webSocket.current) webSocket.current.close();
    localStorage.removeItem(`lyzr_widget_session_${agentConfig.id}`);
    setMessages([]);
    setIsTicketCreated(false);
    setSessionId(getOrCreateSessionId(agentConfig.id));
  };
  
  const handleEscalate = () => {
    if (connectionStatus !== "open" || isTicketCreated) return;
    webSocket.current.send(JSON.stringify({ event_type: "escalate_to_ticket" }));
  };
  
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  
  const displayedMessages = messages.length > 0 ? messages : [{ id: "init", sender: "AI", content: settings.welcome_message }];

  return (
    <div className="fixed bottom-4 right-4 z-[99999]">
      {isExpanded && (
        <div className="w-80 h-[450px] flex flex-col bg-white rounded-lg shadow-xl border">
            <div className="p-3 text-white flex items-center justify-between rounded-t-lg" style={{ backgroundColor: themeColor }}>
                <h3 className="font-semibold text-sm">{agentConfig?.name || settings.header_text}</h3>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={handleEscalate} title="Request Support" disabled={isTicketCreated} className="text-white/80 h-7 w-7"><LifeBuoy className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={handleNewSession} title="New Session" className="text-white/80 h-7 w-7"><RefreshCcw className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setIsExpanded(false)} title="Close" className="text-white/80 h-7 w-7"><X className="h-4 w-4" /></Button>
                </div>
            </div>
            <div className="flex-grow overflow-y-auto p-3 space-y-4">
                {displayedMessages.map((msg, index) => (
                    <div key={msg.id || index} className={`flex items-start gap-2.5 ${msg.sender === "USER" ? "justify-end" : ""}`}>
                        {msg.sender !== "USER" && <div className="p-2 rounded-full" style={{ backgroundColor: themeColor + "20" }}><Bot className="h-5 w-5" style={{ color: themeColor }} /></div>}
                        <div className={`max-w-[80%] p-2.5 rounded-lg text-sm ${msg.sender === "USER" ? "bg-primary text-primary-foreground" : "bg-muted"}`} style={msg.sender === "USER" ? { backgroundColor: themeColor } : {}}>
                            {isEscalationMessage(msg.content) && !isTicketCreated ? (
                                <div><p className="mb-2">{msg.content}</p><Button onClick={handleEscalate} size="sm" className="w-full"><Ticket className="mr-2 h-4 w-4" />Create Ticket</Button></div>
                            ) : msg.sender === 'SYSTEM' ? (
                                <p className="italic text-muted-foreground">{msg.content}</p>
                            ) : (
                                <ReactMarkdown className="prose prose-sm max-w-none break-words">{msg.content}</ReactMarkdown>
                            )}
                        </div>
                        {msg.sender === "USER" && <div className="p-2 rounded-full bg-muted"><User className="h-5 w-5" /></div>}
                    </div>
                ))}
                {isSending && <div className="flex items-start gap-2.5"><div className="p-2 rounded-full" style={{ backgroundColor: themeColor + "20" }}><Bot className="h-5 w-5" style={{ color: themeColor }} /></div><div className="p-2.5 rounded-lg bg-muted"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div></div>}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t">
                {connectionStatus !== "open" && <p className="text-xs text-center text-muted-foreground mb-2">Connecting...</p>}
                <div className="flex gap-2">
                    <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyPress={(e) => e.key === "Enter" && handleSend()} placeholder="Type a message..." disabled={connectionStatus !== "open" || isSending} />
                    <Button onClick={handleSend} disabled={connectionStatus !== "open" || !inputValue.trim() || isSending} style={{ backgroundColor: themeColor }}><Send className="h-4 w-4 text-white" /></Button>
                </div>
            </div>
        </div>
      )}
      {!isExpanded && (
        <Button onClick={() => setIsExpanded(true)} className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center" style={{ backgroundColor: themeColor }}>
            <LauncherIcon className="w-8 h-8 text-white" />
        </Button>
      )}
    </div>
  );
};

export default PublicWidget;