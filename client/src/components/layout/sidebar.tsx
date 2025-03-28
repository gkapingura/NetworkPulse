import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  HardDrive, 
  FileBarChart, 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  LogOut,
  Network,
  Router,
  Wifi
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";

export function Sidebar({ className }: { className?: string }) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  // Get network summary data for the sidebar stats
  const { data: summary } = useQuery<{
    totalDevices: number;
    onlineDevices: number;
    offlineDevices: number;
    activeAlerts: number;
  }>({
    queryKey: ["/api/network/summary"],
    staleTime: 60000, // 1 minute
  });

  const navItems = [
    {
      name: "Dashboard",
      path: "/",
      icon: <LayoutDashboard className="h-5 w-5" />
    },
    {
      name: "Devices",
      path: "/devices",
      icon: <HardDrive className="h-5 w-5" />
    },
    {
      name: "Routers",
      path: "/routers",
      icon: <Router className="h-5 w-5" />
    },
    {
      name: "Network Planning",
      path: "/network-planning",
      icon: <Network className="h-5 w-5" />
    },
    {
      name: "Reports",
      path: "/reports",
      icon: <FileBarChart className="h-5 w-5" />
    },
    {
      name: "Settings",
      path: "/settings",
      icon: <Settings className="h-5 w-5" />
    }
  ];

  return (
    <div className={cn("flex flex-col w-64 bg-white border-r border-border", className)}>
      <div className="flex items-center justify-center h-16 px-4 bg-primary">
        <h1 className="text-xl font-semibold text-white">BHC Network Pulse</h1>
      </div>
      
      <div className="flex flex-col flex-grow px-4 py-4 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <Button
                variant={location === item.path ? "default" : "ghost"}
                className={cn(
                  "flex items-center w-full justify-start", 
                  location === item.path 
                    ? "bg-primary text-white" 
                    : "text-foreground hover:bg-background"
                )}
              >
                {item.icon}
                <span className="ml-3">{item.name}</span>
              </Button>
            </Link>
          ))}
        </div>
        
        <Separator className="my-6" />
        
        <div className="space-y-3">
          <div className="flex items-center">
            <AlertTriangle className="h-4 w-4 mr-3 text-foreground" />
            <span className="text-sm font-medium text-foreground">
              {summary?.activeAlerts || 0} Alerts
            </span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 mr-3 text-success" />
            <span className="text-sm font-medium text-foreground">
              {summary?.onlineDevices || 0} Devices Online
            </span>
          </div>
          <div className="flex items-center">
            <XCircle className="h-4 w-4 mr-3 text-danger" />
            <span className="text-sm font-medium text-foreground">
              {summary?.offlineDevices || 0} Devices Offline
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex flex-shrink-0 p-4 border-t border-border">
        <div className="flex items-center w-full">
          <div className="flex-shrink-0">
            <span className="inline-block h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
              <span className="text-sm font-medium">
                {user?.fullName ? user.fullName.charAt(0).toUpperCase() : user?.username.charAt(0).toUpperCase()}
              </span>
            </span>
          </div>
          <div className="ml-3 flex-grow overflow-hidden">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.fullName || user?.username}
            </p>
            <p className="text-xs text-gray-500 truncate">
              Network Admin
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
