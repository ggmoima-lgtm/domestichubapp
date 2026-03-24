import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import logo from "@/assets/logo.jpg";
import { Baby, Home, Heart, Grid3X3, Coins, Users, X, Leaf } from "lucide-react";
import CreditWalletCard from "@/components/CreditWalletCard";
import TrustBanner from "@/components/TrustBanner";
import ProfileTab from "./ProfileTab";
import MessagesList from "@/components/MessagesList";
import LowCreditBanner from "@/components/LowCreditBanner";
import BottomNav from "@/components/BottomNav";
import SearchBar from "@/components/SearchBar";
import CategoryPill from "@/components/CategoryPill";
import WorkerCard from "@/components/WorkerCard";
import WorkerDetailSheet from "@/components/WorkerDetailSheet";
import FilterSheet, { FilterState, defaultFilters } from "@/components/FilterSheet";
import HelperHomeView from "@/components/HelperHomeView";
import HelperApplicationsHub from "@/components/HelperApplicationsHub";
import PushNotificationDialog from "@/components/PushNotificationDialog";
import { Worker } from "@/data/mockWorkers";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import PlatformStatsTicker from "@/components/PlatformStatsTicker";

const categoryIcons = {
  all: Grid3X3,
  nanny: Baby,
  housekeeper: Home,
  caregiver: Heart,
  "all-around": Users,
  gardener: Leaf,
};

