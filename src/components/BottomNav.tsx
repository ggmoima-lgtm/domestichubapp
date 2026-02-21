import { useState, useEffect } from "react";
import { Home, MessageCircle, Unlock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = async () => {
    if (!user) return;
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .eq("read", false);
    setUnreadCount(count || 0);
  };

  useEffect(() => {
    fetchUnread();

    if (!user) return;

    const channel = supabase
      .channel("unread-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchUnread();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Refresh when switching to messages tab
  useEffect(() => {
    if (activeTab === "messages") {
      const timer = setTimeout(fetchUnread, 1000);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  const navItems: (NavItem & { id: string })[] = [
    { id: "home", icon: <Home size={22} />, label: "Home" },
    {
      id: "messages",
      icon: (
        <div className="relative">
          <MessageCircle size={22} />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-destructive text-destructive-foreground text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
      ),
      label: "Messages",
    },
    { id: "hub", icon: <Unlock size={22} />, label: "Hub" },
    { id: "profile", icon: <User size={22} />, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-300",
                isActive
                  ? "text-primary bg-primary-light"
                  : "text-muted-foreground hover:text-primary hover:bg-primary-light/50"
              )}
            >
              {item.icon}
              <span className="text-[10px] font-medium">
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
