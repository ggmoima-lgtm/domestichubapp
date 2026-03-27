import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, Mail, Loader2, CheckCircle, XCircle } from "lucide-react";

interface EmailLog {
  id: string;
  actor_id: string;
  action: string;
  details: any;
  created_at: string;
}

interface AdminEmailsTabProps {
  prefillTo?: string;
  prefillName?: string;
  onClearPrefill?: () => void;
}

const AdminEmailsTab = ({ prefillTo, prefillName, onClearPrefill }: AdminEmailsTabProps) => {
  const [to, setTo] = useState(prefillTo || "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sentEmails, setSentEmails] = useState<EmailLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    if (prefillTo) {
      setTo(prefillTo);
      setSubject(`Message for ${prefillName || ""}`);
    }
  }, [prefillTo, prefillName]);

  const fetchEmailLogs = async () => {
    setLoadingLogs(true);
    const { data } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("action", "admin_send_email")
      .order("created_at", { ascending: false })
      .limit(50);
    setSentEmails(data || []);
    setLoadingLogs(false);
  };

  useEffect(() => { fetchEmailLogs(); }, []);

  const handleSend = async () => {
    if (!to || !subject || !message) { toast.error("Fill in all fields"); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) { toast.error("Enter a valid email address"); return; }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-send-email", {
        body: { to, subject, message },
      });
      if (error || !data?.success) {
        toast.error(data?.error || "Failed to send email");
        return;
      }
      toast.success(`Email sent to ${to}`);
      setTo("");
      setSubject("");
      setMessage("");
      onClearPrefill?.();
      fetchEmailLogs();
    } catch {
      toast.error("Failed to send email");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Mail size={18} /> Compose Email</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground font-medium">To</label>
            <Input placeholder="user@example.com" value={to} onChange={e => setTo(e.target.value)} className="rounded-xl" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium">Subject</label>
            <Input placeholder="Email subject" value={subject} onChange={e => setSubject(e.target.value)} className="rounded-xl" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium">Message</label>
            <Textarea placeholder="Type your message..." value={message} onChange={e => setMessage(e.target.value)} className="rounded-xl min-h-[120px]" />
          </div>
          <Button className="w-full rounded-xl" onClick={handleSend} disabled={sending}>
            {sending ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><Send size={16} /> Send Email</>}
          </Button>
        </CardContent>
      </Card>

      <h3 className="font-bold text-sm text-foreground">Sent Emails</h3>
      {loadingLogs ? (
        <div className="flex justify-center py-4"><Loader2 className="animate-spin text-muted-foreground" size={20} /></div>
      ) : (
        <div className="space-y-2">
          {sentEmails.map(log => {
            const details = log.details as any;
            return (
              <Card key={log.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold truncate flex-1">{details?.subject || "No subject"}</p>
                    <Badge variant="outline" className="text-[10px] ml-2">
                      <CheckCircle size={8} className="mr-0.5" /> Sent
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">To: {details?.to}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
                </CardContent>
              </Card>
            );
          })}
          {sentEmails.length === 0 && <p className="text-center text-muted-foreground py-6 text-sm">No emails sent yet.</p>}
        </div>
      )}
    </div>
  );
};

export default AdminEmailsTab;
