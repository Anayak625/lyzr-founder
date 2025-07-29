import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addKnowledgeSource, deleteKnowledgeSource } from '@/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Upload, Globe, Loader2, FileText, AlertCircle, Search } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const KnowledgeBaseManager = ({ agent }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [newUrl, setNewUrl] = useState('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // ... (mutations remain the same)
  const addSourceMutation = useMutation({
    mutationFn: ({ agentId, sourceData }) => addKnowledgeSource(agentId, sourceData),
    onSuccess: () => {
      toast({ title: "Source added", description: "Your agent will begin training on the new data shortly." });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setNewUrl('');
      setIsUploadingFile(false);
    },
    onError: (err) => {
        const errorMsg = err.response?.data?.detail || "An unknown error occurred.";
        toast({ title: "Failed to add source", description: errorMsg, variant: "destructive" });
        setIsUploadingFile(false);
    },
  });
  const deleteSourceMutation = useMutation({
    mutationFn: ({ agentId, sourceId }) => deleteKnowledgeSource(agentId, sourceId),
    onSuccess: () => {
      toast({ title: "Source removed." });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
    onError: (err) => toast({ title: "Failed to remove source.", description: err.message, variant: "destructive" }),
  });


  const handleAddUrl = () => {
    if (!newUrl.trim() || !agent) return;
    addSourceMutation.mutate({
      agentId: agent.id,
      sourceData: { type: 'URL', title: newUrl, content: newUrl },
    });
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file || !agent) return;

    setIsUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'FILE');
    formData.append('title', file.name);
    
    addSourceMutation.mutate({ agentId: agent.id, sourceData: formData });
    event.target.value = null; // Reset file input
  };

  const isMutating = addSourceMutation.isPending || deleteSourceMutation.isPending;

  const getSourceIcon = (type) => {
    if (type === 'URL') return <Globe className="h-4 w-4 text-sky-500 flex-shrink-0" />;
    return <FileText className="h-4 w-4 text-green-500 flex-shrink-0" />;
  };

  const getStatusBadge = (status) => {
    const statusMap = {
        PENDING: { variant: "outline", label: "Pending" },
        INDEXING: { variant: "secondary", label: "Indexing", icon: <Loader2 className="mr-1 h-3 w-3 animate-spin" /> },
        COMPLETED: { variant: "success", label: "Trained" },
        FAILED: { variant: "destructive", label: "Failed", icon: <AlertCircle className="mr-1 h-3 w-3" /> }
    };
    const { variant, label, icon } = statusMap[status] || statusMap.PENDING;
    return <Badge variant={variant}>{icon}{label}</Badge>;
  };

  const allSources = agent.knowledge_base?.sources || [];
  const filteredSources = useMemo(() => {
    if (!searchTerm) return allSources;
    return allSources.filter(source => 
        source.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allSources, searchTerm]);

  return (
    <div className="pt-6 border-t">
      <h3 className="text-lg font-medium">Knowledge Base</h3>
      <p className="text-sm text-muted-foreground mb-4">Add or remove data sources. Your agent learns from this content.</p>
      
      <div className="space-y-4">
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Search sources..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 border rounded-lg p-2">
          {filteredSources.length > 0 ? filteredSources.map((source) => (
            <div key={source.id} className="flex items-center gap-2 p-2 bg-muted rounded-md">
              {getSourceIcon(source.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" title={source.title}>{source.title}</p>
              </div>
              {getStatusBadge(source.status)}
              <Tooltip>
                <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" disabled={isMutating} onClick={() => deleteSourceMutation.mutate({ agentId: agent.id, sourceId: source.id })}>
                        <X className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Remove Source</p></TooltipContent>
              </Tooltip>
            </div>
          )) : (
            <div className="text-sm text-center py-8 text-muted-foreground">
                {searchTerm ? 'No sources match your search.' : 'No knowledge sources added yet.'}
            </div>
          )}
        </div>
        
        {/* ... (Add URL and File Upload sections remain the same) ... */}
        <div className="flex gap-2">
          <Input 
            value={newUrl} 
            onChange={(e) => setNewUrl(e.target.value)} 
            onKeyPress={e => e.key === 'Enter' && handleAddUrl()}
            placeholder="https://yoursite.com/faq" 
            disabled={isMutating}
          />
          <Button onClick={handleAddUrl} disabled={!newUrl.trim() || isMutating}>
            {addSourceMutation.isPending && newUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add URL"}
          </Button>
        </div>
        <div>
          <label htmlFor={`file-upload-${agent.id}`} className={`w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg transition-colors ${isMutating ? 'cursor-not-allowed bg-muted/50' : 'cursor-pointer hover:bg-muted'}`}>
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="mt-2 text-sm font-semibold">Click to upload a document</span>
            <span className="text-xs text-muted-foreground">PDF, TXT, DOCX, etc.</span>
            {isUploadingFile && <Loader2 className="h-4 w-4 animate-spin mt-2" />}
          </label>
          <input id={`file-upload-${agent.id}`} type="file" className="hidden" onChange={handleFileUpload} disabled={isMutating} />
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBaseManager;