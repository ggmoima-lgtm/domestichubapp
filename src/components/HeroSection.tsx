import { Button } from "./ui/button";
import { ArrowRight, Shield, Heart, Play, X } from "lucide-react";
import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "./ui/dialog";
import helperIntroVideo from "@/assets/helper-intro-video.mp4";

interface HeroSectionProps {
  onFindHelpers: () => void;
  onPostProfile: () => void;
}

const HeroSection = ({ onFindHelpers, onPostProfile }: HeroSectionProps) => {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleOpenVideo = () => {
    setIsVideoOpen(true);
  };

  const handleCloseVideo = () => {
    setIsVideoOpen(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <>
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

          {/* Video Preview Button */}
          <button
            onClick={handleOpenVideo}
            className="w-full mb-5 relative rounded-2xl overflow-hidden group cursor-pointer border-2 border-primary/20 hover:border-primary/40 transition-all"
          >
            <div className="aspect-video bg-gradient-to-br from-primary/10 via-secondary/20 to-accent/10 flex items-center justify-center relative">
              <video
                src={helperIntroVideo}
                className="absolute inset-0 w-full h-full object-cover opacity-60"
                muted
                playsInline
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 to-transparent" />
              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Play size={24} className="text-primary-foreground ml-1" fill="currentColor" />
                </div>
                <span className="text-sm font-medium text-white drop-shadow-md">
                  Watch Intro (2 min)
                </span>
              </div>
            </div>
          </button>

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

      {/* Video Dialog */}
      <Dialog open={isVideoOpen} onOpenChange={setIsVideoOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-foreground/95 border-0">
          <DialogTitle className="sr-only">Helper Introduction Video</DialogTitle>
          <button
            onClick={handleCloseVideo}
            className="absolute top-3 right-3 z-50 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors"
          >
            <X size={18} className="text-foreground" />
          </button>
          <div className="aspect-[9/16] max-h-[80vh]">
            <video
              ref={videoRef}
              src={helperIntroVideo}
              className="w-full h-full object-contain"
              controls
              autoPlay
              playsInline
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HeroSection;
