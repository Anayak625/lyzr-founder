// src/components/OnboardingWizard.jsx
import { useState } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import useAgents from '../hooks/useAgents'; // Corrected: import useAgents (plural)
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Link as LinkIcon, Copy, CheckCircle } from 'lucide-react';

const OnboardingWizard = () => {
  const { showOnboarding, onboardingStep, setOnboardingStep, completeOnboarding } = useOnboarding();
  const { createAgent, addKnowledgeSource } = useAgents(); // Corrected: useAgents()
  const { toast } = useToast();
  
  const [agentName, setAgentName] = useState('');
  const [knowledgeBaseUrl, setKnowledgeBaseUrl] = useState('');
  const [createdAgentId, setCreatedAgentId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const magicSnippet = createdAgentId ? `<script data-agent-id="${createdAgentId}" src="https://cdn.lyzrfoundry.com/widget.js"></script>` : '';

  const handleNext = async () => {
    if (onboardingStep === 1) {
      if (!agentName.trim()) {
        toast({ title: "Agent name is required.", variant: "destructive" });
        return;
      }
      setOnboardingStep(2);
    } else if (onboardingStep === 2) {
      if (!knowledgeBaseUrl.trim()) {
        toast({ title: "Knowledge base URL is required.", variant: "destructive" });
        return;
      }
      setIsLoading(true);
      try {
        // Step 1: Create the agent
        const newAgent = await createAgent({ name: agentName, system_prompt: 'You are a helpful assistant.' });
        setCreatedAgentId(newAgent.id);

        // Step 2: Add the knowledge source for the new agent
        // Corrected: The payload now matches the hook's signature { agentId, sourceData }
        await addKnowledgeSource({
            agentId: newAgent.id,
            sourceData: {
                type: 'URL',
                title: `Initial URL: ${knowledgeBaseUrl.substring(0, 40)}...`,
                content: knowledgeBaseUrl,
            }
        });

        toast({ title: "Agent created successfully!" });
        setOnboardingStep(3);
      } catch (error) {
        toast({ title: "Creation Failed", description: "Could not create the agent or add the knowledge source.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleComplete = () => {
    completeOnboarding();
    toast({ title: "Setup complete!", description: "Welcome to your dashboard." });
  };

  return (
    <Dialog open={showOnboarding} onOpenChange={() => {}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles /> Welcome to LyzrFoundry
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Progress value={(onboardingStep / 3) * 100} />
          {onboardingStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Create your agent</CardTitle>
                <CardDescription>Give your AI assistant a name.</CardDescription>
              </CardHeader>
              <CardContent>
                <Input placeholder="e.g., Support Bot" value={agentName} onChange={(e) => setAgentName(e.target.value)} />
                <Button onClick={handleNext} className="w-full mt-4" variant="gradient">Continue</Button>
              </CardContent>
            </Card>
          )}
          {onboardingStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Connect a knowledge base</CardTitle>
                <CardDescription>Provide a URL (e.g., FAQ page) to train your agent.</CardDescription>
              </CardHeader>
              <CardContent>
                <Input placeholder="https://yourcompany.com/faq" value={knowledgeBaseUrl} onChange={(e) => setKnowledgeBaseUrl(e.target.value)} />
                <Button onClick={handleNext} className="w-full mt-4" variant="gradient" disabled={isLoading}>
                    {isLoading ? "Creating..." : "Create Agent"}
                </Button>
              </CardContent>
            </Card>
          )}
          {onboardingStep === 3 && (
            <Card>
              <CardHeader>
                  <CardTitle>Agent Ready!</CardTitle>
                  <CardDescription>Copy this snippet to your website to activate the widget.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                      <code>{magicSnippet}</code>
                  </pre>
                  <Button onClick={() => navigator.clipboard.writeText(magicSnippet)} className="w-full"><Copy className="mr-2" /> Copy Snippet</Button>
                  <Button onClick={handleComplete} className="w-full" variant="gradient">Go to Dashboard</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingWizard;