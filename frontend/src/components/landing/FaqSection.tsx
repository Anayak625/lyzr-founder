import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const faqData = [
  {
    question: 'How does the AI learn about my specific business?',
    answer: 'It\'s simple! You provide a URL to your existing documentation, FAQ page, or knowledge base. Our system, powered by Lyzr, reads and understands that content to create a specialized agent that can answer questions accurately based on your information.'
  },
  {
    question: 'Is it hard to install on my website?',
    answer: 'Not at all. After you create your agent, we give you a single line of JavaScript code. You just copy and paste this snippet into your website\'s HTML before the closing `</body>` tag. It works with Webflow, WordPress, Squarespace, or any custom-built site.'
  },
  {
    question: 'What happens if the AI can\'t answer a question?',
    answer: 'Our system is designed for this. If the AI is not confident in its answer, it won\'t guess. Instead, it can create a support ticket that appears in your dashboard for a human to review. This ensures your customers always get the help they need.'
  },
  {
    question: 'Can I customize the look of the chat widget?',
    answer: 'Yes! From your dashboard, you can easily change the colors, welcome message, and agent avatar to perfectly match your brand\'s look and feel.'
  }
];

const FaqItem = ({ item }: { item: typeof faqData[0] }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full py-5 text-left"
      >
        <span className="text-lg font-medium">{item.question}</span>
        <ChevronDown
          className={`h-6 w-6 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-gray-600">{item.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FaqSection: React.FC = () => {
  return (
    <div className="py-24 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Frequently Asked Questions</h2>
          <p className="mt-4 text-lg text-gray-600">
            Have questions? We have answers.
          </p>
        </div>
        <div className="mt-12">
          {faqData.map((item, index) => (
            <FaqItem key={index} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FaqSection;