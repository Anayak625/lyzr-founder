import { MagneticButton } from "@/components/ui/MagneticButton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const ContactSection = () => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Thank you for your message!');
  };

  return (
    <section id="contact" className="py-20 sm:py-32">
       <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-5xl lg:text-5xl font-bold tracking-tight">
            Have Questions? <span className="bg-gradient-primary bg-clip-text text-transparent">Let's Talk.</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Whether you're an enterprise customer or just have a question, we're here to help.
          </p>
        </div>

        <div className="mt-12">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-1">Full Name</label>
                  <Input id="name" type="text" placeholder="Your Name" required />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1">Email Address</label>
                  <Input id="email" type="email" placeholder="you@company.com" required />
                </div>
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-muted-foreground mb-1">Message</label>
                <Textarea id="message" placeholder="How can we help you?" required rows={5}/>
              </div>
              <div className="text-left">
                <MagneticButton type="submit" size="lg" variant="gradient" className="text-lg px-8 bg-gradient-primary text-primary-foreground rounded-full flex items-center group shadow-lg hover:shadow-primary/40 transition-shadow duration-300 py-2">
                  Send Message
                </MagneticButton>
              </div>
            </form>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;