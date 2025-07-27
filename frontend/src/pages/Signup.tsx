// src/pages/Signup.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, EyeOff, Mail, Lock, User, Sparkles } from 'lucide-react';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const { setShowOnboarding } = useOnboarding();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signup(email, password, name);
      toast({
        title: "Account created!",
        description: "Welcome to LyzrFoundry. Let's get you set up.",
      });
      setShowOnboarding(true);
      navigate('/dashboard');
    } catch (error) {
      const errorData = error.response?.data;
      const errorMessage = errorData ? Object.values(errorData).flat().join(' ') : "Please try again with different credentials.";
      toast({
        title: "Signup failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-gradient-primary rounded-3xl flex items-center justify-center shadow-glow">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
        </div>
        <Card className="shadow-elegant border-0 bg-gradient-card backdrop-blur-sm">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Form fields remain the same */}
              <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required className="pl-10" />
                  </div>
              </div>
              <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10" />
                  </div>
              </div>
              <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-10" />
                      <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 h-8 w-8" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                  </div>
              </div>
              <Button type="submit" variant="gradient" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account? <Link to="/login" className="text-primary font-medium">Sign in</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;