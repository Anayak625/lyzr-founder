import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Palette, 
  MessageCircle, 
  Smartphone,
  Eye
} from 'lucide-react';

const AdvancedWidgetCustomization = () => {
  const [widgetColor, setWidgetColor] = useState('#3B82F6');
  const [widgetPosition, setWidgetPosition] = useState('bottom-right');
  const [welcomeMessage, setWelcomeMessage] = useState('Hi! How can I help you today?');
  const [placeholderText, setPlaceholderText] = useState('Type your message...');
  const [showCompanyLogo, setShowCompanyLogo] = useState(true);
  const [widgetSize, setWidgetSize] = useState('medium');
  const [borderRadius, setBorderRadius] = useState('rounded');
  const [animationStyle, setAnimationStyle] = useState('bounce');

  return (
    <Card className="shadow-card border-0 bg-gradient-card backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Advanced Widget Customization
        </CardTitle>
        <CardDescription>
          Personalize your chat widget appearance and behavior
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Colors & Styling */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Primary Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={widgetColor}
                onChange={(e) => setWidgetColor(e.target.value)}
                className="w-16 h-10 p-1 border"
              />
              <Input
                value={widgetColor}
                onChange={(e) => setWidgetColor(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Widget Size</Label>
            <Select value={widgetSize} onValueChange={setWidgetSize}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Border Style</Label>
            <Select value={borderRadius} onValueChange={setBorderRadius}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sharp">Sharp Corners</SelectItem>
                <SelectItem value="rounded">Rounded</SelectItem>
                <SelectItem value="pill">Pill Shape</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Animation</Label>
            <Select value={animationStyle} onValueChange={setAnimationStyle}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Animation</SelectItem>
                <SelectItem value="bounce">Bounce</SelectItem>
                <SelectItem value="pulse">Pulse</SelectItem>
                <SelectItem value="shake">Shake</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Position & Behavior */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Widget Position</Label>
            <Select value={widgetPosition} onValueChange={setWidgetPosition}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bottom-right">Bottom Right</SelectItem>
                <SelectItem value="bottom-left">Bottom Left</SelectItem>
                <SelectItem value="top-right">Top Right</SelectItem>
                <SelectItem value="top-left">Top Left</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Company Logo</Label>
              <p className="text-sm text-muted-foreground">
                Display your logo in the widget header
              </p>
            </div>
            <Switch
              checked={showCompanyLogo}
              onCheckedChange={setShowCompanyLogo}
            />
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Welcome Message</Label>
            <Textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="First message users see..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Input Placeholder</Label>
            <Input
              value={placeholderText}
              onChange={(e) => setPlaceholderText(e.target.value)}
              placeholder="Placeholder text..."
            />
          </div>
        </div>

        {/* Live Preview */}
        <div className="p-6 bg-muted rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="h-4 w-4" />
            <span className="text-sm font-medium">Live Preview</span>
          </div>
          
          <div className="relative h-64 bg-gradient-to-br from-background to-muted/50 rounded-lg border overflow-hidden">
            {/* Mock website content */}
            <div className="p-4 space-y-2">
              <div className="h-4 bg-muted-foreground/20 rounded w-3/4"></div>
              <div className="h-4 bg-muted-foreground/20 rounded w-1/2"></div>
              <div className="h-4 bg-muted-foreground/20 rounded w-2/3"></div>
            </div>
            
            {/* Widget preview */}
            <div className={`absolute ${widgetPosition.includes('bottom') ? 'bottom-4' : 'top-4'} ${widgetPosition.includes('right') ? 'right-4' : 'left-4'}`}>
              <div 
                className={`w-12 h-12 flex items-center justify-center text-white font-medium cursor-pointer shadow-lg ${
                  borderRadius === 'sharp' ? 'rounded-none' : 
                  borderRadius === 'rounded' ? 'rounded-lg' : 'rounded-full'
                } ${animationStyle === 'bounce' ? 'animate-bounce' : ''}`}
                style={{ backgroundColor: widgetColor }}
              >
                <MessageCircle className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>

        <Button variant="outline" className="w-full">
          <Smartphone className="h-4 w-4" />
          Preview on Mobile
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdvancedWidgetCustomization;