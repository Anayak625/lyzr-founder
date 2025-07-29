import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const tiers = [
  {
    name: 'Hobby',
    price: 'Free',
    features: ['1 Agent', '100 Messages/Month', '2 Knowledge Sources', 'Community Support'],
    cta: 'Get Started',
    href: '/signup'
  },
  {
    name: 'Pro',
    price: '$49',
    price_desc: '/ month',
    features: ['5 Agents', '10,000 Messages/Month', 'Unlimited Sources', 'Email Support', 'Remove Branding'],
    cta: 'Start Pro Trial',
    href: '/signup',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    features: ['Unlimited Agents', 'Custom Message Volume', 'Dedicated Support', 'SSO & Advanced Security', 'API Access'],
    cta: 'Contact Sales',
    href: '/contact'
  }
]

const PricingSection = () => {
    return (
        <section className="py-20 px-4">
            <div className="container mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold">Simple, Transparent Pricing</h2>
                    <p className="text-muted-foreground mt-2">Choose the plan that's right for your needs.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {tiers.map(tier => (
                        <div key={tier.name} className={`rounded-xl border p-8 flex flex-col ${tier.featured ? 'border-primary shadow-lg' : ''}`}>
                            <h3 className="text-lg font-semibold">{tier.name}</h3>
                            <p className="mt-4">
                                <span className="text-4xl font-bold">{tier.price}</span>
                                {tier.price_desc && <span className="text-muted-foreground">{tier.price_desc}</span>}
                            </p>
                            <ul className="mt-8 space-y-4 flex-grow">
                                {tier.features.map(feature => (
                                    <li key={feature} className="flex items-center gap-3">
                                        <Check className="h-5 w-5 text-green-500" />
                                        <span className="text-sm">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <Button asChild className="mt-8 w-full" variant={tier.featured ? 'default' : 'outline'}>
                                <Link to={tier.href}>{tier.cta}</Link>
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default PricingSection;