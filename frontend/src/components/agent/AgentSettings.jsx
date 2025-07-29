import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActiveAgent } from '@/contexts/ActiveAgentProvider';
import { updateAgent, deleteAgent } from '@/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
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

const DEFAULT_WIDGET_SETTINGS = {
    theme_color: '#16a34a',
    position: 'bottom-right',
    header_text: 'Chat with our AI Assistant',
    welcome_message: 'Hello! How can I help you today?',
};

const AgentSettings = ({ onSettingsChange }) => {
  const { activeAgent } = useActiveAgent();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(null);

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
        },
      };
      setFormData(initialSettings);
      onSettingsChange(initialSettings.widget_settings);
    }
  }, [activeAgent, onSettingsChange]);

  // Propagate widget setting changes to the live preview
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
    // The backend serializer will ignore extra fields like widget_settings if it's not on the main model
    // but we can also strip it here if needed.
    updateMutation.mutate(payload);
  };
  
  const widgetSnippet = activeAgent ? `<script data-agent-id="${activeAgent.id}" src="${import.meta.env.VITE_REACT_APP_WIDGET_URL || 'https://cdn.example.com/widget.js'}" defer></script>` : '';

  if (!formData) {
    return <Card><CardContent><Skeleton className="w-full h-96" /></CardContent></Card>;
  }

  return (
    <div className="space-y-8">
      <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bot /> Agent Configuration</CardTitle>
            <CardDescription>Define how your agent thinks, acts, and what it knows.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" defaultValue={['item-1', 'item-2']} className="w-full">
                <AccordionItem value="item-1">
                    <AccordionTrigger>Core Identity & Persona</AccordionTrigger>
                    <AccordionContent className="space-y-6 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Agent Name</Label>
                            <Input id="name" value={formData.name} onChange={(e) => handleFormChange('name', e.target.value)} placeholder="e.g., Support Pro" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input id="description" value={formData.description} onChange={(e) => handleFormChange('description', e.target.value)} placeholder="e.g., An AI assistant for our SaaS product."/>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="agent_role">Agent Role</Label>
                            <Textarea id="agent_role" value={formData.agent_role} onChange={(e) => handleFormChange('agent_role', e.target.value)} rows={3} placeholder="You are a friendly and helpful expert on maritime history."/>
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                    <AccordionTrigger>Goals & Instructions</AccordionTrigger>
                    <AccordionContent className="space-y-6 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="agent_goal">Primary Goal</Label>
                            <Textarea id="agent_goal" value={formData.agent_goal} onChange={(e) => handleFormChange('agent_goal', e.target.value)} rows={3} placeholder="Your goal is to answer customer questions about pricing and features."/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="agent_instructions">Step-by-Step Instructions</Label>
                            <Textarea id="agent_instructions" value={formData.agent_instructions} onChange={(e) => handleFormChange('agent_instructions', e.target.value)} rows={8} placeholder={"1. Greet the user warmly.\n2. Answer based only on knowledge base documents.\n3. If you don't know, offer to create a support ticket."}/>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="examples">Examples (Few-shot prompting)</Label>
                            <Textarea id="examples" value={formData.examples} onChange={(e) => handleFormChange('examples', e.target.value)} rows={5} placeholder={"User: How much is the pro plan?\nAI: The Pro plan is $49/month. It includes..."}/>
                        </div>
                    </AccordionContent>
                </AccordionItem>
                 <AccordionItem value="item-3">
                    <AccordionTrigger>Model & Advanced Settings</AccordionTrigger>
                    <AccordionContent className="space-y-6 pt-4">
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
                 <AccordionItem value="item-4">
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
          </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
            <CardTitle>Knowledge Base</CardTitle>
            <CardDescription>Manage the documents and data sources your agent learns from.</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <KnowledgeBaseManager agent={activeAgent} />
          </CardContent>
      </Card>

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

      <div className="flex justify-between items-center pt-6 border-t mt-4">
          <AlertDialog>
              <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deleteMutation.isPending}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Agent
                  </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                   <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete the agent '{formData.name}'. This action cannot be reversed.</AlertDialogDescription>
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
          <Button onClick={handleSave} disabled={updateMutation.isPending} size="lg">
              {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {updateMutation.isPending ? "Saving..." : "Save and Return to Dashboard"}
          </Button>
      </div>
    </div>
  );
};

export default AgentSettings;