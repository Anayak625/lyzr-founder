import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  TrendingUp, 
  Clock, 
  MessageSquare,
  ExternalLink 
} from 'lucide-react';

const ImprovementSuggestions = () => {
  // Mock data - replace with actual API data
  const suggestions = [
    {
      id: 1,
      title: "Add FAQ about pricing tiers",
      description: "15 customers asked about pricing differences. Consider adding a detailed FAQ section.",
      priority: "high",
      impact: "Reduce 23% of pricing inquiries",
      action: "Create FAQ",
      icon: MessageSquare
    },
    {
      id: 2,
      title: "Improve password reset instructions",
      description: "Users seem confused about the reset process. Simplify the instructions.",
      priority: "medium",
      impact: "Reduce support tickets by 18%",
      action: "Update Help Center",
      icon: TrendingUp
    },
    {
      id: 3,
      title: "Add live chat hours information",
      description: "Customers are asking about support availability. Add clear working hours.",
      priority: "low",
      impact: "Improve user expectations",
      action: "Update Widget",
      icon: Clock
    }
  ];

  const getPriorityColor = (priority: string): "default" | "destructive" | "outline" | "secondary" | "warning" => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-4">
      {suggestions.map((suggestion) => {
        const Icon = suggestion.icon;
        return (
          <div 
            key={suggestion.id} 
            className="p-4 rounded-lg bg-gradient-subtle border border-primary/10 hover:shadow-card transition-all duration-300"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{suggestion.title}</h4>
                  <Badge variant={getPriorityColor(suggestion.priority)} className="text-xs">
                    {suggestion.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-success font-medium">
                    <Lightbulb className="h-3 w-3 inline mr-1" />
                    {suggestion.impact}
                  </span>
                  <Button size="sm" variant="outline" className="text-xs">
                    {suggestion.action}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ImprovementSuggestions;