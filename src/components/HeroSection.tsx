import { Button } from "./ui/button";
import { ArrowRight, Shield, Heart } from "lucide-react";

interface HeroSectionProps {
  onFindHelpers: () => void;
  onPostProfile: () => void;
}

const HeroSection = ({ onFindHelpers, onPostProfile }: HeroSectionProps) => {
  return (
    <section className="relative overflow-hidden gradient-hero rounded-3xl p-6 mb-6">
        {/* Decorative elements */}
        <div className="absolute top-4 right-4 w-20 h-20 bg-secondary/30 rounded-full blur-2xl" />
        <div className="absolute bottom-4 left-4 w-16 h-16 bg-accent/30 rounded-full blur-xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Heart size={18} className="text-primary fill-primary" />
            <span className="text-sm font-semibold text-primary">Trusted Care</span>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2 leading-tight">
            Find Trusted Help
            <br />
            <span className="text-primary">For Your Family</span>
          </h1>

          <p className="text-sm text-muted-foreground mb-5 max-w-xs">
            Connect with verified nannies, housekeepers, and caregivers in your area.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={onFindHelpers} className="flex-1">
              Find Helpers
              <ArrowRight size={16} />
            </Button>
            <Button variant="outline" onClick={onPostProfile} className="flex-1">
              Post Your Profile
            </Button>
          </div>

          <div className="flex items-center gap-4 mt-5 pt-4 border-t border-primary/10">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-primary" />
              <span className="text-xs text-muted-foreground">Verified Profiles</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full bg-secondary border-2 border-card"
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">1,200+ helpers</span>
            </div>
          </div>
        </div>
      </section>
  );
};

export default HeroSection;
