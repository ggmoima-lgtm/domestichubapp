import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Search, X, Briefcase, Settings2, ListChecks, Pencil, Heart,
  ChevronRight, Users, Coins, SlidersHorizontal, MapPin, Eye, Zap,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import WorkerCard from "@/components/WorkerCard";
import FilterSheet, { FilterState, defaultFilters } from "@/components/FilterSheet";

import { Worker } from "@/data/mockWorkers";

interface Props {
  dbHelpers: Worker[];
  unlockedIds: string[];
  creditBalance: number;
  onShowCreditStore: () => void;
  onWorkerClick: (worker: Worker) => void;
  newApplicantCount: number;
  employerName: string;
  onTabChange: (tab: string) => void;
}

const EmployerHomeView = ({
  dbHelpers,
  unlockedIds,
  creditBalance,
  onShowCreditStore,
  onWorkerClick,
  newApplicantCount,
  employerName,
  onTabChange,
}: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [employerAvatar, setEmployerAvatar] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("employer_profiles")
      .select("avatar_url")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setEmployerAvatar(data.avatar_url);
      });
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/employer-avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const avatarUrl = urlData.publicUrl + "?t=" + Date.now();
      await supabase.from("employer_profiles").update({ avatar_url: avatarUrl } as any).eq("user_id", user.id);
      setEmployerAvatar(avatarUrl);
      toast.success("Profile photo updated!");
    } catch (err: any) {
      toast.error("Failed to upload photo: " + (err.message || "Unknown error"));
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  const filteredWorkers = dbHelpers.filter((worker) => {
    const profileChecks = [
      Boolean(worker.avatar && !worker.avatar.includes("unsplash")),
      Boolean(worker.verified),
      Boolean(worker.bio && worker.bio.length > 10),
      Boolean(parseInt(worker.experience) > 0),
      Boolean(worker.skills && worker.skills.length > 0),
    ];
    const profilePercent = Math.round((profileChecks.filter(Boolean).length / profileChecks.length) * 100);
    const isUnlockedByEmployer = unlockedIds.includes(worker.id);
    if (profilePercent < 80 && !isUnlockedByEmployer) return false;

    const helperStatus = worker.availabilityStatus || "available";
    const isAvailable = helperStatus === "available" || helperStatus === "interviewing";
    if (!showUnavailable && !isAvailable && !isUnlockedByEmployer) return false;

    const matchesSearch =
      !searchQuery ||
      worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      worker.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      worker.skills.some((skill) =>
        skill.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesLocation =
      filters.locations.length === 0 ||
      filters.locations.some((loc) =>
        worker.location.toLowerCase().includes(loc.toLowerCase())
      );

    const matchesSkills =
      filters.skills.length === 0 ||
      filters.skills.some((skill) =>
        worker.skills.some((ws) => ws.toLowerCase().includes(skill.toLowerCase()))
      );

    const workerYears = parseInt(worker.experience) || 0;
    const matchesExperience = workerYears >= filters.experienceMin;

    const matchesVerified = !filters.verifiedOnly || worker.verified;

    const matchesJobTypes =
      filters.jobTypes.length === 0 ||
      filters.jobTypes.some((jt) =>
        (worker.availability || "").toLowerCase().includes(jt.toLowerCase())
      );

    const matchesLanguages =
      filters.languages.length === 0 ||
      filters.languages.some((lang) =>
        (worker.languages || []).some((wl) => wl.toLowerCase().includes(lang.toLowerCase()))
      );

    const matchesRating = worker.rating >= filters.minRating;

    const matchesUnlocked = !filters.unlockedOnly || isUnlockedByEmployer;

    return matchesSearch && matchesLocation && matchesSkills && matchesExperience && matchesVerified && matchesJobTypes && matchesLanguages && matchesRating && matchesUnlocked;
  });

  const activeFilterCount =
    filters.locations.length +
    filters.skills.length +
    filters.jobTypes.length +
    filters.languages.length +
    (filters.experienceMin > 0 ? 1 : 0) +
    (filters.verifiedOnly ? 1 : 0) +
    (filters.unlockedOnly ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.nearMe ? 1 : 0);

  const firstName = employerName || "there";

  return (
    <div className="space-y-0">
      {/* ─── LinkedIn-style Search Bar ─── */}
      <div className="flex items-center gap-3 mb-3">
        <input
          ref={fileInputRef}
           type="file"
           accept="image/*"
           className="hidden"
          onChange={handleAvatarUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="relative flex-shrink-0"
          disabled={avatarUploading}
        >
          <div className="w-14 h-14 rounded-full overflow-hidden bg-muted border-[3px] border-primary">
            {avatarUploading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : employerAvatar ? (
              <img src={employerAvatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-lg font-bold text-muted-foreground">{firstName[0]?.toUpperCase()}</span>
              </div>
            )}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-card bg-primary flex items-center justify-center">
            <Camera size={8} className="text-primary-foreground" />
          </div>
        </button>
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search helpers"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-muted/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          onClick={onShowCreditStore}
          className="flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full"
        >
          <Coins size={12} className="text-primary" />
          <span className="text-xs font-bold text-primary">{creditBalance}</span>
        </button>
      </div>

      {/* ─── Filter Pills ─── */}
      <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none">
        <button
          onClick={() => setIsFilterOpen(true)}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-border text-sm font-medium text-foreground whitespace-nowrap hover:bg-muted transition-colors"
        >
          <SlidersHorizontal size={14} /> Filters
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
        <button
          onClick={() => onTabChange("hub")}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-border text-sm font-medium text-foreground whitespace-nowrap hover:bg-muted transition-colors"
        >
          <Heart size={14} /> Saved
        </button>
        <button
          onClick={() => onTabChange("profile")}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-border text-sm font-medium text-foreground whitespace-nowrap hover:bg-muted transition-colors"
        >
          <Pencil size={14} /> Edit Profile
        </button>
        <button
          onClick={() => setShowUnavailable(!showUnavailable)}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-sm font-medium whitespace-nowrap transition-colors ${
            showUnavailable ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:bg-muted"
          }`}
        >
          <Eye size={14} /> {showUnavailable ? "All" : "Available"}
        </button>
      </div>


      {/* ─── Divider ─── */}
      <div className="h-2 bg-muted/50 -mx-4" />

      {/* ─── Top Helpers Section ─── */}
      <div className="pt-4">
        <h2 className="text-lg font-bold text-foreground">Top helpers for you</h2>
        <p className="text-xs text-muted-foreground mt-0.5 mb-4">
          Verified domestic helpers and gardeners near you
        </p>

        <div className="space-y-3">
          {filteredWorkers.map((worker, index) => (
            <div key={worker.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
              <WorkerCard
                {...worker}
                isUnlocked={unlockedIds.includes(worker.id)}
                onClick={() => onWorkerClick(worker)}
              />
            </div>
          ))}
        </div>

        {filteredWorkers.length === 0 && (
          <div className="text-center py-12">
            <Users size={40} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">No helpers found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Filter Sheet */}
      <FilterSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onApply={setFilters}
      />
    </div>
  );
};

export default EmployerHomeView;
