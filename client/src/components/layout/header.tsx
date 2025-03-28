import { useState } from "react";
import { useLocation } from "wouter";
import { 
  Search, 
  Bell, 
  HelpCircle, 
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const pageTitles: Record<string, string> = {
  "/": "Dashboard Overview",
  "/devices": "Device Management",
  "/reports": "Reports & Analytics",
  "/settings": "Settings"
};

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  
  const currentTitle = location.startsWith("/devices/") 
    ? "Device Details" 
    : pageTitles[location] || "Network Monitor";

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    // Implement search functionality here
    console.log("Search for:", searchQuery);
  }

  return (
    <header className="flex-shrink-0 bg-white border-b border-border">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-foreground mr-2"
            onClick={onMobileMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold ml-0 md:ml-0">{currentTitle}</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <form onSubmit={handleSearch} className="relative hidden md:block">
            <Input
              type="text"
              placeholder="Search devices..."
              className="w-64 pl-10 pr-4 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          </form>
          
          <Button variant="ghost" size="icon" title="Notifications">
            <Bell className="h-5 w-5" />
          </Button>
          
          <Button variant="ghost" size="icon" title="Help">
            <HelpCircle className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
