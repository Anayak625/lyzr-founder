import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthProvider';
import { LayoutDashboard, Cog, Inbox, LogOut, User, Sparkles, Users, CreditCard } from 'lucide-react'; // Added Users
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
    { name: 'Agents', href: '/app/agent', icon: Cog },
    { name: 'Tickets', href: '/app/tickets', icon: Inbox },
    { name: 'Team', href: '/app/team', icon: Users }, 
    { name: 'Billing', href: '/app/billing', icon: CreditCard },
  ];

  const isActive = (path) => {
    if (path === '/app/agent') return location.pathname === path;
    return location.pathname.startsWith(path);
  }

  const joinDate = user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'N/A';

  return (
    <div className="hidden lg:flex h-screen w-64 flex-col bg-card border-r">
      <div className="flex h-16 items-center px-6 border-b">
        <Link to="/app" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">LyzrFoundry</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navigation.map((item) => (
          <Button
            key={item.name}
            asChild
            variant={isActive(item.href) ? 'secondary' : 'ghost'}
            className="w-full justify-start gap-3"
          >
            <Link to={item.href}>
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          </Button>
        ))}
      </nav>
      <div className="border-t p-4">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger className="w-full">
                    <div className="flex items-center gap-3 mb-4 text-left p-2 rounded-lg hover:bg-muted">
                    <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user?.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                    <p>Joined on: {joinDate}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
        <Button
          variant="outline"
          className="w-full justify-center gap-2"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;