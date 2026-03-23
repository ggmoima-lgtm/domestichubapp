import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import logo from "@/assets/logo.jpg";
import { Baby, Home, Heart, Grid3X3, Coins, Users, X, Leaf } from "lucide-react";
import CreditWalletCard from "@/components/CreditWalletCard";
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
import { Worker } from "@/data/mockWorkers";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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
  const [activeTab, setActiveTab] = useState("home");
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

  // Fetch user role + helper profile status
  useEffect(() => {
    if (!user) {
      setUserRole(null);
      setHasHelperProfile(null);
      return;
    }

    const fetchRoleAndProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("user_id", user.id)
        .maybeSingle();

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
        location: "",
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
          location: "",
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
    // Always show unlocked helpers regardless of status; hide non-available unless toggled
    const helperStatus = worker.availabilityStatus || "available";
    const isAvailable = helperStatus === "available" || helperStatus === "interviewing";
    const isUnlockedByEmployer = unlockedIds.includes(worker.id);
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
      worker.role.toLowerCase().includes(activeCategory.toLowerCase());

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

    return matchesSearch && matchesCategory && matchesLocation && matchesJobType && matchesSkills && matchesExperience && matchesSalary && matchesUnlocked && matchesLanguages && matchesVerified;
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
    (filters.minRating > 0 ? 1 : 0);

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
                <p className="text-xs text-muted-foreground">Welcome back</p>
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
        <main className="px-4 py-4">
          <HelperHomeView />
        </main>
      )}

      {activeTab === "home" && userRole !== null && userRole !== "helper" && (
        <main className="px-4 py-4">
          <LowCreditBanner balance={creditBalance} onBuyCredits={() => setShowCreditStore(true)} />
          <div className="mb-5">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onFilter={() => setIsFilterOpen(true)}
              filterCount={activeFilterCount}
            />
          </div>

          <div className="mb-5">
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {categories.map((category) => (
                <CategoryPill
                  key={category.id}
                  icon={categoryIcons[category.id as keyof typeof categoryIcons]}
                  label={category.label}
                  active={activeCategory === category.id}
                  onClick={() => setActiveCategory(category.id)}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground">
              Available Helpers
              <span className="text-muted-foreground font-normal ml-2">
                ({filteredWorkers.length})
              </span>
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
              <div
                key={worker.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <WorkerCard {...worker} isUnlocked={unlockedIds.includes(worker.id)} onClick={() => handleWorkerClick(worker)} />
              </div>
            ))}
          </div>

          {filteredWorkers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No helpers found matching your criteria.</p>
            </div>
          )}
        </main>
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
    </div>
  );
};

export default Index;
