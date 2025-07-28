// src/components/AgentSelector.jsx
import React, { useState } from 'react';
import useActiveAgent from '../contexts/Active-agent-context';
import useAgents from '@/hooks/useAgents';
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
import { PlusCircle } from 'lucide-react';

const AgentSelector = () => {
  const { activeAgent, setActiveAgent, agents, isLoadingAgents } = useActiveAgent();
  const { createAgent } = useAgents();
  const { toast } = useToast();
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');

  const handleCreateAgent = async () => {
    if (!newAgentName.trim()) {
      toast({ title: 'Please enter a name for your agent.', variant: 'destructive' });
      return;
    }
    try {
      const newAgent = await createAgent({ name: newAgentName });
      toast({ title: 'Agent created successfully!' });
      setActiveAgent(newAgent); // Set the newly created agent as active
      setCreateDialogOpen(false);
      setNewAgentName('');
    } catch (error) {
      toast({ title: 'Failed to create agent.', variant: 'destructive' });
    }
  };

  if (isLoadingAgents) {
    return <div>Loading agents...</div>;
  }
  
  return (
    <div className="flex gap-2 items-center">
      <div className="flex-grow">
        <Select
          value={activeAgent?.id || ''}
          onValueChange={(agentId) => {
            const selected = agents.find(a => a.id === agentId);
            setActiveAgent(selected);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an agent..." />
          </SelectTrigger>
          <SelectContent>
            {agents?.map(agent => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button variant="outline" size="icon" onClick={() => setCreateDialogOpen(true)}>
        <PlusCircle className="h-4 w-4" />
      </Button>

      <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Agent</DialogTitle>
            <DialogDescription>
              Give your new project a name. You can configure it later.
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
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateAgent}>Create Agent</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentSelector;