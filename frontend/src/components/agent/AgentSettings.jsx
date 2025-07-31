import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActiveAgent } from '@/contexts/ActiveAgentProvider';
import { updateAgent, deleteAgent } from '@/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from "@/components/ui/switch";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Bot, Save, Loader2, Copy, Trash2, Info, Palette,
    Settings, Brain, MessageSquare, Code, Database,
    Eye, EyeOff, ChevronRight, Sparkles, Zap, Cross,
    Power,
    Send,
    X,
    SwitchCamera,
} from 'lucide-react';
import KnowledgeBaseManager from './KnowledgeBaseManager';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from '../ui/skeleton';
import { Progress } from "@/components/ui/progress";
import AgentPlayground from './AgentPlayground';

const DEFAULT_WIDGET_SETTINGS = {
    theme_color: '#16a34a',
    position: 'bottom-right',
    header_text: 'Chat with our AI Assistant',
    welcome_message: 'Hello! How can I help you today?',
    launcher_icon: 'MessageSquare',
    bot_avatar_url: '',
    show_branding: true,
    initial_prompts: ['What are your features?', 'How much does it cost?'],
};
const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
};
const launcherIcons = {
    MessageSquare: (props) => <MessageSquare {...props} />,
    Bot: (props) => <Bot {...props} />,
    Sparkles: (props) => <Sparkles {...props} />,
};


