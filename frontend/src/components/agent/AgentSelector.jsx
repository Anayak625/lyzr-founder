import { useState } from 'react';
import { useActiveAgent } from '@/contexts/ActiveAgentProvider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAgent } from '@/api';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Loader2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

const AgentSelector = () => {
  const { activeAgent, setActiveAgentId, agents, isLoadingAgents } = useActiveAgent();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');

  const mutation = useMutation({
    mutationFn: (agentName) => createAgent({ name: agentName }),
    onSuccess: (response) => {
      const newAgent = response.data;
      toast({ title: 'Agent created successfully!' });
      // After creating, invalidate the agents query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['agents'] }).then(() => {
        // Once refetched, the provider's useEffect will set the new agent as active
        setActiveAgentId(newAgent.id);
      });
      setCreateDialogOpen(false);
      setNewAgentName('');
    },
    onError: (error) => {
        const errorMsg = error.response?.data?.detail || "An unexpected error occurred.";
        toast({ title: 'Failed to create agent.', description: errorMsg, variant: 'destructive' });
    },
  });

  const handleCreateAgent = () => {
    if (!newAgentName.trim()) {
      toast({ title: 'Please enter a name for your agent.', variant: 'destructive' });
      return;
    }
    mutation.mutate(newAgentName);
  };

  if (isLoadingAgents) {
    return <Skeleton className="h-10 w-full max-w-sm" />;
  }
  
  return (
    <div className="flex gap-2 items-center w-full max-w-sm">
      <div className="flex-grow">
        <Select
          value={activeAgent?.id || ''}
          onValueChange={(agentId) => setActiveAgentId(agentId)}
          disabled={agents.length === 0 && !isLoadingAgents}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select an agent..." />
          </SelectTrigger>
          <SelectContent>
            {agents.length > 0 ? agents.map(agent => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            )) : <div className="p-4 text-center text-sm text-muted-foreground">No agents yet.</div>}
          </SelectContent>
        </Select>
      </div>

      <Button variant="outline" size="icon" onClick={() => setCreateDialogOpen(true)}>
        <PlusCircle className="h-4 w-4" />
        <span className="sr-only">Create New Agent</span>
      </Button>

      <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Agent</DialogTitle>
            <DialogDescription>
              Give your new agent a name. You can configure it and add knowledge later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="agent-name" className="text-right">Name</Label>
              <Input
                id="agent-name"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                className="col-span-3"
                placeholder="e.g., Support Bot"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateAgent} disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mutation.isPending ? "Creating..." : "Create Agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentSelector;



