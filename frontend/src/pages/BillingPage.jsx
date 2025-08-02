// src/pages/BillingPage.jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPlans, fetchSubscription, createSubscription } from '@/api';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import useRazorpay from '@/hooks/useRazorpay';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Crown, Zap, Loader2, AlertCircle } from 'lucide-react';

const BillingPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const isRazorpayLoaded = useRazorpay();

    const { data, isLoading, error } = useQuery({
        queryKey: ['billingDetails'],
        queryFn: async () => {
            const [plans, subscription] = await Promise.all([fetchPlans(), fetchSubscription()]);
            return { plans: plans.results, subscription };
        }
    });

    const subscriptionMutation = useMutation({
        mutationFn: createSubscription,
        onSuccess: (razorpayData) => {
            if (!isRazorpayLoaded) {
                toast({ title: 'Payment gateway is not ready yet. Please wait a moment.', variant: 'destructive' });
                return;
            }
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                subscription_id: razorpayData.razorpay_subscription_id,
                name: "LyzrFoundry Pro Plan",
                handler: function () {
                    toast({ title: "Payment Successful!", description: "Your plan has been upgraded." });
                    queryClient.invalidateQueries({ queryKey: ['billingDetails'] });
                    queryClient.invalidateQueries({ queryKey: ['dashboardAnalytics'] }); // Also refresh dashboard
                },
                prefill: { name: user.full_name, email: user.email },
                theme: { color: "#16a34a" },
            };
            const rzp = new window.Razorpay(options);
            rzp.open();
        },
        onError: (err) => toast({ title: "Upgrade Failed", description: err.response?.data?.detail || "Could not start subscription.", variant: "destructive" })
    });

    if (isLoading) {
        return <div className="space-y-6"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-40 w-full" /><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><Skeleton className="h-80" /><Skeleton className="h-80" /><Skeleton className="h-80" /></div></div>;
    }
    if (error) return <div className="p-4 bg-destructive/10 border-destructive rounded-md flex items-center gap-3"><AlertCircle />Could not load billing details.</div>;

    const { plans = [], subscription } = data || {};
    const currentPlanName = subscription?.plan?.name || 'Free';
    const currentPlanPrice = subscription?.plan?.price || '0.00';

    return (
        <div className="space-y-8">
            <CardHeader className="px-0">
                <CardTitle className="text-3xl font-bold tracking-tight">Billing & Plans</CardTitle>
                <CardDescription>Manage your subscription and explore upgrade options.</CardDescription>
            </CardHeader>
            <Card>
                <CardHeader><CardTitle>Current Plan</CardTitle></CardHeader>
                <CardContent className="bg-muted/50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold flex items-center gap-2" style={{alignItems:'center',justifyContent:'space-between'}}> <span style={{display:'flex',gap:'10px',alignItems:'center'}}><Crown className="h-5 w-5 text-amber-500" />{currentPlanName} Plan</span>  <span>₹ {currentPlanPrice}</span></h3>
                </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map(plan => (
                    <Card key={plan.id} className={`${currentPlanName === plan.name ? 'border-2 border-primary' : ''} flex flex-col`}>
                        <CardHeader>
                            <CardTitle>{plan.name}</CardTitle>
                            <p className="text-3xl font-bold pt-2">₹{plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                        </CardHeader>
                        <CardContent className="flex flex-col flex-grow">
                           <ul className="space-y-3 flex-grow mb-6">
                                {Object.entries(plan.features).map(([key, value]) => (
                                    <li key={key} className="flex items-start gap-3 text-sm">
                                        <Check className="h-4 w-4 mt-1 text-green-500 flex-shrink-0" />
                                        <span><strong>{value.toLocaleString()}</strong> {key.replace(/_/g, ' ')}</span>
                                    </li>
                                ))}
                            </ul>
                            {currentPlanName === plan.name ? (
                                <Button disabled variant="outline" className="w-full">Your Current Plan</Button>
                            ) : plan.price > 0 ? (
                                <Button onClick={() => subscriptionMutation.mutate(plan.id)} disabled={subscriptionMutation.isPending} className="w-full">
                                    {subscriptionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                                    Upgrade to {plan.name}
                                </Button>
                            ) : (
                                <Button variant="secondary" className="w-full" disabled>Contact Sales</Button>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default BillingPage;