// Configuration Steps Progress
const ConfigurationProgress = ({ activeTab }) => {
    const steps = [
        { id: 'identity', label: 'Identity', icon: Bot },
        { id: 'behavior', label: 'Behavior', icon: Brain },
        { id: 'model', label: 'Model', icon: Zap },
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'knowledge', label: 'Knowledge', icon: Database },
        { id: 'deploy', label: 'Deploy', icon: Code }
    ];

    const currentIndex = steps.findIndex(step => step.id === activeTab);
    const progress = ((currentIndex + 1) / steps.length) * 100;

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Agent Configuration</h2>
                <Badge variant="secondary" className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {currentIndex + 1} of {steps.length}
                </Badge>
            </div>
            <Progress value={progress} className="h-2 mb-4" />
            <div className="flex justify-between">
                {steps.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = index === currentIndex;
                    const isCompleted = index < currentIndex;

                    return (
                        <div
                            key={step.id}
                            className={`flex flex-col items-center gap-2 ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                                }`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${isActive ? 'border-blue-600 bg-blue-50' :
                                    isCompleted ? 'border-green-600 bg-green-50' : 'border-gray-300'
                                }`}>
                                <Icon className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-medium hidden sm:block">{step.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const AgentSettings = ({ onSettingsChange }) => {
    const { activeAgent } = useActiveAgent();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [formData, setFormData] = useState(null);
    const [activeTab, setActiveTab] = useState('identity');
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Initialize form data when the active agent changes
    useEffect(() => {
        if (activeAgent) {
            const initialSettings = {
                name: activeAgent.name || '',
                description: activeAgent.description || '',
                agent_role: activeAgent.agent_role || '',
                agent_goal: activeAgent.agent_goal || '',
                agent_instructions: activeAgent.agent_instructions || '',
                examples: activeAgent.examples || '',
                model: activeAgent.model || 'gpt-4o-mini',
                temperature: activeAgent.temperature ?? 0.2,
                top_p: activeAgent.top_p ?? 1.0,
                widget_settings: {
                    ...DEFAULT_WIDGET_SETTINGS,
                    ...(activeAgent.widget_settings || {}),
                    initial_prompts: Array.isArray(activeAgent.widget_settings?.initial_prompts) ? activeAgent.widget_settings.initial_prompts : [],
                },
            };
            setFormData(initialSettings);
        }
    }, [activeAgent]);

    useEffect(() => {
        if (formData) {
            onSettingsChange(formData.widget_settings);
        }
    }, [formData?.widget_settings, onSettingsChange]);

    const handleFormChange = useCallback((field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleWidgetChange = useCallback((field, value) => {
        setFormData(prev => ({
            ...prev,
            widget_settings: {
                ...(prev.widget_settings || DEFAULT_WIDGET_SETTINGS),
                [field]: value
            }
        }));
    }, []);

    const updateMutation = useMutation({
        mutationFn: (agentData) => updateAgent(activeAgent.id, agentData),
        onSuccess: () => {
            toast({ title: "Settings Saved", description: "Your agent has been successfully updated." });
            queryClient.invalidateQueries({ queryKey: ['agents'] });
            navigate(`/app/agent/${activeAgent.id}/dashboard`);
        },
        onError: (err) => {
            const errorMsg = err.response?.data?.detail || "An unknown error occurred.";
            toast({ title: "Save Failed", description: errorMsg, variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => deleteAgent(activeAgent.id),
        onSuccess: () => {
            toast({ title: "Agent Deleted", description: `Agent '${activeAgent.name}' has been permanently deleted.` });
            queryClient.invalidateQueries({ queryKey: ['agents'] }).then(() => {
                navigate('/app/agent');
            });
        },
        onError: (err) => toast({ title: "Delete Failed", description: err.message, variant: "destructive" }),
    });

    const handleSave = () => {
        if (!activeAgent || !formData) return;
        const payload = {
            ...formData,
            temperature: parseFloat(formData.temperature),
            top_p: parseFloat(formData.top_p),
        };
        updateMutation.mutate(payload);
    };

    const widgetSnippet = activeAgent ? `<script data-agent-id="${activeAgent.id}" src="${import.meta.env.VITE_WIDGET_BASE_URL || 'https://cdn.example.com/widget.js'}" defer></script>` : '';

    if (!formData) {
        return (
            <div className="max-w-7xl mx-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-96 w-full" />
                    </div>
                    <div className="space-y-6">
                        <Skeleton className="h-64 w-full" />
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div className="mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Bot className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{formData.name || 'Unnamed Agent'}</h1>
                        <p className="text-gray-600">{formData.description || 'Configure your AI assistant'}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
                {/* Main Configuration Panel */}
                <div className="lg:col-span-2 space-y-6">
                    <ConfigurationProgress activeTab={activeTab} />

                    <Card className="border-0 shadow-lg">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-6 mb-6">
                                <TabsTrigger value="identity" className="flex items-center gap-2">
                                    <Bot className="w-4 h-4" />
                                    <span className="hidden sm:inline">Identity</span>
                                </TabsTrigger>
                                <TabsTrigger value="behavior" className="flex items-center gap-2">
                                    <Brain className="w-4 h-4" />
                                    <span className="hidden sm:inline">Behavior</span>
                                </TabsTrigger>
                                <TabsTrigger value="model" className="flex items-center gap-2">
                                    <Zap className="w-4 h-4" />
                                    <span className="hidden sm:inline">Model</span>
                                </TabsTrigger>
                                <TabsTrigger value="appearance" className="flex items-center gap-2">
                                    <Palette className="w-4 h-4" />
                                    <span className="hidden sm:inline">Style</span>
                                </TabsTrigger>
                                <TabsTrigger value="knowledge" className="flex items-center gap-2">
                                    <Database className="w-4 h-4" />
                                    <span className="hidden sm:inline">Knowledge</span>
                                </TabsTrigger>
                                <TabsTrigger value="deploy" className="flex items-center gap-2">
                                    <Code className="w-4 h-4" />
                                    <span className="hidden sm:inline">Deploy</span>
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="identity" className="space-y-6">
                                <div className="space-y-6 p-6">
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                            <Bot className="w-5 h-5" />
                                            Core Identity
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="name">Agent Name</Label>
                                                    <Input
                                                        id="name"
                                                        value={formData.name}
                                                        onChange={(e) => handleFormChange('name', e.target.value)}
                                                        placeholder="e.g., Support Pro"
                                                        className="text-lg"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="description">Description</Label>
                                                    <Input
                                                        id="description"
                                                        value={formData.description}
                                                        onChange={(e) => handleFormChange('description', e.target.value)}
                                                        placeholder="Brief description of your agent"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="agent_role">Agent Role & Personality</Label>
                                                <Textarea
                                                    id="agent_role"
                                                    value={formData.agent_role}
                                                    onChange={(e) => handleFormChange('agent_role', e.target.value)}
                                                    rows={4}
                                                    placeholder="You are a friendly and helpful expert on maritime history. You speak with enthusiasm and curiosity, always eager to share fascinating stories from the sea."
                                                    className="resize-none"
                                                />
                                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Info className="w-3 h-3" />
                                                    Define who your agent is and how it should communicate
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="behavior" className="space-y-6">
                                <div className="space-y-6 p-6">
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                            <Brain className="w-5 h-5" />
                                            Behavior & Instructions
                                        </h3>
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="agent_goal">Primary Goal</Label>
                                                <Textarea
                                                    id="agent_goal"
                                                    value={formData.agent_goal}
                                                    onChange={(e) => handleFormChange('agent_goal', e.target.value)}
                                                    rows={3}
                                                    placeholder="Your goal is to answer customer questions about pricing and features, helping them find the right plan for their needs."
                                                    className="resize-none"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="agent_instructions">Step-by-Step Instructions</Label>
                                                <Textarea
                                                    id="agent_instructions"
                                                    value={formData.agent_instructions}
                                                    onChange={(e) => handleFormChange('agent_instructions', e.target.value)}
                                                    rows={8}
                                                    placeholder="1. Greet the user warmly and ask how you can help&#10;2. Listen carefully to their question or concern&#10;3. Provide accurate information based on your knowledge base&#10;4. If you don't know something, offer to connect them with support&#10;5. Always end with asking if there's anything else you can help with"
                                                    className="resize-none font-mono text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="examples">Training Examples</Label>
                                                <Textarea
                                                    id="examples"
                                                    value={formData.examples}
                                                    onChange={(e) => handleFormChange('examples', e.target.value)}
                                                    rows={6}
                                                    placeholder="User: How much is the pro plan?&#10;Assistant: The Pro plan is $49/month and includes advanced analytics, priority support, and up to 10 team members. Would you like to know more about any specific features?&#10;&#10;User: I'm having trouble with my account&#10;Assistant: I'd be happy to help! Can you tell me more about the specific issue you're experiencing?"
                                                    className="resize-none font-mono text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="model" className="space-y-6">
                                <div className="space-y-6 p-6">
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                            <Zap className="w-5 h-5" />
                                            AI Model Configuration
                                        </h3>
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label>Language Model</Label>
                                                    <Select value={formData.model} onValueChange={model => handleFormChange('model', model)}>
                                                        <SelectTrigger className="h-12">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="gpt-4o-mini">
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="secondary">Fast</Badge>
                                                                    GPT-4o Mini
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="gpt-4-turbo">
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="secondary">Powerful</Badge>
                                                                    GPT-4 Turbo
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="gemini/gemini-1.5-pro-latest">
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="secondary">Advanced</Badge>
                                                                    Gemini 1.5 Pro
                                                                </div>
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Creativity Level: {formData.temperature}</Label>
                                                    <Slider
                                                        value={[formData.temperature]}
                                                        max={1}
                                                        step={0.1}
                                                        onValueChange={([val]) => handleFormChange('temperature', val)}
                                                        className="py-4"
                                                    />
                                                    <div className="flex justify-between text-xs text-gray-500">
                                                        <span>More Predictable</span>
                                                        <span>More Creative</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <Button
                                                variant="ghost"
                                                onClick={() => setShowAdvanced(!showAdvanced)}
                                                className="w-full justify-between"
                                            >
                                                Advanced Settings
                                                <ChevronRight className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
                                            </Button>

                                            {showAdvanced && (
                                                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                                                    <div className="space-y-2">
                                                        <Label>Top P: {formData.top_p}</Label>
                                                        <Slider
                                                            value={[formData.top_p]}
                                                            max={1}
                                                            step={0.1}
                                                            onValueChange={([val]) => handleFormChange('top_p', val)}
                                                        />
                                                        <p className="text-xs text-gray-500">Controls response diversity</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="appearance" className="space-y-6">
                                <div className="p-6 space-y-6">
                                    <h3 className="text-lg font-semibold flex items-center gap-2"><Palette className="w-5 h-5" /> Widget Appearance</h3>
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="theme_color">Brand Color</Label>
                                                <div className="flex items-center gap-3 p-2 border rounded-lg">
                                                    <input id="theme_color" type="color" value={formData.widget_settings.theme_color} onChange={(e) => handleWidgetChange('theme_color', e.target.value)} className="w-10 h-10 rounded-md border-none cursor-pointer" />
                                                    <Input value={formData.widget_settings.theme_color} onChange={(e) => handleWidgetChange('theme_color', e.target.value)} className="border-none" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Launcher Icon (For Future Use)</Label>
                                                <Select value={formData.widget_settings.launcher_icon} onValueChange={(val) => handleWidgetChange('launcher_icon', val)}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="MessageSquare"><span className="flex items-center gap-2"><MessageSquare className="w-4 h-4" />Chat Bubble</span></SelectItem>
                                                        <SelectItem value="Bot"><span className="flex items-center gap-2"><Bot className="w-4 h-4" />Robot Icon</span></SelectItem>
                                                        <SelectItem value="Sparkles"><span className="flex items-center gap-2"><Sparkles className="w-4 h-4" />Magic Icon</span></SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Widget Position (For Future Use)</Label>
                                            <RadioGroup value={formData.widget_settings.position} onValueChange={(val) => handleWidgetChange('position', val)} className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                {Object.keys(positionClasses).map(pos => (
                                                    <Label key={pos} htmlFor={`pos-${pos}`} className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent has-[:checked]:bg-accent has-[:checked]:border-primary">
                                                        <RadioGroupItem value={pos} id={`pos-${pos}`} /><span>{pos.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                                                    </Label>
                                                ))}
                                            </RadioGroup>
                                        </div>
                                        <Separator />
                                        <div className="space-y-4">
                                            <div className="space-y-2"><Label htmlFor="header_text">Chat Header</Label><Input id="header_text" value={formData.widget_settings.header_text} onChange={(e) => handleWidgetChange('header_text', e.target.value)} /></div>
                                            <div className="space-y-2"><Label htmlFor="bot_avatar_url">Bot Avatar URL</Label><Input id="bot_avatar_url" placeholder="https://..." value={formData.widget_settings.bot_avatar_url} onChange={(e) => handleWidgetChange('bot_avatar_url', e.target.value)} /></div>
                                            <div className="space-y-2"><Label htmlFor="welcome_message">Welcome Message</Label><Textarea id="welcome_message" value={formData.widget_settings.welcome_message} onChange={(e) => handleWidgetChange('welcome_message', e.target.value)} rows={2} /></div>
                                            <div className="space-y-2"><Label htmlFor="initial_prompts">Initial Prompts</Label><Textarea id="initial_prompts" value={(formData.widget_settings.initial_prompts || []).join('\n')} onChange={(e) => handleWidgetChange('initial_prompts', e.target.value.split('\n').filter(p => p.trim() !== ''))} rows={3} placeholder="Enter one prompt per line..." /></div>
                                            <div style={{ opacity: '0.7', pointerEvents: 'none', display: 'none' }} className="flex items-center justify-between p-3 border rounded-lg">
                                                <Label htmlFor="show_branding" className="font-normal flex items-center gap-2"><Power className="w-4 h-4" />Show "Powered By" Branding</Label>
                                                <Switch id="show_branding" checked={formData.widget_settings.show_branding} onCheckedChange={(val) => handleWidgetChange('show_branding', val)} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="knowledge" className="space-y-6">
                                <div className="p-6">
                                    <div className="mb-6">
                                        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                            <Database className="w-5 h-5" />
                                            Knowledge Base
                                        </h3>
                                        <p className="text-gray-600">Train your agent with documents, FAQs, and data sources</p>
                                    </div>
                                    <KnowledgeBaseManager agent={activeAgent} />
                                </div>
                            </TabsContent>

                            <TabsContent value="deploy" className="space-y-6">
                                <div className="space-y-6 p-6">
                                    <div>
                                        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                            <Code className="w-5 h-5" />
                                            Deploy to Your Website
                                        </h3>
                                        <p className="text-gray-600 mb-6">Copy this code snippet and paste it into your website's HTML</p>

                                        <div className="space-y-4">
                                            <div className="bg-gray-900 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs text-gray-400 font-medium">HTML SNIPPET</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(widgetSnippet);
                                                            toast({ title: "Copied to clipboard!" })
                                                        }}
                                                        className="text-gray-400 hover:text-white"
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <pre className="text-sm text-green-400 overflow-x-auto">
                                                    <code>{widgetSnippet}</code>
                                                </pre>
                                            </div>

                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                <div className="flex items-start gap-3">
                                                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                                    <div>
                                                        <h4 className="font-medium text-blue-900">Installation Instructions</h4>
                                                        <p className="text-sm text-blue-700 mt-1">
                                                            Paste this code snippet into the {'<head>'} section of your website.
                                                            The widget will automatically appear based on your position settings.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </Card>
                </div>
            </div>
            <div className="fixed z-[1000] bottom-4 right-4 rounded-2xl pointer-events-none lg:block hidden" style={{ maxHeight: '600px', maxWidth: '400px' }}>
                {formData && (
                    <div className="w-full h-full pointer-events-auto">
                        <AgentPlayground
                            agent={{
                                id: activeAgent.id,
                                name: formData.name,
                                widget_settings: formData.widget_settings,
                            }}
                        />
                    </div>
                )}
            </div>
            {/* Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" className="text-destructive hover:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Agent
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Agent</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete "{formData.name}" and all its configuration.
                                    This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => deleteMutation.mutate()}
                                    className="bg-destructive hover:bg-destructive/90"
                                >
                                    {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Delete Agent
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={() => navigate(`/app/agent/${activeAgent.id}/dashboard`)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={updateMutation.isPending}
                            size="lg"
                            className="min-w-[200px]"
                        >
                            {updateMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving Changes...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save & Return to Dashboard
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="h-20"></div>
        </div>
    );
};

export default AgentSettings;