const categories = [
  { id: "all", label: "All" },
  { id: "nanny", label: "Nannies" },
  { id: "housekeeper", label: "Housekeepers" },
  { id: "caregiver", label: "Caregivers" },
  { id: "all-around", label: "All-Around" },
  { id: "gardener", label: "Gardeners" },
];

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "home";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [unlockedHelpers, setUnlockedHelpers] = useState<Worker[]>([]);
  const [unlockRefresh, setUnlockRefresh] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [hasHelperProfile, setHasHelperProfile] = useState<boolean | null>(null);
  const [creditBalance, setCreditBalance] = useState(0);
  const paymentProcessedRef = useRef(false);
  const [dbHelpers, setDbHelpers] = useState<Worker[]>([]);
  const [showCreditStore, setShowCreditStore] = useState(false);
  const [employerName, setEmployerName] = useState<string>("");
  const [newApplicantCount, setNewApplicantCount] = useState(0);
  const [profileViewCount, setProfileViewCount] = useState(0);
  const [showPushDialog, setShowPushDialog] = useState(false);
  const permissionsPromptedRef = useRef(false);

  // Sync activeTab when search params change (e.g. navigating from another page)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["home", "messages", "hub", "profile"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Prompt for push notifications and location on first load
  useEffect(() => {
    if (!user || permissionsPromptedRef.current) return;
    permissionsPromptedRef.current = true;

    const prompted = localStorage.getItem("dh_permissions_prompted");
    if (prompted) return;
    localStorage.setItem("dh_permissions_prompted", "true");

    // Delay slightly so UI settles
    setTimeout(() => {
      // Request push notifications
      if ("Notification" in window && Notification.permission === "default") {
        setShowPushDialog(true);
      }
      // Request location
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          () => {},
          () => {},
          { timeout: 5000 }
        );
      }
    }, 1500);
  }, [user]);
  // Fetch user role + helper profile status
  useEffect(() => {
    if (!user) {
      setUserRole(null);
      setHasHelperProfile(null);
      return;
    }

    const fetchRoleAndProfile = async () => {
      let { data } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      // If no profile exists (e.g. OAuth user who never registered), sign out
      if (!data) {
        localStorage.removeItem("pending_oauth_role");
        await supabase.auth.signOut();
        toast.error("No account found. Please register first before using Google or Apple sign-in.");
        return;
      }

      const metadataRole = user.user_metadata?.role;
      const fallbackRole = metadataRole === "helper" || metadataRole === "employer" ? metadataRole : "employer";
      const resolvedRole = data?.role || fallbackRole;

      setUserRole(resolvedRole);
      setEmployerName(data?.full_name?.split(" ")[0] || "");

      if (resolvedRole === "helper") {
        const { data: helperProfile } = await supabase
          .from("helpers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        setHasHelperProfile(Boolean(helperProfile));
      } else {
        setHasHelperProfile(null);
      }
    };

    fetchRoleAndProfile();
  }, [user]);

  // Fetch new applicant count for employer
  useEffect(() => {
    if (!user || userRole !== "employer") return;
    const fetchApplicants = async () => {
      const { data: jobs } = await supabase
        .from("job_posts")
        .select("id")
        .eq("employer_id", user.id);
      if (!jobs || jobs.length === 0) { setNewApplicantCount(0); return; }
      const jobIds = jobs.map(j => j.id);
      const { count } = await supabase
        .from("job_applications")
        .select("id", { count: "exact", head: true })
        .in("job_id", jobIds)
        .eq("status", "pending");
      setNewApplicantCount(count || 0);
    };
    fetchApplicants();
  }, [user, userRole]);

  // Fetch profile view count (how many employers unlocked helper's profile, or for helpers how many employers viewed theirs)
  useEffect(() => {
    if (!user || !userRole) return;
    const fetchProfileViews = async () => {
      if (userRole === "helper") {
        // Count how many employers unlocked this helper's profile
        const { data: helperData } = await supabase
          .from("helpers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!helperData) { setProfileViewCount(0); return; }
        const { count } = await supabase
          .from("profile_unlocks")
          .select("id", { count: "exact", head: true })
          .eq("helper_id", helperData.id);
        setProfileViewCount(count || 0);
      }
    };
    fetchProfileViews();
  }, [user, userRole]);

  // Fetch helpers from database
  useEffect(() => {
    if (!user) return;
    const fetchHelpers = async () => {
      const { data: helpers } = await supabase
        .from("helpers")
        .select("*");
      
      const mapped: Worker[] = (helpers || []).map((h) => ({
        id: h.id,
        name: h.full_name,
        role: h.category,
        location: (h as any).location || "",
        rating: 0,
        reviews: 0,
        experience: `${h.experience_years || 0} yrs`,
        monthlyRate: h.hourly_rate ? `R${h.hourly_rate}` : "Negotiable",
        verified: h.is_verified || false,
        avatar: h.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
        skills: h.skills || [],
        bio: h.bio || undefined,
        languages: h.languages || undefined,
        availability: h.availability || undefined,
        introVideo: h.intro_video_url || undefined,
        availabilityStatus: (h.availability_status as Worker["availabilityStatus"]) || "available",
        availableFrom: h.available_from || null,
        phone: h.phone || undefined,
        email: h.email || undefined,
        serviceType: (h as any).service_type || "domestic",
        skillsDomestic: (h as any).skills_domestic || [],
        skillsGardening: (h as any).skills_gardening || [],
        hasTools: (h as any).has_tools || false,
      }));
      setDbHelpers(mapped);
    };
    fetchHelpers();
  }, [user, unlockRefresh]);

  // Fetch unlocked helper IDs and full helper profiles
  useEffect(() => {
    if (!user) return;
    const fetchUnlocks = async () => {
      const { data: unlocks } = await supabase
        .from("profile_unlocks")
        .select("helper_id")
        .eq("employer_id", user.id);
      
      const dbIds = (unlocks || []).map((d) => d.helper_id);
      setUnlockedIds(dbIds);

      if (dbIds.length > 0) {
        const { data: helpers } = await supabase
          .from("helpers")
          .select("*")
          .in("id", dbIds);
        
        const mapped: Worker[] = (helpers || []).map((h) => ({
          id: h.id,
          name: h.full_name,
          role: h.category,
          location: (h as any).location || "",
          rating: 0,
          reviews: 0,
          experience: `${h.experience_years || 0} yrs`,
          monthlyRate: h.hourly_rate ? `R${h.hourly_rate}` : "Negotiable",
          verified: h.is_verified || false,
          avatar: h.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
          skills: h.skills || [],
          bio: h.bio || undefined,
          languages: h.languages || undefined,
          availability: h.availability || undefined,
          introVideo: h.intro_video_url || undefined,
          availabilityStatus: (h.availability_status as Worker["availabilityStatus"]) || "available",
          availableFrom: h.available_from || null,
          phone: h.phone || undefined,
          email: h.email || undefined,
          serviceType: (h as any).service_type || "domestic",
          skillsDomestic: (h as any).skills_domestic || [],
          skillsGardening: (h as any).skills_gardening || [],
          hasTools: (h as any).has_tools || false,
        }));
        setUnlockedHelpers(mapped);
      } else {
        setUnlockedHelpers([]);
      }
    };
    fetchUnlocks();
  }, [user, unlockRefresh]);

  // Fetch credit balance
  useEffect(() => {
    if (!user) return;
    supabase
      .from("credit_wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setCreditBalance(data?.balance ?? 0);
      });
  }, [user, unlockRefresh]);

  // Handle payment callback (credit purchase) — credits are added server-side by the webhook
  useEffect(() => {
    if (paymentProcessedRef.current) return;
    if (!user) return;

    const payment = searchParams.get("payment");
    const creditsParam = searchParams.get("credits");

    if (payment !== "credits" || !creditsParam) return;

    paymentProcessedRef.current = true;
    setSearchParams({}, { replace: true });

    toast.success("Payment received! Your credits will appear shortly.");
    // Refresh balance after a short delay to allow webhook processing
    setTimeout(() => {
      setUnlockRefresh((r) => r + 1);
    }, 3000);
  }, [user, searchParams]);

  const filteredWorkers = dbHelpers.filter((worker) => {
    // Hide helpers with less than 80% profile completeness from search
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

    // Always show unlocked helpers regardless of status; hide non-available unless toggled
    const helperStatus = worker.availabilityStatus || "available";
    const isAvailable = helperStatus === "available" || helperStatus === "interviewing";
    if (!showUnavailable && !isAvailable && !isUnlockedByEmployer) return false;

    // Text search
    const matchesSearch =
      !searchQuery ||
      worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      worker.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      worker.skills.some((skill) =>
        skill.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesCategory =
      activeCategory === "all" ||
      (activeCategory === "gardener" 
        ? (worker.serviceType === "gardening" || worker.serviceType === "both" || worker.role.toLowerCase().includes("gardener"))
        : (worker.serviceType !== "gardening" && (activeCategory === "all" || worker.role.toLowerCase().includes(activeCategory.toLowerCase()))));

    const matchesLocation =
      filters.locations.length === 0 ||
      filters.locations.some((loc) =>
        worker.location.toLowerCase().includes(loc.toLowerCase())
      );

    const matchesJobType =
      filters.jobTypes.length === 0 ||
      filters.jobTypes.some((type) =>
        (worker.availability || "").toLowerCase().includes(type.toLowerCase())
      );

    const matchesSkills =
      filters.skills.length === 0 ||
      filters.skills.some((skill) =>
        worker.skills.some((ws) => ws.toLowerCase().includes(skill.toLowerCase()))
      );

    const workerYears = parseInt(worker.experience) || 0;
    const matchesExperience = workerYears >= filters.experienceMin;

    const workerRate = parseFloat(worker.monthlyRate.replace(/[^0-9.]/g, "")) || 0;
    const matchesSalary =
      workerRate >= filters.salaryRange[0] && workerRate <= filters.salaryRange[1];

    const matchesUnlocked = !filters.unlockedOnly || unlockedIds.includes(worker.id);

    const matchesLanguages =
      filters.languages.length === 0 ||
      filters.languages.some((lang) =>
        (worker.languages || []).some((wl: string) => wl.toLowerCase().includes(lang.toLowerCase()))
      );

    const matchesVerified = !filters.verifiedOnly || worker.verified;

    const matchesServiceType =
      !filters.serviceType || filters.serviceType === "all" ||
      worker.serviceType === filters.serviceType ||
      worker.serviceType === "both";

    return matchesSearch && matchesCategory && matchesLocation && matchesJobType && matchesSkills && matchesExperience && matchesSalary && matchesUnlocked && matchesLanguages && matchesVerified && matchesServiceType;
  });

  const activeFilterCount =
    filters.locations.length +
    filters.jobTypes.length +
    filters.skills.length +
    filters.languages.length +
    (filters.experienceMin > 0 ? 1 : 0) +
    (filters.salaryRange[0] > 0 || filters.salaryRange[1] < 15000 ? 1 : 0) +
    (filters.nearMe ? 1 : 0) +
    (filters.unlockedOnly ? 1 : 0) +
    (filters.verifiedOnly ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.serviceType && filters.serviceType !== "all" ? 1 : 0);

  const handleWorkerClick = (worker: Worker) => {
    setSelectedWorker(worker);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setTimeout(() => setSelectedWorker(null), 300);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Domestic Hub" className="w-14 h-14 rounded-full object-contain bg-white shadow-soft" />
              <div>
                <h2 className="text-lg font-bold text-foreground">Domestic Hub</h2>
              </div>
            </div>
            {userRole !== "helper" && (
              <button
                onClick={() => setShowCreditStore(true)}
                className="flex items-center gap-1.5 bg-primary/10 px-4 py-2.5 rounded-full hover:bg-primary/20 active:scale-95 transition-all cursor-pointer relative z-10"
              >
                <Coins size={14} className="text-primary" />
                <span className="text-sm font-bold text-primary">{creditBalance}</span>
                <span className="text-xs text-muted-foreground">credits</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Show loading state while role is being determined */}
      {userRole === null && user && (
        <main className="px-4 py-4 flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </main>
      )}

      {/* Tab Content */}
      {activeTab === "home" && userRole === "helper" && (
        <main className="px-4 py-4 pb-24">
          <HelperHomeView />
        </main>
      )}

      {activeTab === "home" && userRole !== null && userRole !== "helper" && (
        <>
        <TrustBanner />
        <main className="px-4 py-4 space-y-5">
          {/* Welcome */}
          <div>
           <p className="text-lg font-bold text-foreground">👋 Welcome back, {employerName || "there"}</p>
            <p className="text-sm text-muted-foreground mt-0.5">Find trusted domestic helpers and gardeners near you</p>
            <div className="mt-2">
              <PlatformStatsTicker />
            </div>
          </div>

          

          {/* Sub-categories with gardener */}

          {/* Search */}
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onFilter={() => setIsFilterOpen(true)}
            filterCount={activeFilterCount}
          />


          {/* Featured Helpers (Verified) */}
          {(() => {
            const verified = filteredWorkers.filter(w => w.verified);
            return verified.length > 0 ? (
              <div>
                <h3 className="font-bold text-foreground text-sm mb-3">
                  ⭐ Featured Helpers (Verified)
                </h3>
                <div className="space-y-3">
                  {verified.slice(0, 5).map((worker, index) => (
                    <div key={worker.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                      <WorkerCard {...worker} isUnlocked={unlockedIds.includes(worker.id)} onClick={() => handleWorkerClick(worker)} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null;
          })()}

          {/* Your Activity + Urgency */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-2xl p-4 border border-amber-200/50 dark:border-amber-800/50">
            <h3 className="font-bold text-foreground text-sm mb-2">📌 Your Activity</h3>
            <div className="space-y-2">
              {newApplicantCount > 0 && (
                <button
                  onClick={() => handleTabChange("hub")}
                  className="flex items-center gap-2 text-sm text-foreground font-medium hover:text-primary transition-colors"
                >
                  <span>🔥 {newApplicantCount} helper{newApplicantCount !== 1 ? "s" : ""} applied to your job</span>
                </button>
              )}
              {profileViewCount > 0 && (
                <p className="flex items-center gap-2 text-sm text-foreground font-medium">
                  <span>👀 {profileViewCount} employer{profileViewCount !== 1 ? "s" : ""} viewed your profile</span>
                </p>
              )}
              {newApplicantCount === 0 && profileViewCount === 0 && (
                <button
                  onClick={() => handleTabChange("profile")}
                  className="flex items-center gap-2 text-sm text-foreground font-medium hover:text-primary transition-colors"
                >
                  <span>👋 Welcome! Complete your profile to get started →</span>
                </button>
              )}
            </div>
          </div>

          {/* All Helpers */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-foreground text-sm">
                {activeCategory === "gardener" ? "Available Gardeners" : "Available Helpers"}
                <span className="text-muted-foreground font-normal ml-1">({filteredWorkers.length})</span>
              </h3>
              <button
                onClick={() => setShowUnavailable(!showUnavailable)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                  showUnavailable ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {showUnavailable ? "Hide unavailable" : "Show unavailable"}
              </button>
            </div>
            <div className="space-y-3">
              {filteredWorkers.map((worker, index) => (
                <div key={worker.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                  <WorkerCard {...worker} isUnlocked={unlockedIds.includes(worker.id)} onClick={() => handleWorkerClick(worker)} />
                </div>
              ))}
            </div>
            {filteredWorkers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No helpers found matching your criteria.</p>
              </div>
            )}
          </div>
        </main>
        </>
      )}

      {activeTab === "messages" && (
        <main className="px-4 py-4 pb-24">
          <MessagesList />
        </main>
      )}

      {activeTab === "hub" && userRole === "helper" && (
        <main className="px-4 py-4 pb-24">
          <HelperApplicationsHub />
        </main>
      )}

      {activeTab === "hub" && userRole !== null && userRole !== "helper" && (
        <main className="px-4 py-4 pb-24">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground text-lg">Unlocked Profiles</h3>
            <span className="text-muted-foreground text-sm">
              {unlockedHelpers.length} profiles
            </span>
          </div>
          <div className="space-y-3">
            {unlockedHelpers.map((worker, index) => (
              <div
                key={worker.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <WorkerCard {...worker} isUnlocked={true} onClick={() => handleWorkerClick(worker)} />
              </div>
            ))}
            {unlockedHelpers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No unlocked profiles yet. Browse helpers and unlock profiles to see them here.</p>
              </div>
            )}
          </div>
        </main>
      )}

      {activeTab === "profile" && (
        <main className="px-4 py-4 pb-24">
          <ProfileTab />
        </main>
      )}

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />




      {/* Filter Sheet */}
      <FilterSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onApply={setFilters}
      />

      {/* Worker Detail Sheet */}
      <WorkerDetailSheet
        worker={selectedWorker}
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        onHired={() => {
          handleCloseDetail();
        }}
      />

      {/* Credit Store Sheet */}
      {showCreditStore && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setShowCreditStore(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl shadow-float animate-slide-up max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-card pt-3 pb-2 flex justify-center z-10">
              <div className="w-10 h-1 bg-muted rounded-full" />
              <button
                onClick={() => setShowCreditStore(false)}
                className="absolute top-3 right-4 p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 pb-8">
              <CreditWalletCard onPurchaseComplete={() => {
                setShowCreditStore(false);
                setCreditBalance(prev => prev);
                setUnlockRefresh(r => r + 1);
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Push Notification Permission Dialog */}
      <PushNotificationDialog open={showPushDialog} onOpenChange={setShowPushDialog} />
    </div>
  );
};

export default Index;
