import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Bot, Send, MessageSquare } from 'lucide-react';

const WidgetPreview = ({ settings }) => {
  if (!settings) return null;

  const positionClasses = settings.position === 'bottom-right' 
    ? 'bottom-8 right-8' 
    : 'bottom-8 left-8';
  
  const themeColor = settings.theme_color || '#16a34a';

  return (
    <Card className="h-full flex flex-col min-h-[70vh] shadow-lg sticky top-8">
        <CardHeader>
            <h3 className="text-lg font-semibold">Live Widget Preview</h3>
            <p className="text-sm text-muted-foreground">See your changes in real-time.</p>
        </CardHeader>
        <CardContent className="flex-grow bg-muted/30 flex items-center justify-center p-4 relative overflow-hidden rounded-b-lg">
            {/* Mock website background */}
            <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]"></div>

            {/* The actual widget preview */}
            <div className={`absolute ${positionClasses} w-80 h-[28rem] bg-background rounded-xl shadow-2xl flex flex-col border transition-all duration-300`}>
                {/* Header */}
                <div 
                    className="flex items-center p-3 text-white rounded-t-xl"
                    style={{ backgroundColor: themeColor }}
                >
                    <div className="p-1.5 bg-white/30 rounded-full mr-3">
                        <Bot className="h-5 w-5" />
                    </div>
                    <h4 className="font-semibold text-sm">{settings.header_text || 'Chat with us'}</h4>
                </div>
                
                {/* Chat Body */}
                <div className="flex-grow p-4 space-y-3 overflow-y-auto">
                    {/* Welcome Message */}
                    <div className="flex items-start gap-2">
                        <div 
                            className="p-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: themeColor + '20' }} // 20 for ~12% opacity
                        >
                            <Bot className="h-4 w-4" style={{ color: themeColor }} />
                        </div>
                        <div className="bg-muted p-2.5 rounded-lg text-sm">
                            {settings.welcome_message || 'Hi! How can I help you today?'}
                        </div>
                    </div>
                    {/* Example User Message */}
                    <div className="flex justify-end">
                         <div className="bg-muted p-2.5 rounded-lg text-sm text-muted-foreground italic">
                            (User message appears here)
                        </div>
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-2 border-t flex items-center gap-2">
                    <input type="text" placeholder="Send a message..." className="flex-1 bg-transparent text-sm focus:outline-none px-2" readOnly/>
                    <button 
                        className="p-2 text-white rounded-md"
                        style={{ backgroundColor: themeColor }}
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </div>
            </div>

             {/* The Launcher Icon */}
            <div className={`absolute ${positionClasses} w-14 h-14 rounded-full flex items-center justify-center shadow-lg cursor-pointer`} style={{ backgroundColor: themeColor }}>
                <MessageSquare className="h-7 w-7 text-white" />
            </div>

        </CardContent>
    </Card>
  );
};

export default WidgetPreview;