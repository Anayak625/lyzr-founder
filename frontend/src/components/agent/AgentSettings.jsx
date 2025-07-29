import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActiveAgent } from '@/contexts/ActiveAgentProvider';
import { updateAgent, deleteAgent } from '@/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Bot, Save, Loader2, Copy, Trash2, Info, Palette } from 'lucide-react';
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

// A robust set of default settings to prevent crashes and provide a good UX
// when the API returns an empty `widget_settings` object.
const DEFAULT_WIDGET_SETTINGS = {
    theme_color: '#16a34a', // A nice default green
    position: 'bottom-right',
    header_text: 'Chat with our AI Assistant',
    welcome_message: 'Hello! How can I help you today?',
};

const AgentSettings = ({ onSettingsChange }) => {
  const { activeAgent } = useActiveAgent();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState(null);

  // This effect is the core logic for initializing and resetting the form.
  // It runs whenever the activeAgent changes.
  useEffect(() => {
    if (activeAgent) {
      const initialSettings = {
        name: activeAgent.name || '',
        system_prompt: activeAgent.system_prompt || '',
        model: activeAgent.model || 'gpt-4o-mini',
        temperature: activeAgent.temperature ?? 0.2,
        top_p: activeAgent.top_p ?? 1.0,
        // The key fix: Gracefully merge default settings with API data.
        // This handles cases where `widget_settings` is null, undefined, or {}.
        widget_settings: {
            ...DEFAULT_WIDGET_SETTINGS,
            ...(activeAgent.widget_settings || {}),
        },
      };
      setFormData(initialSettings);
      // Propagate the fully-formed settings object to the parent for the live preview.
      onSettingsChange(initialSettings.widget_settings);
    }
  }, [activeAgent, onSettingsChange]);
  
  // This effect ensures the live preview updates instantly as the user types.
  useEffect(() => {
      if (formData) {
          onSettingsChange(formData.widget_settings);
      }
  }, [formData?.widget_settings, onSettingsChange]);

  // useCallback is used for performance optimization, preventing re-creation of these
  // functions on every render unless their dependencies change.
  const handleFormChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleWidgetChange = useCallback((field, value) => {
    setFormData(prev => ({
        ...prev,
        widget_settings: {
            ...prev.widget_settings,
            [field]: value
        }
    }));
  }, []);

  // --- React Query Mutations for API calls ---

  const updateMutation = useMutation({
    mutationFn: (agentData) => updateAgent(activeAgent.id, agentData),
    onSuccess: () => {
      toast({ title: "Settings Saved", description: "Your agent has been successfully updated." });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
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
      // The ActiveAgentProvider will automatically select a new agent after refetching.
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
    onError: (err) => toast({ title: "Delete Failed", description: err.message, variant: "destructive" }),
  });

  // Handler for the master "Save All Settings" button
  const handleSave = () => {
    if (!activeAgent || !formData) return;
    
    // Construct a complete payload to send to the backend.
    const payload = {
      ...activeAgent, // Start with existing data to not lose fields like 'id', 'user', etc.
      ...formData,
      temperature: parseFloat(formData.temperature),
      top_p: parseFloat(formData.top_p),
    };
    updateMutation.mutate(payload);
  };

  const widgetSnippet = activeAgent ? `<script data-agent-id="${activeAgent.id}" src="${import.meta.env.VITE_REACT_APP_WIDGET_URL || 'https://cdn.example.com/widget.js'}" defer></script>` : '';
  
  // Display a loading skeleton while the form data is being initialized.
  if (!formData) {
      return <Card><CardContent><Skeleton className="w-full h-96" /></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bot /> Agent Configuration</CardTitle>
        <CardDescription>Fine-tune the behavior, knowledge, and appearance of '{formData.name}'.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <Accordion type="multiple" defaultValue={['item-1', 'item-3']} className="w-full">
            {/* --- Core Settings Accordion --- */}
            <AccordionItem value="item-1">
                <AccordionTrigger>Core Settings</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Agent Name</Label>
                        <Input id="name" value={formData.name} onChange={(e) => handleFormChange('name', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="system_prompt">Agent Personality (System Prompt)</Label>
                        <Textarea id="system_prompt" value={formData.system_prompt} onChange={(e) => handleFormChange('system_prompt', e.target.value)} rows={8} placeholder="e.g., You are a friendly and helpful assistant..."/>
                    </div>
                </AccordionContent>
            </AccordionItem>
            {/* --- Model Settings Accordion --- */}
            <AccordionItem value="item-2">
                <AccordionTrigger>Model Settings</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Language Model</Label>
                            <Select value={formData.model} onValueChange={model => handleFormChange('model', model)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                                    <SelectItem value="gemini/gemini-1.5-pro-latest">Gemini 1.5 Pro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Temperature: {formData.temperature}</Label>
                            <Slider value={[formData.temperature]} max={1} step={0.1} onValueChange={([val]) => handleFormChange('temperature', val)} />
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3" /> Lower is more predictable.</p>
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
            {/* --- Widget Customization Accordion --- */}
            <AccordionItem value="item-3">
                <AccordionTrigger>Widget Customization</AccordionTrigger>
                <AccordionContent className="space-y-6 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                        <div className="space-y-2">
                            <Label htmlFor="theme_color">Theme Color</Label>
                            <div className="flex items-center gap-2 border rounded-md px-2">
                                <Palette className="h-4 w-4 text-muted-foreground" />
                                <input id="theme_color" type="color" value={formData.widget_settings.theme_color} onChange={(e) => handleWidgetChange('theme_color', e.target.value)} className="w-8 h-8 bg-transparent border-none cursor-pointer"/>
                                <span className="font-mono text-sm">{formData.widget_settings.theme_color}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Position on Page</Label>
                            <RadioGroup value={formData.widget_settings.position} onValueChange={(val) => handleWidgetChange('position', val)} className="flex gap-4">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="bottom-right" id="pos-br" />
                                    <Label htmlFor="pos-br">Bottom-Right</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="bottom-left" id="pos-bl" />
                                    <Label htmlFor="pos-bl">Bottom-Left</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="header_text">Header Text</Label>
                        <Input id="header_text" value={formData.widget_settings.header_text} onChange={(e) => handleWidgetChange('header_text', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="welcome_message">Welcome Message</Label>
                        <Textarea id="welcome_message" value={formData.widget_settings.welcome_message} onChange={(e) => handleWidgetChange('welcome_message', e.target.value)} rows={3} />
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>

        {/* --- Master Save Button --- */}
        <div className="flex justify-end pt-6 border-t">
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {updateMutation.isPending ? "Saving..." : "Save All Settings"}
            </Button>
        </div>
        
        {/* --- Knowledge Base Component --- */}
        <KnowledgeBaseManager agent={activeAgent} />

        {/* --- Widget Deployment Snippet --- */}
         <Card className="bg-muted/50">
            <CardHeader>
                <CardTitle>Deploy to Your Website</CardTitle>
                <CardDescription>Copy and paste this snippet into the {'<head>'} of your website to embed the chat widget.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="bg-background p-3 rounded-md flex items-center justify-between gap-4">
                    <pre className="text-sm overflow-x-auto"><code>{widgetSnippet}</code></pre>
                    <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(widgetSnippet); toast({title: "Copied to clipboard!"})}}>
                        <Copy className="h-4 w-4"/>
                    </Button>
                </div>
            </CardContent>
         </Card>

        {/* --- Danger Zone for Deleting the Agent --- */}
         <Card className="border-destructive">
            <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-between items-center">
                <p className="text-sm font-medium">Permanently delete this agent and all its data.</p>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={deleteMutation.isPending}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Agent
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete the agent '{formData.name}' and all of its associated data, including its knowledge base and conversation history. This action cannot be reversed.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive hover:bg-destructive/90">
                                {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Yes, delete this agent
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
         </Card>
      </CardContent>
    </Card>
  );
};

export default AgentSettings;