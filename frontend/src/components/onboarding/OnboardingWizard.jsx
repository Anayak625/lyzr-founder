import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthProvider';
import { useNavigate } from 'react-router-dom';

const OnboardingWizard = () => {
    const [isOpen, setIsOpen] = useState(true);
    const { completeOnboarding } = useAuth();
    const navigate = useNavigate();

    const handleComplete = () => {
        completeOnboarding();
        setIsOpen(false);
        window.location.href = '/app/agent'; 
    };

    return (
        <Dialog open={isOpen} onOpenChange={() => {}}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="text-primary"/> Welcome to LyzrFoundry!
                    </DialogTitle>
                    <DialogDescription>
                        You're all set. Let's create your first AI agent.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 text-center">
                    <div className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
                        <Sparkles className="h-12 w-12 text-primary animate-pulse" />
                    </div>
                    <h3 className="text-lg font-bold">Ready to Build?</h3>
                    <p className="text-sm text-muted-foreground px-4">
                        Click the button below to go to the Agents page where you can create and manage your first AI assistant.
                    </p>
                </div>
                <DialogFooter>
                    <Button onClick={handleComplete} className="w-full">
                        Let's Get Started <ArrowRight className="ml-2 h-4 w-4"/>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default OnboardingWizard;