import { Home, Search, PlusCircle, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const navItems: (NavItem & { id: string })[] = [
    { id: "home", icon: <Home size={22} />, label: "Home" },
    { id: "search", icon: <Search size={22} />, label: "Search" },
    { id: "post", icon: <PlusCircle size={24} />, label: "Post" },
    { id: "messages", icon: <MessageCircle size={22} />, label: "Messages" },
    { id: "profile", icon: <User size={22} />, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const isPost = item.id === "post";

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-300",
                isPost
                  ? "gradient-primary text-primary-foreground shadow-button -mt-4 px-5 py-3 hover:scale-105"
                  : isActive
                  ? "text-primary bg-primary-light"
                  : "text-muted-foreground hover:text-primary hover:bg-primary-light/50"
              )}
            >
              {item.icon}
              <span className={cn("text-[10px] font-medium", isPost && "text-xs")}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
