const TrendsChart = () => {
  // Mock data - replace with actual API data
  const data = [
    { day: 'Mon', chats: 45, percentage: 60 },
    { day: 'Tue', chats: 52, percentage: 70 },
    { day: 'Wed', chats: 61, percentage: 82 },
    { day: 'Thu', chats: 48, percentage: 64 },
    { day: 'Fri', chats: 73, percentage: 98 },
    { day: 'Sat', chats: 38, percentage: 51 },
    { day: 'Sun', chats: 42, percentage: 56 },
  ];

  const maxChats = Math.max(...data.map(d => d.chats));

  return (
    <div className="h-[300px] w-full space-y-4">
      {/* Simple bar chart */}
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-8 text-xs font-medium text-muted-foreground">
              {item.day}
            </div>
            <div className="flex-1">
              <div className="relative h-6 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-primary rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
            <div className="w-12 text-right text-xs font-medium">
              {item.chats}
            </div>
          </div>
        ))}
      </div>
      
      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-primary/10">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">This week</span>
          <span className="font-medium">{data.reduce((sum, d) => sum + d.chats, 0)} total chats</span>
        </div>
      </div>
    </div>
  );
};

export default TrendsChart;