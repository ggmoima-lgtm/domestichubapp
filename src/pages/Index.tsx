import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import logo from "@/assets/logo.jpg";
import { Baby, Home, Heart, ChefHat, Grid3X3, ShoppingCart } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import SearchBar from "@/components/SearchBar";
import CategoryPill from "@/components/CategoryPill";
import WorkerCard from "@/components/WorkerCard";
import WorkerDetailSheet from "@/components/WorkerDetailSheet";
import FilterSheet, { FilterState, defaultFilters } from "@/components/FilterSheet";
import CartSheet from "@/components/CartSheet";
import { mockWorkers, Worker } from "@/data/mockWorkers";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";

const categoryIcons = {
  all: Grid3X3,
  nanny: Baby,
  housekeeper: Home,
  caregiver: Heart,
  cook: ChefHat,
};

const categories = [
  { id: "all", label: "All" },
  { id: "nanny", label: "Nannies" },
  { id: "housekeeper", label: "Housekeepers" },
  { id: "caregiver", label: "Caregivers" },
  { id: "cook", label: "Cooks" },
];

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { itemCount, clearCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [showUnavailable, setShowUnavailable] = useState(false);

  // Handle payment callback (cart-based unlock)
  useEffect(() => {
    const payment = searchParams.get("payment");
    const workerIds = searchParams.get("worker");
    const bundleType = searchParams.get("bundle");

    if (payment === "unlock" && workerIds && bundleType && user) {
      const recordUnlocks = async () => {
        const ids = workerIds.split(",");
        const amount = ids.length * 50;
        for (const wId of ids) {
          await supabase.from("profile_unlocks").insert({
            employer_id: user.id,
            helper_id: wId,
            bundle_type: bundleType,
            amount_paid: amount / ids.length,
          });
        }
        clearCart();
        toast.success(`${ids.length} profile${ids.length > 1 ? "s" : ""} unlocked! Full access for 30 days.`);
        if (ids.length === 1) {
          const worker = mockWorkers.find((w) => w.id === ids[0]);
          if (worker) {
            setSelectedWorker(worker);
            setIsDetailOpen(true);
          }
        }
      };
      recordUnlocks();
      setSearchParams({}, { replace: true });
    }
  }, [user]);

  const filteredWorkers = mockWorkers.filter((worker) => {
    // Hide non-available unless toggled
    const helperStatus = worker.availabilityStatus || "available";
    const isAvailable = helperStatus === "available" || helperStatus === "interviewing";
    if (!showUnavailable && !isAvailable) return false;

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

    return matchesSearch && matchesCategory && matchesLocation && matchesJobType && matchesSkills && matchesExperience && matchesSalary;
  });

  const activeFilterCount =
    filters.locations.length +
    filters.jobTypes.length +
    filters.skills.length +
    (filters.experienceMin > 0 ? 1 : 0) +
    (filters.salaryRange[0] > 0 || filters.salaryRange[1] < 15000 ? 1 : 0) +
    (filters.nearMe ? 1 : 0);

  const handleWorkerClick = (worker: Worker) => {
    setSelectedWorker(worker);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setTimeout(() => setSelectedWorker(null), 300);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Domestic Hub" className="w-10 h-10 rounded-full object-contain bg-white shadow-soft" />
              <div>
                <p className="text-xs text-muted-foreground">Welcome back</p>
                <h2 className="text-lg font-bold text-foreground">Domestic Hub</h2>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full gradient-warm shadow-soft" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4">
        {/* Search */}
        <div className="mb-5">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onFilter={() => setIsFilterOpen(true)}
            filterCount={activeFilterCount}
          />
        </div>

        {/* Categories */}
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

        {/* Results Header */}
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

        {/* Worker Cards */}
        <div className="space-y-3">
          {filteredWorkers.map((worker, index) => (
            <div
              key={worker.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <WorkerCard {...worker} onClick={() => handleWorkerClick(worker)} />
            </div>
          ))}
        </div>

        {filteredWorkers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No helpers found matching your criteria.</p>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Floating Cart Button */}
      {itemCount > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-28 right-4 z-50 bg-primary text-primary-foreground w-14 h-14 rounded-full shadow-float flex items-center justify-center animate-fade-in"
        >
          <ShoppingCart size={22} />
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {itemCount}
          </span>
        </button>
      )}

      {/* Cart Sheet */}
      <CartSheet isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

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
    </div>
  );
};

export default Index;
