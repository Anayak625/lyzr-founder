import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Clock, 
  User, 
  Search,
  Filter,
  MoreVertical,
  Eye,
  CheckCircle
} from 'lucide-react';

const TicketsContent = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data - replace with actual API calls
  const tickets = [
    {
      id: 'T-001',
      customer: 'john.doe@email.com',
      subject: 'Cannot reset password',
      status: 'open',
      priority: 'high',
      createdAt: '2 hours ago',
      messages: 5,
      lastMessage: 'I still cannot access my account after trying the reset link...'
    },
    {
      id: 'T-002',
      customer: 'sarah.wilson@company.com',
      subject: 'Billing question about annual plan',
      status: 'pending',
      priority: 'medium',
      createdAt: '4 hours ago',
      messages: 3,
      lastMessage: 'When will my annual subscription be activated?'
    },
    {
      id: 'T-003',
      customer: 'mike.johnson@startup.io',
      subject: 'Feature request: Custom branding',
      status: 'resolved',
      priority: 'low',
      createdAt: '1 day ago',
      messages: 8,
      lastMessage: 'Thank you for the detailed explanation about the roadmap.'
    },
    {
      id: 'T-004',
      customer: 'lisa.chen@tech.com',
      subject: 'Integration with Slack not working',
      status: 'open',
      priority: 'high',
      createdAt: '6 hours ago',
      messages: 2,
      lastMessage: 'The webhook URL seems to be returning a 404 error...'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'destructive';
      case 'pending': return 'secondary';
      case 'resolved': return 'default';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const filteredTickets = tickets.filter(ticket =>
    ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.customer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
          <p className="text-muted-foreground">
            Manage conversations flagged for human review
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="text-xs">
            2 urgent
          </Badge>
          <Badge variant="secondary" className="text-xs">
            1 pending
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-card border-0 bg-gradient-card backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <div className="space-y-4">
        {filteredTickets.map((ticket) => (
          <Card key={ticket.id} className="shadow-card border-0 bg-gradient-card backdrop-blur-sm hover:shadow-elegant transition-all duration-300">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-sm text-muted-foreground">{ticket.id}</span>
                    </div>
                    <Badge variant={getStatusColor(ticket.status)} className="text-xs">
                      {ticket.status}
                    </Badge>
                    <Badge variant={getPriorityColor(ticket.priority)} className="text-xs">
                      {ticket.priority}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-medium">{ticket.subject}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {ticket.lastMessage}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {ticket.customer}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {ticket.createdAt}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {ticket.messages} messages
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                  {ticket.status === 'open' && (
                    <Button size="sm" variant="default">
                      <CheckCircle className="h-4 w-4" />
                      Resolve
                    </Button>
                  )}
                  <Button size="sm" variant="ghost">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTickets.length === 0 && (
        <Card className="shadow-card border-0 bg-gradient-card backdrop-blur-sm">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="font-medium">No tickets found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'Try adjusting your search terms' : 'All conversations are being handled automatically!'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TicketsContent;