import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: LucideIcon;
  description?: string;
}

const KpiCard = ({ title, value, change, trend, icon: Icon, description }: KpiCardProps) => {
  return (
    <Card className="shadow-card border-0 bg-gradient-card backdrop-blur-sm hover:shadow-elegant transition-all duration-300 hover:scale-105">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold">{value}</div>
          <div className="flex items-center justify-between">
            <Badge 
              variant={trend === 'up' ? 'default' : 'destructive'} 
              className="text-xs"
            >
              {change}
            </Badge>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default KpiCard;