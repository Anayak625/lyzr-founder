import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Crown, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthProvider';

// This data would typically come from an API call related to the user's subscription
const userPlan = { name: 'Hobby', price: '$0/month' };
const availablePlans = [
    { name: 'Hobby', price: '$0', features: ['1 Agent', '100 messages/mo', 'Basic Support'], current: true },
    { name: 'Pro', price: '$49/mo', features: ['5 Agents', '10k messages/mo', 'Remove Branding', 'Email Support'], cta: 'Upgrade to Pro' },
    { name: 'Enterprise', price: 'Custom', features: ['Unlimited Agents', 'Custom Volume', 'Dedicated Support', 'SSO'], cta: 'Contact Sales' }
];

const BillingPage = () => {
    const { user } = useAuth();
    
    return (
        <div className="space-y-6">
            <CardHeader className="px-0">
                <CardTitle className="text-3xl font-bold tracking-tight">Billing & Plans</CardTitle>
                <CardDescription>Manage your subscription and explore upgrade options.</CardDescription>
            </CardHeader>

            <Card>
                <CardHeader>
                    <CardTitle>Current Plan</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-between items-center bg-muted/50 p-6 rounded-lg">
                    <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                           <Crown className="h-5 w-5 text-amber-500" /> {userPlan.name} Plan
                        </h3>
                        <p className="text-muted-foreground">{user?.email}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold">{userPlan.price}</p>
                        <p className="text-xs text-muted-foreground">Next billing date: N/A</p>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {availablePlans.map(plan => (
                    <Card key={plan.name} className={plan.name === 'Pro' ? 'border-primary' : ''}>
                        <CardHeader>
                            <CardTitle>{plan.name}</CardTitle>
                            <p className="text-3xl font-bold pt-2">{plan.price}</p>
                        </CardHeader>
                        <CardContent className="flex flex-col h-full">
                           <ul className="space-y-3 flex-grow mb-6">
                                {plan.features.map(feature => (
                                    <li key={feature} className="flex items-start gap-3 text-sm">
                                        <Check className="h-4 w-4 mt-1 text-green-500 flex-shrink-0" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <Button disabled={plan.current} className="w-full">
                                {plan.current ? 'Your Current Plan' : <><Zap className="mr-2 h-4 w-4"/>{plan.cta}</>}
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default BillingPage;