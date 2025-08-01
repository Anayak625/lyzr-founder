import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, EyeOff, Mail, Lock, User, Sparkles, Loader2, KeyRound } from 'lucide-react';
import { verifyOTP } from '@/api';

const Signup = () => {
  const [step, setStep] = useState('register');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { signup, login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signup(email, password, fullName);
      toast({
        title: 'Account created!',
        description: "We've sent an OTP to your email. Please check and verify.",
      });
      setStep('verify');
    } catch (error) {
      const errorData = error.response?.data;
      const errorMessage = errorData ? Object.values(errorData).flat().join(' ') : 'An unexpected error occurred.';
      toast({
        title: 'Signup failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await verifyOTP({ email, otp });
      toast({
        title: 'Email Verified!',
        description: 'Logging you in...',
      });
      await login(email, password);
      navigate('/app');
    } catch (error) {
      toast({
        title: 'Verification Failed',
        description: error.response?.data?.error || 'Invalid or expired OTP.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 mt-5" style={{ minHeight: '100vh' }}>
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <Link to="/" className="inline-block">
            <div className="mx-auto w-20 h-20 bg-gradient-primary rounded-3xl flex items-center justify-center shadow-glow">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Create your account
          </h1>
          <p className="text-muted-foreground">
            Start building intelligent agents in minutes.
          </p>
        </div>

        <Card className="shadow-elegant border-0 bg-card backdrop-blur-sm">
          <CardContent className="py-6 px-4 sm:px-6">
            {step === 'register' ? (
              <form onSubmit={handleRegisterSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="pl-10" placeholder="Enter your full name" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10" placeholder="Enter your email" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength="8" className="pl-10 pr-10" placeholder="Create a strong password" />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 h-8 w-8" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Account'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifySubmit} className="space-y-5">
                <div className="space-y-2 text-center">
                  <h2 className="text-xl font-semibold">Verify Your Email</h2>
                  <p className="text-muted-foreground text-sm">
                    Enter the 6-digit OTP sent to <strong>{email}</strong>.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otp">OTP Code</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="otp" type="text" value={otp} onChange={(e) => setOtp(e.target.value)} required maxLength="6" className="pl-10" placeholder="Enter your 6-digit OTP" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify and Sign Up'}
                </Button>
              </form>
            )}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;