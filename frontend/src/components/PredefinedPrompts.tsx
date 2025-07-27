import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Zap, 
  ShoppingCart, 
  Headphones, 
  Heart, 
  Briefcase,
  GraduationCap,
  Stethoscope,
  Home,
  Utensils,
  Plane
} from 'lucide-react';

interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  icon: React.ReactNode;
  description: string;
  prompt: string;
}

const PredefinedPrompts = () => {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

  const promptTemplates: PromptTemplate[] = [
    {
      id: 'ecommerce',
      name: 'E-commerce Support',
      category: 'Sales',
      icon: <ShoppingCart className="h-4 w-4" />,
      description: 'Perfect for online stores and product support',
      prompt: 'You are a helpful e-commerce customer support specialist. Your role is to assist customers with product inquiries, order tracking, returns, and general shopping questions. Always be friendly, informative, and aim to increase customer satisfaction. When customers ask about products, provide detailed information and suggest related items when appropriate. For order issues, guide them through the resolution process step by step.'
    },
    {
      id: 'saas',
      name: 'SaaS Support',
      category: 'Technology',
      icon: <Briefcase className="h-4 w-4" />,
      description: 'Ideal for software companies and tech support',
      prompt: 'You are a knowledgeable SaaS customer success specialist. Your goal is to help users get the most value from our software platform. Provide clear, step-by-step technical guidance, troubleshoot issues efficiently, and educate users about features they might not be aware of. Always maintain a professional yet approachable tone, and don\'t hesitate to provide links to documentation or suggest scheduling a demo when needed.'
    },
    {
      id: 'healthcare',
      name: 'Healthcare Assistant',
      category: 'Healthcare',
      icon: <Stethoscope className="h-4 w-4" />,
      description: 'For medical practices and health services',
      prompt: 'You are a compassionate healthcare support assistant. Your role is to help patients with appointment scheduling, general health information, and navigating healthcare services. Always maintain patient confidentiality, speak with empathy, and make it clear that you cannot provide medical diagnoses or replace professional medical advice. Guide users to appropriate resources and encourage them to consult with healthcare professionals for medical concerns.'
    },
    {
      id: 'education',
      name: 'Educational Support',
      category: 'Education',
      icon: <GraduationCap className="h-4 w-4" />,
      description: 'Great for schools and learning platforms',
      prompt: 'You are an enthusiastic educational support assistant. Your mission is to help students, parents, and educators with course information, enrollment processes, academic resources, and general educational guidance. Be encouraging, patient, and always promote the value of learning. Provide clear explanations and point users toward additional educational resources when helpful.'
    },
    {
      id: 'hospitality',
      name: 'Hospitality & Travel',
      category: 'Service',
      icon: <Plane className="h-4 w-4" />,
      description: 'Perfect for hotels, restaurants, and travel',
      prompt: 'You are a warm and welcoming hospitality assistant. Your role is to enhance guest experiences by providing information about services, amenities, local attractions, and resolving any concerns. Always maintain a friendly, professional demeanor that reflects the high standards of hospitality. Help guests make the most of their stay or visit, and ensure every interaction leaves them with a positive impression.'
    },
    {
      id: 'real-estate',
      name: 'Real Estate',
      category: 'Real Estate',
      icon: <Home className="h-4 w-4" />,
      description: 'For realtors and property management',
      prompt: 'You are a knowledgeable real estate assistant. Your goal is to help potential buyers, sellers, and renters with property inquiries, market information, and connecting them with the right real estate professionals. Be informative about the local market, helpful with property details, and always aim to build trust and confidence in our real estate services.'
    }
  ];

  const handleSelectTemplate = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    setCustomPrompt(template.prompt);
    toast({
      title: "Template selected",
      description: `${template.name} prompt loaded for customization.`,
    });
  };

  const handleSavePrompt = () => {
    toast({
      title: "Prompt saved",
      description: "Your custom agent personality has been updated.",
    });
  };

  return (
    <Card className="shadow-card border-0 bg-gradient-card backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Predefined Prompts & Personalities
        </CardTitle>
        <CardDescription>
          Choose from industry-specific templates or create your own
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {promptTemplates.map((template) => (
            <div
              key={template.id}
              className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                selectedTemplate?.id === template.id 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => handleSelectTemplate(template)}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  {template.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-sm truncate">{template.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {template.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {template.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Custom Prompt Editor */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Custom Agent Personality</h3>
            {selectedTemplate && (
              <Badge variant="secondary" className="text-xs">
                Based on: {selectedTemplate.name}
              </Badge>
            )}
          </div>
          
          <Textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Describe your agent's personality, role, and how it should interact with customers..."
            className="min-h-32 resize-none"
            rows={6}
          />
          
          <div className="flex gap-2">
            <Button onClick={handleSavePrompt} variant="gradient" className="flex-1">
              Save Custom Prompt
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setCustomPrompt('');
                setSelectedTemplate(null);
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PredefinedPrompts;