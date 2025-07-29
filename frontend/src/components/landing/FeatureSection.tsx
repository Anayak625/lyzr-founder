import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BrainCircuit, UploadCloud, Palette, MessageSquare, ShieldCheck, BarChart } from 'lucide-react';

const features = [
  { icon: BrainCircuit, title: 'Custom Knowledge Base', description: 'Train your AI on documents, websites, and text. Your data, your AI.' },
  { icon: Palette, title: 'Brand-Aligned Widgets', description: 'Customize the chat widget to match your brand’s look and feel perfectly.' },
  { icon: MessageSquare, title: 'Real-Time Testing', description: 'Interact with your agent in a live playground for instant feedback and iteration.' },
  { icon: ShieldCheck, title: 'Role-Based Access', description: 'Collaborate with your team by inviting members and managing their permissions.' },
  { icon: BarChart, title: 'Actionable Analytics', description: 'Gain insights into agent performance and user interactions with a powerful dashboard.' },
  { icon: UploadCloud, title: 'Easy Deployment', description: 'Embed your fully trained AI agent on any website with a single line of code.' },
];

const FeatureSection = () => {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mt-4">Everything You Need to Succeed</h1>
          <p className="text-muted-foreground mt-2">A comprehensive toolkit for building production-ready AI agents.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureSection;