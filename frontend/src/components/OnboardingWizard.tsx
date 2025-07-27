import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Link as LinkIcon, Copy, CheckCircle } from 'lucide-react';

const OnboardingWizard = () => {
  const { showOnboarding, onboardingStep, setOnboardingStep, completeOnboarding } = useOnboarding();
  const { toast } = useToast();
  const [agentName, setAgentName] = useState('');
  const [knowledgeBaseUrl, setKnowledgeBaseUrl] = useState('');
  const [snippetCopied, setSnippetCopied] = useState(false);

  const progress = (onboardingStep / 3) * 100;

  const magicSnippet = `<script>
  (function() {
    var s = document.createElement('script');
    s.src = 'https://cdn.lyzrfoundry.com/widget.js';
    s.setAttribute('data-agent-id', 'agent_${Date.now()}');
    document.head.appendChild(s);
  })();
</script>`;

  const handleNext = () => {
    if (onboardingStep === 1) {
      if (!agentName.trim()) {
        toast({
          title: "Agent name required",
          description: "Please enter a name for your support agent.",
          variant: "destructive",
        });
        return;
      }
      setOnboardingStep(2);
    } else if (onboardingStep === 2) {
      if (!knowledgeBaseUrl.trim()) {
        toast({
          title: "Knowledge base URL required",
          description: "Please enter a URL for your agent's knowledge base.",
          variant: "destructive",
        });
        return;
      }
      setOnboardingStep(3);
      // Mock API call to create agent
      toast({
        title: "Agent created successfully!",
        description: `${agentName} is ready to help your customers.`,
      });
    }
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(magicSnippet);
    setSnippetCopied(true);
    toast({
      title: "Code copied!",
      description: "Paste this snippet into your website's HTML.",
    });
    setTimeout(() => setSnippetCopied(false), 2000);
  };

  const handleComplete = () => {
    completeOnboarding();
    toast({
      title: "Welcome to LyzrFoundry!",
      description: "Your intelligent support agent is ready to serve your customers.",
    });
  };

  return (
    <Dialog open={showOnboarding} onOpenChange={() => {}}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Welcome to LyzrFoundry
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {onboardingStep} of 3</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {onboardingStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Create your first support agent</CardTitle>
                <CardDescription>
                  Let's start by giving your AI assistant a name and personality
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agentName">Agent Name</Label>
                  <Input
                    id="agentName"
                    placeholder="e.g., Sarah, Customer Helper, Support Bot"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                  />
                </div>
                <Button onClick={handleNext} className="w-full" variant="gradient">
                  Continue
                </Button>
              </CardContent>
            </Card>
          )}

          {onboardingStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Connect your knowledge base</CardTitle>
                <CardDescription>
                  Provide a URL where your agent can learn about your product or service
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="knowledgeBase">Knowledge Base URL</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="knowledgeBase"
                      placeholder="https://yourcompany.com/faq"
                      value={knowledgeBaseUrl}
                      onChange={(e) => setKnowledgeBaseUrl(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This could be your FAQ page, documentation, or help center
                  </p>
                </div>
                <Button onClick={handleNext} className="w-full" variant="gradient">
                  Create Agent
                </Button>
              </CardContent>
            </Card>
          )}

          {onboardingStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  Your agent is ready!
                </CardTitle>
                <CardDescription>
                  Copy this snippet and paste it into your website's HTML to activate your chat widget
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Magic Snippet</Label>
                  <div className="relative">
                    <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                      <code>{magicSnippet}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant={snippetCopied ? "success" : "outline"}
                      className="absolute top-2 right-2"
                      onClick={handleCopySnippet}
                    >
                      {snippetCopied ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="bg-primary/10 p-4 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">What happens next?</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Your chat widget will appear on your website</li>
                    <li>• Customers can start conversations immediately</li>
                    <li>• Analytics will appear in your dashboard</li>
                  </ul>
                </div>
                <Button onClick={handleComplete} className="w-full" variant="gradient">
                  Take me to dashboard
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingWizard;