import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const FrequentQuestionsList = () => {
  // Mock data - replace with actual API data
  const questions = [
    {
      question: "How do I reset my password?",
      count: 127,
      percentage: 85
    },
    {
      question: "What are your pricing plans?",
      count: 89,
      percentage: 60
    },
    {
      question: "How can I cancel my subscription?",
      count: 73,
      percentage: 49
    },
    {
      question: "Do you offer technical support?",
      count: 56,
      percentage: 37
    },
    {
      question: "What payment methods do you accept?",
      count: 42,
      percentage: 28
    }
  ];

  return (
    <div className="space-y-4">
      {questions.map((item, index) => (
        <div key={index} className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium leading-relaxed">{item.question}</p>
            <Badge variant="secondary" className="text-xs">
              {item.count}
            </Badge>
          </div>
          <Progress value={item.percentage} className="h-2" />
        </div>
      ))}
    </div>
  );
};

export default FrequentQuestionsList;