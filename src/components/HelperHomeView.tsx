import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MapPin, Briefcase, Clock, Users, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface EmployerListing {
  id: string;
  user_id: string;
  location: string | null;
  type_of_need: string | null;
  email: string | null;
  created_at: string;
  employer_name?: string;
}

const needTypeLabels: Record<string, string> = {
  "full-time": "Full-time Helper",
  "part-time": "Part-time Helper",
  "live-in": "Live-in Helper",
  "live-out": "Live-out Helper",
};

const needTypeIcons: Record<string, string> = {
  "full-time": "🕐",
  "part-time": "⏰",
  "live-in": "🏠",
  "live-out": "🚶",
};

const HelperHomeView = () => {
  const { user } = useAuth();
  const [listings, setListings] = useState<EmployerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchListings = async () => {
      const { data, error } = await supabase
        .from("employer_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        // Fetch employer names from profiles
        const userIds = data.map((d) => d.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);

        const nameMap = new Map(
          (profiles || []).map((p) => [p.user_id, p.full_name])
        );

        setListings(
          data.map((d) => ({
            ...d,
            employer_name: nameMap.get(d.user_id) || "Employer",
          }))
        );
      }
      setLoading(false);
    };

    fetchListings();
  }, []);

  const filteredListings = listings.filter((listing) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (listing.location || "").toLowerCase().includes(q) ||
      (listing.type_of_need || "").toLowerCase().includes(q) ||
      (listing.employer_name || "").toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 rounded-full border-3 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-5">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by location or job type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-2xl h-12 bg-muted/50 border-0"
          />
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground">
          <Users size={18} className="inline mr-2 text-primary" />
          Employers Hiring
          <span className="text-muted-foreground font-normal ml-2">
            ({filteredListings.length})
          </span>
        </h3>
      </div>

      {/* Listings */}
      <div className="space-y-3">
        {filteredListings.map((listing, index) => (
          <div
            key={listing.id}
            className="bg-card rounded-2xl p-4 shadow-soft border border-border animate-fade-in"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">
                  {needTypeIcons[listing.type_of_need || ""] || "💼"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-foreground text-sm">
                  {needTypeLabels[listing.type_of_need || ""] || "Helper Needed"}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Posted by {listing.employer_name}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {listing.location && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                      <MapPin size={12} />
                      {listing.location.charAt(0).toUpperCase() + listing.location.slice(1)}
                    </span>
                  )}
                  {listing.type_of_need && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                      <Clock size={12} />
                      {listing.type_of_need.charAt(0).toUpperCase() + listing.type_of_need.slice(1)}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(listing.created_at).toLocaleDateString("en-ZA", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredListings.length === 0 && (
        <div className="text-center py-12">
          <Briefcase size={40} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">No employers found</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Check back soon for new opportunities
          </p>
        </div>
      )}
    </div>
  );
};

export default HelperHomeView;
