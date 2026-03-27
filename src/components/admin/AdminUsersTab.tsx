import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, Ban, CheckCircle, Trash2, Mail, Loader2, User } from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  surname: string | null;
  phone: string;
  email: string | null;
  role: string;
  is_blocked: boolean;
  created_at: string;
  city: string | null;
  area: string | null;
}

interface AdminUsersTabProps {
  onSendEmail: (email: string, name: string) => void;
}

const AdminUsersTab = ({ onSendEmail }: AdminUsersTabProps) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, surname, phone, email, role, is_blocked, created_at, city, area")
      .order("created_at", { ascending: false })
      .limit(200);
    setUsers((data as UserProfile[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleToggleBlock = async (profile: UserProfile) => {
    const newBlocked = !profile.is_blocked;
    const { error } = await supabase
      .from("profiles")
      .update({ is_blocked: newBlocked } as any)
      .eq("id", profile.id);
    if (error) { toast.error("Failed to update user"); return; }
    toast.success(newBlocked ? `${profile.full_name} blocked` : `${profile.full_name} unblocked`);
    setUsers(prev => prev.map(u => u.id === profile.id ? { ...u, is_blocked: newBlocked } : u));
  };

  const handleDeleteUser = async (profile: UserProfile) => {
    if (!confirm(`Permanently delete ${profile.full_name}? This cannot be undone.`)) return;
    setDeletingId(profile.user_id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { target_user_id: profile.user_id },
      });
      if (error || !data?.success) {
        toast.error(data?.error || "Failed to delete user");
        return;
      }
      toast.success(`${profile.full_name} has been deleted`);
      setUsers(prev => prev.filter(u => u.id !== profile.id));
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  const sanitized = searchQuery.slice(0, 100).trim().toLowerCase();
  const filtered = users.filter(u =>
    !sanitized ||
    u.full_name?.toLowerCase().includes(sanitized) ||
    u.email?.toLowerCase().includes(sanitized) ||
    u.phone?.includes(sanitized) ||
    u.role?.toLowerCase().includes(sanitized)
  );

  const employers = filtered.filter(u => u.role === "employer");
  const helpers = filtered.filter(u => u.role === "helper");

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search users by name, email, phone..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 rounded-xl h-12" />
      </div>

      <div className="flex gap-2 text-xs">
        <Badge variant="outline">{users.length} total</Badge>
        <Badge variant="secondary">{employers.length} employers</Badge>
        <Badge variant="secondary">{helpers.length} helpers</Badge>
        <Badge variant="destructive">{users.filter(u => u.is_blocked).length} blocked</Badge>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => (
            <Card key={u.id} className={u.is_blocked ? "border-destructive/30 bg-destructive/5" : ""}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{u.full_name} {u.surname || ""}</p>
                      {u.is_blocked && <Badge variant="destructive" className="text-[10px]">Blocked</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{u.email || "No email"} · {u.phone}</p>
                    <p className="text-xs text-muted-foreground">{u.city || ""} {u.area || ""}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className="text-[10px] capitalize">{u.role}</Badge>
                    <span className="text-[10px] text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant={u.is_blocked ? "default" : "outline"} className="flex-1 text-xs h-7" onClick={() => handleToggleBlock(u)}>
                    {u.is_blocked ? <><CheckCircle size={12} /> Unblock</> : <><Ban size={12} /> Block</>}
                  </Button>
                  {u.email && (
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onSendEmail(u.email!, u.full_name)}>
                      <Mail size={12} />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive text-xs h-7" onClick={() => handleDeleteUser(u)} disabled={deletingId === u.user_id}>
                    {deletingId === u.user_id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No users found.</p>}
        </div>
      )}
    </div>
  );
};

export default AdminUsersTab;
