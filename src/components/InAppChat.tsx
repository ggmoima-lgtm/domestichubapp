import { useState, useEffect, useRef } from "react";
import { X, Send, UserCheck, ShieldAlert } from "lucide-react";
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
  isHired?: boolean;
}

const InAppChat = ({ isOpen, onClose, helperId, helperName, helperAvatar, onHired, isHired }: InAppChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showHireConfirm, setShowHireConfirm] = useState(false);
  const [isHiring, setIsHiring] = useState(false);
  const [isCurrentUserHelper, setIsCurrentUserHelper] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if current user is the helper
  useEffect(() => {
    if (!user || !helperId) return;
    supabase
      .from("helpers")
      .select("user_id")
      .eq("id", helperId)
      .single()
      .then(({ data }) => {
        if (data?.user_id === user.id) setIsCurrentUserHelper(true);
      });
  }, [user, helperId]);

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

    // Determine receiver: if I'm the helper, find the employer from past messages
    let receiverId = helper.user_id;
    if (user.id === helper.user_id) {
      // I'm the helper — find the other participant (employer)
      const { data: pastMsg } = await supabase
        .from("messages")
        .select("sender_id, receiver_id")
        .eq("helper_id", helperId)
        .neq("sender_id", user.id)
        .limit(1)
        .single();

      if (pastMsg) {
        receiverId = pastMsg.sender_id;
      } else {
        // Try from messages where I received
        const { data: pastMsg2 } = await supabase
          .from("messages")
          .select("sender_id")
          .eq("helper_id", helperId)
          .eq("receiver_id", user.id)
          .limit(1)
          .single();
        if (pastMsg2) {
          receiverId = pastMsg2.sender_id;
        } else {
          toast.error("Unable to find conversation partner.");
          return;
        }
      }
    }

    setIsSending(true);
    const content = newMessage.trim();
    setNewMessage("");

    const { data: insertedMsg, error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: receiverId,
      helper_id: helperId,
      content,
    }).select("id").single();

    if (error) {
      toast.error("Failed to send message.");
      setNewMessage(content);
    } else if (insertedMsg) {
      // Background moderation — fire and forget
      supabase.functions.invoke("moderate-message", {
        body: { content, message_id: insertedMsg.id, sender_id: user.id },
      }).then(({ data }) => {
        if (data?.flagged) {
          toast.warning("Your message has been flagged for review.", { duration: 5000 });
        }
      }).catch(() => {});
    }
    setIsSending(false);
  };

  const handleUnhire = async () => {
    if (!user) return;
    setIsHiring(true);
    try {
      // Find active placement
      const { data: placement } = await supabase
        .from("placements")
        .select("id")
        .eq("employer_id", user.id)
        .eq("helper_id", helperId)
        .eq("status", "active")
        .single();

      if (!placement) throw new Error("No active placement found");

      await supabase
        .from("placements")
        .update({ status: "completed", ended_at: new Date().toISOString() })
        .eq("id", placement.id);

      await supabase
        .rpc("update_helper_availability", { p_helper_id: helperId, p_status: "available" });

      toast.success(`${helperName} has been unhired.`);
      onHired?.();
    } catch (error: any) {
      toast.error("Failed to unhire. " + error.message);
    } finally {
      setIsHiring(false);
    }
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

      // Update helper status via security definer function
      const { data: updated, error: updateError } = await supabase
        .rpc("update_helper_availability", { p_helper_id: helperId, p_status: "unavailable" });
      if (updateError) throw updateError;
      if (!updated) throw new Error("Failed to update helper status");

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
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-card rounded-t-3xl shadow-float animate-slide-up max-h-[85vh] flex flex-col z-[61]">
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
            {!isCurrentUserHelper && (
              <Button
                size="sm"
                variant={isHired ? "destructive" : "outline"}
                className="gap-1.5 text-xs"
                onClick={() => isHired ? handleUnhire() : handleMarkAsHired()}
              >
                <UserCheck size={14} />
                {isHired ? "Unhire" : "Mark as Hired"}
              </Button>
            )}
            {isCurrentUserHelper && isHired && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <UserCheck size={14} />
                Hired
              </span>
            )}
            <button onClick={onClose} className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>


        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-[200px] max-h-[50vh]">
          {/* Disclaimer */}
          <div className="p-3 rounded-xl bg-muted/50 border border-border text-[10px] text-muted-foreground leading-relaxed text-center">
            Domestic Hub is a connection platform. All communication and agreements outside the app are at your own discretion. Domestic Hub is not liable for interactions outside the platform.
          </div>

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
        <div className="px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-border flex gap-2 bg-card">
          <Input
            ref={inputRef}
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter" && !e.shiftKey) handleSend();
            }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="flex-1 rounded-xl"
            autoComplete="off"
            autoCorrect="on"
            inputMode="text"
            enterKeyHint="send"
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