import { Check } from 'lucide-react';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

const PricingSection = () => {
  const tiers = [
    {
      name: 'Hobby',
      price: '$0',
      description: 'For individuals and small projects getting started.',
      features: [
        '1 Agent',
        '500 monthly queries',
        'Basic Analytics',
        'Community Support'
      ],
      cta: 'Start for Free'
    },
    {
      name: 'Pro',
      price: '$49',
      description: 'For growing businesses that need more power.',
      features: [
        '5 Agents',
        '5,000 monthly queries',
        'Full Analytics Dashboard',
        'Agent Improvement Suggestions',
        'Email Support'
      ],
      cta: 'Get Started with Pro',
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      description: 'For large organizations with custom needs.',
      features: [
        'Unlimited Agents',
        'Custom query limits',
        'Advanced Security & SSO',
        'Dedicated Account Manager',
        'Priority Support'
      ],
      cta: 'Contact Sales'
    }
  ];

  return (
    <section id="price" className="py-20 sm:py-32 ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-5xl lg:text-5xl font-bold tracking-tight">
            Fair Pricing for <span className='bg-gradient-primary bg-clip-text text-transparent'>Every Stage</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
            Choose the plan that's right for your business. Start for free and scale as you grow.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {tiers.map((tier) => (
            <Card key={tier.name} className={`flex flex-col shadow-lg border-0 bg-gradient-card backdrop-blur-sm ${tier.popular ? 'border-primary border-2' : ''}`}>
              <CardHeader>
                {tier.popular && <div className="text-right text-primary font-bold">Most Popular</div>}
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="mb-6">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  {tier.price !== 'Custom' && <span className="text-muted-foreground">/ month</span>}
                </div>
                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter style={{display: 'flex', justifyContent: 'center', marginTop: 'auto'}}>
                 <MagneticButton
                   size="lg"
                   className={`text-lg px-8 hover:shadow-primary/40 transition-shadow duration-300 py-2  rounded-full flex items-center group shadow-lg ${tier.popular ? "bg-gradient-primary text-primary-foreground " : "text-primary border"}`}
                 >
                  {tier.cta}
                </MagneticButton>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;