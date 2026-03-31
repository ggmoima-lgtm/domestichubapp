import { useState, useEffect, useRef, lazy } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { X, Coins, Users } from "lucide-react";
import CreditWalletCard from "@/components/CreditWalletCard";
import ProfileTab from "./ProfileTab";
import MessagesList from "@/components/MessagesList";
import BottomNav from "@/components/BottomNav";
import WorkerCard from "@/components/WorkerCard";
import WorkerDetailSheet from "@/components/WorkerDetailSheet";
import HelperHomeView from "@/components/HelperHomeView";
import EmployerHomeView from "@/components/EmployerHomeView";
import HelperApplicationsHub from "@/components/HelperApplicationsHub";
import PushNotificationDialog from "@/components/PushNotificationDialog";
import FloatingChatButton from "@/components/support/FloatingChatButton";
import SupportPage from "@/pages/SupportPage";
import { Worker } from "@/data/mockWorkers";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import logo from "@/assets/logo.jpg";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "home";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
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
    if (tab && ["home", "messages", "hub", "profile", "support"].includes(tab)) {
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

  // Handle payment callback — credits are added server-side by the webhook
  useEffect(() => {
    if (paymentProcessedRef.current) return;
    if (!user) return;

    const payment = searchParams.get("payment");
    const tabParam = searchParams.get("tab");

    if (payment !== "credits" && payment !== "unlock") return;

    paymentProcessedRef.current = true;

    // Navigate to profile tab
    if (tabParam === "profile") {
      setActiveTab("profile");
    }

    setSearchParams({}, { replace: true });

    toast.success("Payment received! Your credits will appear shortly.");
    // Refresh balance after a short delay to allow webhook processing
    setTimeout(() => {
      setUnlockRefresh((r) => r + 1);
    }, 3000);
  }, [user, searchParams]);


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
      {/* Show loading state while role is being determined */}
      {userRole === null && user && (
        <main className="px-4 py-4 flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <img src={logo} alt="Domestic Hub" className="w-24 h-24 object-contain rounded-2xl shadow-lg animate-[heartbeat_1.2s_ease-in-out_infinite]" />
        </main>
      )}

      {/* Tab Content */}
      {activeTab === "home" && userRole === "helper" && (
        <main className="px-4 py-4 pb-24">
          <HelperHomeView />
        </main>
      )}

      {activeTab === "home" && userRole !== null && userRole !== "helper" && (
        <main className="px-4 py-4 pb-24">
          <EmployerHomeView
            dbHelpers={dbHelpers}
            unlockedIds={unlockedIds}
            creditBalance={creditBalance}
            onShowCreditStore={() => setShowCreditStore(true)}
            onWorkerClick={handleWorkerClick}
            newApplicantCount={newApplicantCount}
            employerName={employerName}
            onTabChange={handleTabChange}
          />
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
          <div className="space-y-0">
            <h2 className="text-lg font-bold text-foreground">Unlocked Profiles</h2>
            <p className="text-xs text-muted-foreground mt-0.5 mb-4">
              Helpers whose contact details you've unlocked
            </p>

            <div className="divide-y divide-border">
              {unlockedHelpers.map((worker, index) => (
                <div
                  key={worker.id}
                  className="py-3 first:pt-0 animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <WorkerCard {...worker} isUnlocked={true} onClick={() => handleWorkerClick(worker)} />
                </div>
              ))}
            </div>

            {unlockedHelpers.length === 0 && (
              <div className="text-center py-12">
                <Users size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground font-medium">No unlocked profiles yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Browse helpers and unlock profiles to see them here</p>
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

      {activeTab === "support" && (
        <main className="pb-24">
          <SupportPage />
        </main>
      )}

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />





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

      {/* Floating FAQ Chat Button */}
      <FloatingChatButton />
    </div>
  );
};

export default Index;
