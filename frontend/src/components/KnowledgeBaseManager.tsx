// src/components/KnowledgeBaseManager.jsx
import { useState } from 'react';
import { useAgents } from '@/hooks/useAgents';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Plus, X, Upload, Globe, FileText, Loader2 } from 'lucide-react';

const KnowledgeBaseManager = ({ agent }) => {
  const { addKnowledgeSource, deleteKnowledgeSource } = useAgents();
  const { toast } = useToast();
  
  const [newUrl, setNewUrl] = useState('');
  const [isAddingUrl, setIsAddingUrl] = useState(false);

  const handleAddUrl = () => {
    if (!newUrl || !agent) return;
    setIsAddingUrl(true);
    addKnowledgeSource({
      agentId: agent.id,
      sourceData: {
        type: 'URL',
        title: `URL: ${newUrl.substring(0, 50)}...`,
        content: newUrl,
      }
    }, { 
        onSuccess: () => { setNewUrl(''); toast({ title: "URL source added successfully."}); },
        onError: () => toast({ title: "Failed to add URL.", variant: "destructive"}),
        onSettled: () => setIsAddingUrl(false),
    });
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file || !agent) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'FILE');
    formData.append('title', file.name);
    
    addKnowledgeSource({ agentId: agent.id, sourceData: formData }, { 
        onSuccess: () => toast({ title: "File uploaded successfully." }),
        onError: () => toast({ title: "File upload failed.", variant: "destructive" })
    });
  };

  const handleRemoveSource = (sourceId) => {
    if (!agent) return;
    deleteKnowledgeSource({ agentId: agent.id, sourceId }, {
      onSuccess: () => toast({ title: "Source removed." }),
    });
  };
  
  const getSourceIcon = (type) => {
    if (type === 'URL') return <Globe className="h-4 w-4" />;
    if (type === 'FILE') return <FileText className="h-4 w-4" />;
    if (type === 'FAQ') return <BookOpen className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className="pt-6 border-t">
      <h3 className="text-lg font-medium">Knowledge Base</h3>
      <p className="text-sm text-muted-foreground mb-4">Add or remove data sources to train your agent.</p>
      
      <div className="space-y-4">
        <div className="space-y-2">
          {agent.knowledge_sources?.map((source) => (
            <div key={source.id} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              {getSourceIcon(source.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{source.title}</p>
              </div>
              <Badge variant="outline" className="text-xs">{source.type}</Badge>
              <Badge variant={source.status === 'COMPLETED' ? 'success' : 'secondary'}>{source.status}</Badge>
              <Button size="icon" variant="ghost" onClick={() => handleRemoveSource(source.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        
        <div className="flex gap-2">
          <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://yoursite.com/docs" />
          <Button onClick={handleAddUrl} disabled={isAddingUrl}>
            {isAddingUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add URL
          </Button>
        </div>

        <div>
          <label htmlFor="file-upload" className="w-full block text-center p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted">
            <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
            <span className="mt-2 block text-sm font-semibold">Upload a Document (PDF, TXT, etc.)</span>
          </label>
          <input id="file-upload" type="file" className="hidden" onChange={handleFileUpload} />
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBaseManager;