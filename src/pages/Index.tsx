import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.jpg";
import { Baby, Home, Heart, ChefHat, Grid3X3 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import SearchBar from "@/components/SearchBar";
import CategoryPill from "@/components/CategoryPill";
import WorkerCard from "@/components/WorkerCard";

import WorkerDetailSheet from "@/components/WorkerDetailSheet";
import { mockWorkers, Worker } from "@/data/mockWorkers";

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
  const [activeTab, setActiveTab] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const filteredWorkers = mockWorkers.filter((worker) => {
    const matchesSearch =
      worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      worker.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      worker.skills.some((skill) =>
        skill.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesCategory =
      activeCategory === "all" ||
      worker.role.toLowerCase().includes(activeCategory.toLowerCase());

    return matchesSearch && matchesCategory;
  });

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
          <button className="text-sm text-primary font-semibold">
            View All
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
              <WorkerCard
                {...worker}
                onClick={() => handleWorkerClick(worker)}
              />
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

      {/* Worker Detail Sheet */}
      <WorkerDetailSheet
        worker={selectedWorker}
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
      />
    </div>
  );
};

export default Index;
