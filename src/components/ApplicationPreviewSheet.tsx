import { useState, useEffect } from "react";
import { X, ShieldCheck, Star, MapPin, Briefcase, Clock, Eye, Unlock, Coins, Lock, Phone } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getPreviewName } from "@/lib/contactMasking";
import UnlockConfirmSheet from "./UnlockConfirmSheet";
import CreditWalletCard from "./CreditWalletCard";
import ScreenshotGuard from "./ScreenshotGuard";

interface ApplicantHelper {
  id: string;
  full_name: string;
  avatar_url: string | null;
  category: string;
  experience_years: number | null;
  is_verified: boolean | null;
  availability_status: string;
  skills: string[] | null;
  languages: string[] | null;
  bio: string | null;
  intro_video_url: string | null;
  availability: string | null;
  available_from: string | null;
  hourly_rate: number | null;
  phone: string;
  email: string;
}

interface ApplicationPreviewSheetProps {
  isOpen: boolean;
  onClose: () => void;
  helper: ApplicantHelper | null;
  jobTitle: string;
  applicationDate: string;
  onViewFullProfile: () => void;
}

const ApplicationPreviewSheet = ({
  isOpen,
  onClose,
  helper,
  jobTitle,
  applicationDate,
  onViewFullProfile,
}: ApplicationPreviewSheetProps) => {
  const { user } = useAuth();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isCheckingUnlock, setIsCheckingUnlock] = useState(true);
  const [showUnlockSheet, setShowUnlockSheet] = useState(false);
  const [showCreditStore, setShowCreditStore] = useState(false);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    if (!isOpen || !helper || !user) {
      setIsCheckingUnlock(false);
      return;
    }
    setIsCheckingUnlock(true);

    // Check unlock status
    supabase
      .from("profile_unlocks")
      .select("id")
      .eq("employer_id", user.id)
      .eq("helper_id", helper.id)
      .limit(1)
      .then(({ data }) => {
        setIsUnlocked(!!data && data.length > 0);
        setIsCheckingUnlock(false);
      });

    // Fetch rating
    supabase
      .from("reviews")
      .select("rating")
      .eq("helper_id", helper.id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const avg = data.reduce((s, r) => s + r.rating, 0) / data.length;
          setAvgRating(Math.round(avg * 10) / 10);
          setReviewCount(data.length);
        } else {
          setAvgRating(null);
          setReviewCount(0);
        }
      });
  }, [isOpen, helper, user]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen || !helper) return null;

  const previewName = getPreviewName(helper.full_name);

  const handleViewFullProfile = () => {
    if (isUnlocked) {
      onViewFullProfile();
    } else {
      setShowUnlockSheet(true);
    }
  };

  const handleUnlockSuccess = () => {
    setIsUnlocked(true);
    setShowUnlockSheet(false);
    // Immediately open full profile after unlock
    onViewFullProfile();
  };

  return (
    <>
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />

        <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl shadow-float animate-slide-up max-h-[80vh] overflow-y-auto">
          <div className="sticky top-0 bg-card pt-3 pb-2 flex justify-center z-20">
            <div className="w-10 h-1 bg-muted rounded-full" />
            <button
              onClick={onClose}
              className="absolute top-3 right-4 p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <ScreenshotGuard watermark="CONFIDENTIAL">
          <div className="px-5 pb-28">
            {/* Applied For Banner */}
            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-3 mb-5">
              <p className="text-xs text-muted-foreground">Applied for</p>
              <p className="text-sm font-bold text-foreground">{jobTitle}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {new Date(applicationDate).toLocaleDateString("en-ZA", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>

            {/* Profile Preview */}
            <div className="flex items-start gap-4 mb-5">
              {/* Avatar - blurred if locked */}
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-muted shrink-0 relative">
                {helper.avatar_url ? (
                  <img
                    src={helper.avatar_url}
                    alt={previewName}
                    className={`w-full h-full object-cover ${!isUnlocked ? "blur-sm scale-110" : ""}`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-primary font-bold text-2xl bg-primary-light">
                    {helper.full_name.charAt(0)}
                  </div>
                )}
                {!isUnlocked && (
                  <div className="absolute inset-0 bg-foreground/10 flex items-center justify-center">
                    <Lock size={16} className="text-card/80" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">{previewName}</h2>
                  {helper.is_verified && (
                    <ShieldCheck size={18} className="text-primary" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground capitalize">{helper.category}</p>

                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${helper.availability_status === "available" ? "bg-emerald-500" : helper.availability_status === "interviewing" ? "bg-blue-500" : "bg-red-500"}`} />
                    <span className="text-xs font-medium text-foreground">
                      {helper.availability_status === "available" ? "Available" : helper.availability_status === "interviewing" ? "In Conversation" : "Unavailable"}
                    </span>
                  </div>
                  {helper.is_verified && (
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck size={12} className="text-primary" />
                      <span className="text-xs font-medium text-primary">ID Verified</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Phone size={12} className="text-primary" />
                    <span className="text-xs font-medium text-primary">Phone Verified</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Briefcase size={12} className="text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">
                      {helper.experience_years && helper.experience_years > 0 ? `${helper.experience_years} Year${helper.experience_years !== 1 ? "s" : ""}` : "New"} Experience
                    </span>
                  </div>
                </div>

                {avgRating !== null && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Star size={14} className="text-amber-400 fill-amber-400" />
                    <span className="text-sm font-bold">{avgRating}</span>
                    <span className="text-xs text-muted-foreground">
                      ({reviewCount} review{reviewCount !== 1 ? "s" : ""})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Contact info moved to after skills */}

            {/* Free Info Grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {helper.experience_years != null && (
                <div className="bg-muted/40 rounded-2xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Briefcase size={14} className="text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Experience
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {helper.experience_years} year{helper.experience_years !== 1 ? "s" : ""}
                  </p>
                </div>
              )}

              <div className="bg-muted/40 rounded-2xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock size={14} className="text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Work Type
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground capitalize">
                  {helper.availability || "Flexible"}
                </p>
              </div>

              {helper.availability_status && (
                <div className="bg-muted/40 rounded-2xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Eye size={14} className="text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Status
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${helper.availability_status === "available" ? "bg-emerald-500" : helper.availability_status === "interviewing" ? "bg-blue-500" : "bg-red-500"}`} />
                    {helper.availability_status === "available"
                      ? "Available"
                      : helper.availability_status === "interviewing"
                      ? "In Conversation"
                      : "Unavailable"}
                  </p>
                </div>
              )}

              {helper.is_verified && (
                <div className="bg-muted/40 rounded-2xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck size={14} className="text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Verified
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-primary flex items-center gap-1"><ShieldCheck size={14} /> ID Verified</p>
                </div>
              )}
            </div>

            {/* Skills preview */}
            {helper.skills && helper.skills.length > 0 && (
              <div className="mb-5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {helper.skills.slice(0, 6).map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-[10px]">
                      {skill}
                    </Badge>
                  ))}
                  {helper.skills.length > 6 && (
                    <Badge variant="outline" className="text-[10px]">
                      +{helper.skills.length - 6} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Contact Details - UNLOCKED ONLY (after skills) */}
            {isUnlocked && (helper.phone || helper.email) && (
              <div className="mb-5 bg-primary/5 border border-primary/15 rounded-2xl p-4 space-y-3">
                <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                  <Phone size={16} className="text-primary" />
                  Contact Details
                </h3>
                {helper.phone && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
                    <a href={`tel:${helper.phone}`} className="text-sm font-semibold text-primary hover:underline">
                      {helper.phone}
                    </a>
                  </div>
                )}
                {helper.email && !helper.email.endsWith("@helper.domestichub.co.za") && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                    <a href={`mailto:${helper.email}`} className="text-sm font-semibold text-primary hover:underline">
                      {helper.email}
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Locked content hint */}
            {!isUnlocked && (
              <div className="bg-muted/40 border border-dashed border-muted-foreground/20 rounded-2xl p-4 mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <Lock size={14} className="text-muted-foreground" />
                  <p className="text-xs font-bold text-muted-foreground">Unlock to see more</p>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {["Full name", "Intro video", "Work history", "Direct messaging", "Full bio"].map(
                    (item) => (
                      <p key={item} className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
                        <Lock size={10} /> {item}
                      </p>
                    )
                  )}
                </div>
              </div>
            )}

            {/* CTA */}
            <Button size="lg" className="w-full" onClick={handleViewFullProfile} disabled={isCheckingUnlock}>
              {isUnlocked ? (
                <>
                  <Eye size={18} />
                  View Full Profile
                </>
              ) : (
                <>
                  <Unlock size={18} />
                  Use 1 Credit to View Full Profile & Chat
                </>
              )}
            </Button>
          </div>
          </ScreenshotGuard>
        </div>
      </div>

      {/* Unlock Confirm Sheet */}
      <UnlockConfirmSheet
        isOpen={showUnlockSheet}
        onClose={() => setShowUnlockSheet(false)}
        helperName={previewName}
        helperId={helper.id}
        onUnlocked={handleUnlockSuccess}
        onBuyCredits={() => {
          setShowUnlockSheet(false);
          setShowCreditStore(true);
        }}
      />

      {/* Credit Store */}
      {showCreditStore && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setShowCreditStore(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl shadow-float animate-slide-up max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-card pt-3 pb-2 flex justify-center z-10">
              <div className="w-10 h-1 bg-muted rounded-full" />
            </div>
            <button
              onClick={() => setShowCreditStore(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
            >
              <X size={18} />
            </button>
            <div className="px-5 pb-8">
              <CreditWalletCard onPurchaseComplete={() => {
                setShowCreditStore(false);
                setShowUnlockSheet(true);
              }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ApplicationPreviewSheet;
