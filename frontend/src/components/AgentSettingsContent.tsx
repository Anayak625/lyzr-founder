import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import KnowledgeBaseManager from './KnowledgeBaseManager';
import AdvancedWidgetCustomization from './AdvancedWidgetCustomization';
import PredefinedPrompts from './PredefinedPrompts';
import { 
  Settings, 
  Bot, 
  Code,
  Save
} from 'lucide-react';

const AgentSettingsContent = () => {
  const { toast } = useToast();
  const [agentName, setAgentName] = useState('Sarah');
  const [isActive, setIsActive] = useState(true);

  const handleSave = () => {
    // Mock save - replace with actual API call
    toast({
      title: "Settings saved",
      description: "Your agent configuration has been updated successfully.",
    });
  };

  const magicSnippet = `<script>
  (function() {
    var s = document.createElement('script');
    s.src = 'https://cdn.lyzrfoundry.com/widget.js';
    s.setAttribute('data-agent-id', 'agent_12345');
    document.head.appendChild(s);
  })();
</script>`;

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Settings</h1>
          <p className="text-muted-foreground">
            Configure your AI support agent
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      {/* Basic Configuration */}
      <Card className="shadow-card border-0 bg-gradient-card backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Basic Configuration
          </CardTitle>
          <CardDescription>
            Core settings for your AI agent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agentName">Agent Name</Label>
            <Input
              id="agentName"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="e.g., Sarah, Support Bot"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Agent Status</Label>
              <p className="text-sm text-muted-foreground">
                Enable or disable your agent
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </CardContent>
      </Card>

      {/* Knowledge Base Management */}
      <KnowledgeBaseManager />

      {/* Predefined Prompts */}
      <PredefinedPrompts />

      {/* Advanced Widget Customization */}
      <AdvancedWidgetCustomization />

      {/* Installation Code */}
      <Card className="shadow-card border-0 bg-gradient-card backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Installation Code
          </CardTitle>
          <CardDescription>
            Copy this snippet and paste it into your website's HTML
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
              <code>{magicSnippet}</code>
            </pre>
            <Button
              size="sm"
              variant="outline"
              className="absolute top-2 right-2"
              onClick={() => {
                navigator.clipboard.writeText(magicSnippet);
                toast({
                  title: "Code copied!",
                  description: "Installation snippet copied to clipboard.",
                });
              }}
            >
              Copy
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} variant="gradient" size="lg">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default AgentSettingsContent;