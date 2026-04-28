import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import InAppChat from "./InAppChat";

interface Conversation {
  helperId: string;
  helperName: string;
  helperAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isMe: boolean;
}

const MessagesList = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [openChat, setOpenChat] = useState<Conversation | null>(null);
  const [isHelper, setIsHelper] = useState(false);

  useEffect(() => {
    if (user) {
      const role =
        (user.user_metadata as any)?.role ||
        (user.app_metadata as any)?.role;
      if (role === "helper") {
        setIsHelper(true);
      } else {
        // Fallback: check profiles table
        supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle()
          .then(({ data }) => setIsHelper(data?.role === "helper"));
      }
      fetchConversations();
    }
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    // Get all messages involving this user
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (!messages || messages.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Group by helper_id to get unique conversations
    const helperMap = new Map<string, typeof messages>();
    for (const msg of messages) {
      if (!helperMap.has(msg.helper_id)) {
        helperMap.set(msg.helper_id, []);
      }
      helperMap.get(msg.helper_id)!.push(msg);
    }

    // Get helper details for each conversation
    const helperIds = Array.from(helperMap.keys());
    const { data: helpers } = await supabase
      .from("helpers")
      .select("id, full_name, avatar_url")
      .in("id", helperIds);

    const helperLookup = new Map(
      (helpers || []).map((h) => [h.id, h])
    );

    const convos: Conversation[] = helperIds.map((helperId) => {
      const msgs = helperMap.get(helperId)!;
      const lastMsg = msgs[0]; // already sorted desc
      const helper = helperLookup.get(helperId);
      const unread = msgs.filter(
        (m) => m.receiver_id === user.id && !m.read
      ).length;

      return {
        helperId,
        helperName: helper?.full_name || "Unknown",
        helperAvatar: helper?.avatar_url || "",
        lastMessage: lastMsg.content,
        lastMessageTime: lastMsg.created_at,
        unreadCount: unread,
        isMe: lastMsg.sender_id === user.id,
      };
    });

    // Sort by most recent message
    convos.sort(
      (a, b) =>
        new Date(b.lastMessageTime).getTime() -
        new Date(a.lastMessageTime).getTime()
    );

    setConversations(convos);
    setLoading(false);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const dayMs = 86400000;

    if (diff < dayMs) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diff < dayMs * 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-pulse text-muted-foreground">Loading messages...</div>
      </div>
    );
  }

  return (
    <>
      <h3 className="font-bold text-foreground mb-4">Messages</h3>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <MessageCircle size={28} className="text-muted-foreground" />
          </div>
          <h4 className="font-semibold text-foreground mb-1">No messages yet</h4>
          <p className="text-sm text-muted-foreground max-w-[260px]">
            {isHelper
              ? "When an employer messages you about a job, your conversations will appear here."
              : "When you unlock a helper's profile, you can start chatting with them here."}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {conversations.map((convo) => (
            <button
              key={convo.helperId}
              onClick={() => setOpenChat(convo)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-muted transition-colors text-left"
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-primary-light">
                  {convo.helperAvatar ? (
                    <img
                      src={convo.helperAvatar}
                      alt={convo.helperName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary font-bold text-lg">
                      {convo.helperName.charAt(0)}
                    </div>
                  )}
                </div>
                {convo.unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {convo.unreadCount}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-sm font-semibold truncate ${convo.unreadCount > 0 ? "text-foreground" : "text-foreground"}`}>
                    {convo.helperName}
                  </span>
                  <span className={`text-[11px] shrink-0 ml-2 ${convo.unreadCount > 0 ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                    {formatTime(convo.lastMessageTime)}
                  </span>
                </div>
                <p className={`text-xs truncate ${convo.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {convo.isMe ? "You: " : ""}
                  {convo.lastMessage}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Chat Window */}
      {openChat && (
        <InAppChat
          isOpen={!!openChat}
          onClose={() => {
            setOpenChat(null);
            fetchConversations(); // Refresh unread counts
          }}
          helperId={openChat.helperId}
          helperName={openChat.helperName}
          helperAvatar={openChat.helperAvatar}
        />
      )}
    </>
  );
};

export default MessagesList;
