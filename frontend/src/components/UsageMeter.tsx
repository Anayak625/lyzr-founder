import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, TrendingUp } from 'lucide-react';

const UsageMeter = () => {
  // Mock data - replace with actual API data
  const usage = {
    current: 412,
    limit: 1000,
    percentage: 41.2
  };

  const getUsageColor = (percentage: number): "default" | "destructive" | "outline" | "secondary" | "warning" => {
    if (percentage >= 90) return 'destructive';
    if (percentage >= 70) return 'warning';
    return 'default';
  };

  return (
    <Card className="shadow-card border-0 bg-gradient-card backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              API Usage
            </CardTitle>
            <CardDescription>
              Monthly query consumption
            </CardDescription>
          </div>
          <Badge variant={getUsageColor(usage.percentage)} className="text-xs">
            {usage.percentage.toFixed(1)}% used
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{usage.current.toLocaleString()} queries</span>
            <span className="text-muted-foreground">of {usage.limit.toLocaleString()}</span>
          </div>
          <Progress value={usage.percentage} className="h-2" />
        </div>
        
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>+12% vs last month</span>
          </div>
          <Button size="sm" variant="outline">
            Upgrade Plan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UsageMeter;