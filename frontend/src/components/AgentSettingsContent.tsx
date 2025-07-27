// src/components/AgentSettingsContent.jsx
import { useState, useEffect } from 'react';
import { useAgents } from '@/hooks/useAgents';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from "@/components/ui/slider";
import { Skeleton } from '@/components/ui/skeleton';
import { Bot, Save } from 'lucide-react';
import KnowledgeBaseManager from './KnowledgeBaseManager';

const AgentSettingsContent = ({ agent }) => {
  const { updateAgent } = useAgents();
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [model, setModel] = useState('gpt-3.5-turbo');
  const [temperature, setTemperature] = useState([0.2]);

  useEffect(() => {
    if (agent) {
      setName(agent.name || '');
      setSystemPrompt(agent.system_prompt || '');
      setModel(agent.model || 'gpt-3.5-turbo');
      setTemperature([agent.temperature || 0.2]);
    }
  }, [agent]);

  const handleSave = () => {
    if (!agent) return;
    updateAgent({
      id: agent.id,
      name,
      system_prompt: systemPrompt,
      model,
      temperature: temperature[0],
    }, {
      onSuccess: () => toast({ title: "Settings Saved" }),
      onError: (err) => toast({ title: "Save Failed", description: err.message, variant: "destructive" }),
    });
  };

  if (!agent) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Agent Settings</CardTitle>
            </CardHeader>
            <CardContent>
                <Skeleton className="h-10 w-full mb-4" />
                <Skeleton className="h-24 w-full" />
            </CardContent>
        </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bot /> Agent Configuration</CardTitle>
        <CardDescription>Fine-tune the behavior and knowledge of '{agent.name}'.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="agentName">Agent Name</Label>
          <Input id="agentName" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="systemPrompt">Agent Personality (System Prompt)</Label>
          <Textarea id="systemPrompt" value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={6} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Language Model</Label>
                <Select value={model} onValueChange={setModel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>Temperature: {temperature[0]}</Label>
                <Slider defaultValue={[0.2]} value={temperature} max={1} step={0.1} onValueChange={setTemperature} />
                <p className="text-xs text-muted-foreground">Lower is more predictable, higher is more creative.</p>
            </div>
        </div>

        <div className="flex justify-end">
            <Button onClick={handleSave} variant="gradient">
              <Save className="mr-2 h-4 w-4" /> Save Settings
            </Button>
        </div>
        
        <KnowledgeBaseManager agent={agent} />
      </CardContent>
    </Card>
  );
};

export default AgentSettingsContent;