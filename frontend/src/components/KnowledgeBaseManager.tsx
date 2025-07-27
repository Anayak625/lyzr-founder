import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  BookOpen, 
  Plus, 
  X, 
  Upload, 
  Link as LinkIcon,
  FileText,
  Globe
} from 'lucide-react';

interface KnowledgeSource {
  id: string;
  type: 'url' | 'document' | 'faq';
  title: string;
  content: string;
}

const KnowledgeBaseManager = () => {
  const { toast } = useToast();
  const [sources, setSources] = useState<KnowledgeSource[]>([
    { id: '1', type: 'url', title: 'Company FAQ', content: 'https://company.com/faq' }
  ]);
  const [newUrl, setNewUrl] = useState('');
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');

  const addUrlSource = () => {
    if (!newUrl) return;
    const newSource: KnowledgeSource = {
      id: Date.now().toString(),
      type: 'url',
      title: `URL Source ${sources.filter(s => s.type === 'url').length + 1}`,
      content: newUrl
    };
    setSources([...sources, newSource]);
    setNewUrl('');
    toast({ title: "URL added to knowledge base" });
  };

  const addFaqSource = () => {
    if (!newFaqQuestion || !newFaqAnswer) return;
    const newSource: KnowledgeSource = {
      id: Date.now().toString(),
      type: 'faq',
      title: newFaqQuestion,
      content: newFaqAnswer
    };
    setSources([...sources, newSource]);
    setNewFaqQuestion('');
    setNewFaqAnswer('');
    toast({ title: "FAQ added to knowledge base" });
  };

  const removeSource = (id: string) => {
    setSources(sources.filter(s => s.id !== id));
    toast({ title: "Knowledge source removed" });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const newSource: KnowledgeSource = {
      id: Date.now().toString(),
      type: 'document',
      title: file.name,
      content: `Uploaded: ${file.name} (${file.size} bytes)`
    };
    setSources([...sources, newSource]);
    toast({ title: "Document uploaded to knowledge base" });
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'url': return <Globe className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      case 'faq': return <BookOpen className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Card className="shadow-card border-0 bg-gradient-card backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Knowledge Base Management
        </CardTitle>
        <CardDescription>
          Add multiple sources to train your AI agent
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Sources */}
        <div className="space-y-3">
          <Label>Current Knowledge Sources</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sources.map((source) => (
              <div key={source.id} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                {getSourceIcon(source.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{source.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{source.content}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {source.type}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeSource(source.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Add URL */}
        <div className="space-y-2">
          <Label>Add Website/URL</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://yoursite.com/docs"
                className="pl-10"
              />
            </div>
            <Button onClick={addUrlSource} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Upload Document */}
        <div className="space-y-2">
          <Label>Upload Document</Label>
          <div className="border-2 border-dashed border-muted rounded-lg p-4 text-center">
            <input
              type="file"
              id="document-upload"
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.txt,.md"
              className="hidden"
            />
            <label htmlFor="document-upload" className="cursor-pointer">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to upload PDF, DOC, TXT, or MD files
              </p>
            </label>
          </div>
        </div>

        {/* Add Custom FAQ */}
        <div className="space-y-2">
          <Label>Add Custom FAQ</Label>
          <div className="space-y-2">
            <Input
              value={newFaqQuestion}
              onChange={(e) => setNewFaqQuestion(e.target.value)}
              placeholder="What is your return policy?"
            />
            <Textarea
              value={newFaqAnswer}
              onChange={(e) => setNewFaqAnswer(e.target.value)}
              placeholder="Our return policy allows..."
              rows={2}
            />
            <Button onClick={addFaqSource} size="sm" className="w-full">
              <Plus className="h-4 w-4" />
              Add FAQ
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default KnowledgeBaseManager;