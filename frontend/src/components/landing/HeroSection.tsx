import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, BarChart3, MessageSquare, Zap } from 'lucide-react';
import Navbar from '@/components/ui/navbar';

const HeroSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const features = [
    {
      icon: MessageSquare,
      title: 'Smart AI Agents',
      description: 'Deploy intelligent customer support agents that learn from your content'
    },
    {
      icon: BarChart3,
      title: 'Real-time Analytics',
      description: 'Get instant insights into customer interactions and satisfaction'
    },
    {
      icon: Zap,
      title: '60-Second Setup',
      description: 'From signup to live chat widget in under a minute'
    }
  ];

  return (
    <div className="min-h-screen">
      <Navbar/>
      {/* Hero Section */}
      <div className="relative overflow-hidden" style={{height:'100vh',display:'flex',alignItems:'center'}}>
        <div className="max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center space-y-8">
            <div className="mx-auto w-20 h-20 bg-gradient-primary rounded-3xl flex items-center justify-center shadow-glow animate-glow-pulse">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold tracking-tight">
                Build Smarter
                <span className="bg-gradient-primary bg-clip-text text-transparent"> Customer Support</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                LyzrFoundry helps founders create intelligent AI agents that provide instant, 
                accurate customer support while delivering actionable insights for growth.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <MagneticButton 
                size="lg" 
                variant="gradient" 
                onClick={() => navigate('/signup')}
                className="text-lg px-8 bg-gradient-primary text-primary-foreground rounded-full flex items-center group shadow-lg hover:shadow-primary/40 transition-shadow duration-300 py-2"
              >
                Start Free Trial
              </MagneticButton>
              <MagneticButton 
                size="lg" 
                variant="outline" 
                onClick={() => navigate('/login')}
                className="text-lg px-8 text-primary border rounded-full flex items-center group shadow-lg hover:shadow-primary/40 transition-shadow duration-300 py-2"
              >
                Sign In
              </MagneticButton>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="shadow-card border-0 bg-gradient-card backdrop-blur-sm hover:shadow-elegant transition-all duration-300 hover:scale-105">
                <CardHeader className="text-center">
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-primary/5 border-t border-primary/10">
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">Ready to transform your customer support?</h2>
            <p className="text-muted-foreground text-lg">
              Join hundreds of founders building smarter businesses with LyzrFoundry
            </p>
            <br />
            <MagneticButton 
              size="lg" 
              variant="gradient" 
              onClick={() => navigate('/signup')}
              className="text-lg px-8 bg-gradient-primary text-primary-foreground rounded-full  group shadow-lg hover:shadow-primary/40 transition-shadow duration-300 py-2"
            >
              Get Started Now
            </MagneticButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
