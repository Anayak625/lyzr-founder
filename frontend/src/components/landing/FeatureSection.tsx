import { BarChart3, Presentation, SlidersHorizontal, Bot } from 'lucide-react';
import { Card } from '@/components/ui/card'; // Use your existing card component

const FeatureSection = () => {
  return (
    <section id="feature" className="py-20 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-5xl lg:text-5xl font-bold tracking-tight">
            Go Beyond a <span className='bg-gradient-primary bg-clip-text text-transparent'>Simple Chatbot</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
            LyzrFoundry is built with features that give founders the data and efficiency they need to grow.
          </p>
        </div>

        <div className="mt-16 space-y-20">
          {/* Feature 1: Analytics Dashboard */}
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">Actionable Analytics Dashboard</h3>
              </div>
              <p className="text-muted-foreground text-lg">
                Don't just answer tickets, understand your customers. Our dashboard transforms raw chat data into actionable business intelligence. See what your customers are asking for most, and improve your business proactively.
              </p>
            </div>
            <Card className="p-6 bg-gradient-card shadow-lg aspect-video">
              {/* TODO: Replace with an actual screenshot of the dashboard */}
              <div className="w-full h-full bg-gray-700 rounded-lg flex items-center justify-center text-gray-400">
                Dashboard Screenshot
              </div>
            </Card>
          </div>

          {/* Feature 2: Seamless Onboarding */}
          <div className="grid md:grid-cols-2 gap-10 items-center">
             <Card className="p-6 bg-gradient-card shadow-lg aspect-video order-last md:order-first">
              {/* TODO: Replace with a screenshot of the onboarding wizard */}
              <div className="w-full h-full bg-gray-700 rounded-lg flex items-center justify-center text-gray-400">
                Onboarding Flow Screenshot
              </div>
            </Card>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Presentation className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">Seamless 60-Second Onboarding</h3>
              </div>
              <p className="text-muted-foreground text-lg">
                A user who gets value fast is a user who stays. Our guided tour takes new users from sign-up to a live, working chat widget on their website in under a minute. No friction, no confusion.
              </p>
            </div>
          </div>
          
           {/* Feature 3: Proactive Tuning */}
           <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <SlidersHorizontal className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">Self-Improving AI Agents</h3>
              </div>
              <p className="text-muted-foreground text-lg">
                Create a data-driven feedback loop. Our simple "👍 / 👎" feature logs failed questions and gives you suggestions on how to improve your agent's knowledge base, turning your AI into a constantly learning asset.
              </p>
            </div>
            <Card className="p-6 bg-gradient-card shadow-lg aspect-video">
              {/* TODO: Replace with a screenshot of the agent suggestions UI */}
              <div className="w-full h-full bg-gray-700 rounded-lg flex items-center justify-center text-gray-400">
                Agent Suggestions Screenshot
              </div>
            </Card>
          </div>

        </div>
      </div>
    </section>
  );
};

export default FeatureSection;