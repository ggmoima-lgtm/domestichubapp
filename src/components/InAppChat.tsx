import { useState, useEffect, useRef } from "react";
import { X, Send, UserCheck } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

interface InAppChatProps {
  isOpen: boolean;
  onClose: () => void;
  helperId: string;
  helperName: string;
  helperAvatar: string;
  onHired?: () => void;
}

const InAppChat = ({ isOpen, onClose, helperId, helperName, helperAvatar, onHired }: InAppChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showHireConfirm, setShowHireConfirm] = useState(false);
  const [isHiring, setIsHiring] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load messages
  useEffect(() => {
    if (!isOpen || !user || !helperId) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, receiver_id, content, created_at, read")
        .eq("helper_id", helperId)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: true })
        .limit(100);

      if (data) setMessages(data as Message[]);

      // Mark unread messages as read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("helper_id", helperId)
        .eq("receiver_id", user.id)
        .eq("read", false);
    };

    loadMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat-${helperId}-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `helper_id=eq.${helperId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          if (msg.sender_id === user.id || msg.receiver_id === user.id) {
            setMessages((prev) => [...prev, msg]);
            if (msg.receiver_id === user.id) {
              supabase
                .from("messages")
                .update({ read: true })
                .eq("id", msg.id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, user, helperId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || isSending) return;

    const { data: helper } = await supabase
      .from("helpers")
      .select("user_id")
      .eq("id", helperId)
      .single();

    if (!helper?.user_id) {
      toast.error("Unable to send message.");
      return;
    }

    setIsSending(true);
    const content = newMessage.trim();
    setNewMessage("");

    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: helper.user_id,
      helper_id: helperId,
      content,
    });

    if (error) {
      toast.error("Failed to send message.");
      setNewMessage(content);
    }
    setIsSending(false);
  };

  const handleMarkAsHired = async () => {
    if (!user) return;
    setIsHiring(true);
    try {
      // Send system message
      const { data: helper } = await supabase
        .from("helpers")
        .select("user_id")
        .eq("id", helperId)
        .single();

      if (!helper?.user_id) throw new Error("Helper not found");

      // Create placement
      const { error: placementError } = await supabase.from("placements").insert({
        employer_id: user.id,
        helper_id: helperId,
        status: "active",
        employer_name: "Employer",
        job_type: "full-time",
        job_category: "general",
      });
      if (placementError) throw placementError;

      // Update helper status
      const { error: updateError } = await supabase
        .from("helpers")
        .update({ availability_status: "hired_platform" })
        .eq("id", helperId);
      if (updateError) throw updateError;

      // Send hired notification message
      await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: helper.user_id,
        helper_id: helperId,
        content: "✅ I've marked you as hired! Congratulations — your profile is now set to 'Hired' status.",
      });

      toast.success(`${helperName} has been marked as hired!`);
      setShowHireConfirm(false);
      onHired?.();
    } catch (error: any) {
      console.error("Hire error:", error);
      toast.error("Failed to mark as hired. " + error.message);
    } finally {
      setIsHiring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl shadow-float animate-slide-up max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-muted">
              <img src={helperAvatar} alt={helperName} className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm">{helperName}</h3>
              <p className="text-xs text-muted-foreground">In-app messaging</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => setShowHireConfirm(true)}
            >
              <UserCheck size={14} />
              Mark as Hired
            </Button>
            <button onClick={onClose} className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Hire Confirmation Banner */}
        {showHireConfirm && (
          <div className="px-5 py-3 bg-primary/5 border-b border-primary/20">
            <p className="text-sm font-semibold text-foreground mb-2">Mark {helperName} as Hired?</p>
            <p className="text-xs text-muted-foreground mb-3">
              Their profile will be hidden from search and set to "Hired" status. This action notifies the helper.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowHireConfirm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleMarkAsHired} disabled={isHiring}>
                {isHiring ? "Processing..." : "Confirm Hire"}
              </Button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-[200px] max-h-[50vh]">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
            </div>
          )}
          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isMe
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-border flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            className="flex-1 rounded-xl"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className="rounded-full shrink-0"
          >
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InAppChat;