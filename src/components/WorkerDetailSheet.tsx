import { useState, useEffect, useCallback } from "react";
import { Star, MapPin, CheckCircle, MessageCircle, Calendar, X, Play, Lock, CheckCheck, UserCheck, MessageSquare, Briefcase, ThumbsUp, CheckSquare, Eye, Globe, DollarSign, Flag, Check, MoreHorizontal, Award, Unlock } from "lucide-react";
import StatusFrame from "./StatusFrame";
import ReportBlockSheet from "./ReportBlockSheet";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import UnlockConfirmSheet from "./UnlockConfirmSheet";
import CreditWalletCard from "./CreditWalletCard";
import InAppChat from "./InAppChat";
import { maskContactInfo, getPreviewName } from "@/lib/contactMasking";
import BadgeDisplay from "./BadgeDisplay";
import ScreenshotGuard from "./ScreenshotGuard";

type HelperStatus = "available" | "interviewing" | "hired_platform" | "hired_external" | "unavailable" | "suspended";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  would_hire_again: boolean | null;
  created_at: string;
}

interface Placement {
  id: string;
  employer_name: string | null;
  job_type: string | null;
  job_category: string | null;
  status: string;
  hired_at: string;
  ended_at: string | null;
}

const statusLabels: Record<HelperStatus, { label: string; emoji: string }> = {
  available: { label: "Available", emoji: "🟢" },
  interviewing: { label: "Interviewing", emoji: "🔵" },
  hired_platform: { label: "Hired (via platform)", emoji: "🟡" },
  hired_external: { label: "Currently Employed", emoji: "🟡" },
  unavailable: { label: "Unavailable", emoji: "🔴" },
  suspended: { label: "Suspended", emoji: "⛔" },
};

interface WorkerDetailSheetProps {
  worker: {
    id: string;
    name: string;
    role: string;
    location: string;
    rating: number;
    reviews: number;
    experience: string;
    monthlyRate: string;
    verified: boolean;
    avatar: string;
    skills: string[];
    bio?: string;
    languages?: string[];
    availability?: string;
    introVideo?: string;
    availabilityStatus?: HelperStatus;
    availableFrom?: string | null;
    phone?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onHired?: () => void;
}

const StarRating = ({ rating, onRate, interactive = false, size = 14 }: { rating: number; onRate?: (r: number) => void; interactive?: boolean; size?: number }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={() => interactive && onRate?.(star)}
        className={interactive ? "cursor-pointer" : "cursor-default"}
        disabled={!interactive}
      >
        <Star
          size={size}
          className={star <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}
        />
      </button>
    ))}
  </div>
);

const formatDuration = (startDate: string, endDate: string | null) => {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  const months = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  if (months < 12) return `${months} month${months > 1 ? "s" : ""}`;
  const years = Math.floor(months / 12);
  const remaining = months % 12;
  return remaining > 0 ? `${years} yr${years > 1 ? "s" : ""} ${remaining} mo` : `${years} yr${years > 1 ? "s" : ""}`;
};

const WorkerDetailSheet = ({ worker, isOpen, onClose, onHired }: WorkerDetailSheetProps) => {
  const { user } = useAuth();
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isHiring, setIsHiring] = useState(false);
  const [showHireForm, setShowHireForm] = useState(false);
  const [hireEmployerName, setHireEmployerName] = useState("");
  const [hireJobType, setHireJobType] = useState("");
  const [hireJobCategory, setHireJobCategory] = useState("");
  const [hireAvailableFrom, setHireAvailableFrom] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [wouldHireAgain, setWouldHireAgain] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [showEndAssignment, setShowEndAssignment] = useState(false);
  const [isEndingAssignment, setIsEndingAssignment] = useState(false);
  const [activePlacement, setActivePlacement] = useState<Placement | null>(null);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [helperBadges, setHelperBadges] = useState<any[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isCheckingUnlock, setIsCheckingUnlock] = useState(true);
  const [showBundleSheet, setShowBundleSheet] = useState(false);
  const [showCreditStore, setShowCreditStore] = useState(false);
  const [remainingUnlocks, setRemainingUnlocks] = useState(0);

  const isValidUuid = worker ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(worker.id) : false;

  // Check unlock status
  useEffect(() => {
    if (worker && isOpen && user) {
      setIsCheckingUnlock(true);
      if (isValidUuid) {
        supabase
          .from("profile_unlocks")
          .select("id, expires_at")
          .eq("employer_id", user.id)
          .eq("helper_id", worker.id)
          .gte("expires_at", new Date().toISOString())
          .limit(1)
          .then(({ data }) => {
            setIsUnlocked(!!data && data.length > 0);
            setIsCheckingUnlock(false);
          });
      } else {
        // localStorage fallback for mock data
        const unlocked = JSON.parse(localStorage.getItem("unlocked_helpers") || "[]");
        setIsUnlocked(unlocked.includes(worker.id));
        setIsCheckingUnlock(false);
      }
    } else {
      setIsUnlocked(false);
      setIsCheckingUnlock(false);
    }
  }, [worker, isOpen, user, isValidUuid]);

  // Fetch reviews, work history, and badges
  useEffect(() => {
    if (worker && isOpen) {
      supabase
        .from("reviews")
        .select("id, rating, comment, would_hire_again, created_at")
        .eq("helper_id", worker.id)
        .order("created_at", { ascending: false })
        .limit(10)
        .then(({ data }) => {
          if (data) setReviews(data);
        });

      supabase
        .from("placements")
        .select("id, employer_name, job_type, job_category, status, hired_at, ended_at")
        .eq("helper_id", worker.id)
        .order("hired_at", { ascending: false })
        .then(({ data }) => {
          if (data) {
            setPlacements(data);
            const active = data.find((p) => p.status === "active");
            setActivePlacement(active || null);
          }
        });

      // Fetch badges
      supabase
        .from("badge_awards")
        .select("badge_id, badges(key, name, icon, category)")
        .eq("helper_id", worker.id)
        .then(({ data }) => {
          if (data) {
            const badges = data
              .map((ba: any) => ba.badges)
              .filter(Boolean);
            setHelperBadges(badges);
          }
        });
    }
  }, [worker, isOpen]);

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!worker || !isOpen) return null;

  const status = worker.availabilityStatus || "available";
  const isNotAvailable = status !== "available" && status !== "interviewing";
  const statusInfo = statusLabels[status];

  // Preview vs Full access helpers
  const displayName = isUnlocked ? worker.name : getPreviewName(worker.name);
  const displayBio = worker.bio
    ? (isUnlocked ? worker.bio : maskContactInfo(worker.bio))
    : "Dedicated and experienced domestic helper.";

  const handleUnlockSuccess = () => {
    setIsUnlocked(true);
    setShowBundleSheet(false);
    toast.success("Profile unlocked! You now have full access for 30 days.");
  };

  const handleMessageClick = () => {
    if (!isUnlocked) {
      setShowBundleSheet(true);
      return;
    }
    if (!user) {
      toast.error("Please log in to send messages.");
      return;
    }
    setShowChat(true);
  };

  const handleMarkAsHired = async () => {
    if (!user) { toast.error("Please log in first."); return; }
    
    setIsHiring(true);
    try {
      const { error: placementError } = await supabase.from("placements").insert({
        employer_id: user.id,
        helper_id: worker.id,
        status: "active",
        employer_name: "Employer",
        job_type: "full-time",
        job_category: worker.role,
      });
      if (placementError) throw placementError;

      const { error: updateError } = await supabase
        .from("helpers")
        .update({ availability_status: "unavailable" })
        .eq("id", worker.id);
      if (updateError) throw updateError;

      toast.success(`${worker.name} has been marked as hired!`);
      setShowHireForm(false);
      onHired?.();
    } catch (error: any) {
      console.error("Hire error:", error);
      toast.error("Failed to mark as hired. " + error.message);
    } finally {
    setIsHiring(false);
    }
  };

  const handleUnhire = async () => {
    if (!activePlacement || !user) return;
    setIsHiring(true);
    try {
      const { error: placementError } = await supabase
        .from("placements")
        .update({ status: "completed", ended_at: new Date().toISOString() })
        .eq("id", activePlacement.id);
      if (placementError) throw placementError;

      const { error: helperError } = await supabase
        .from("helpers")
        .update({ availability_status: "available" })
        .eq("id", worker.id);
      if (helperError) throw helperError;

      toast.success(`${worker.name} has been unhired and is now available.`);
      setActivePlacement(null);

      const { data } = await supabase
        .from("placements")
        .select("id, employer_name, job_type, job_category, status, hired_at, ended_at")
        .eq("helper_id", worker.id)
        .order("hired_at", { ascending: false });
      if (data) {
        setPlacements(data);
      }
      onHired?.();
    } catch (error: any) {
      toast.error("Failed to unhire. " + error.message);
    } finally {
      setIsHiring(false);
    }
  };

  const handleEndAssignment = async () => {
    if (!activePlacement || !user) return;
    setIsEndingAssignment(true);
    try {
      const { error: placementError } = await supabase
        .from("placements")
        .update({ status: "completed", ended_at: new Date().toISOString() })
        .eq("id", activePlacement.id);
      if (placementError) throw placementError;

      const { error: helperError } = await supabase
        .from("helpers")
        .update({ availability_status: "available" })
        .eq("id", worker.id);
      if (helperError) throw helperError;

      toast.success("Assignment completed! Helper is now available again.");
      setShowEndAssignment(false);
      setShowReviewForm(true);

      const { data } = await supabase
        .from("placements")
        .select("id, employer_name, job_type, job_category, status, hired_at, ended_at")
        .eq("helper_id", worker.id)
        .order("hired_at", { ascending: false });
      if (data) {
        setPlacements(data);
        setActivePlacement(null);
      }
    } catch (error: any) {
      toast.error("Failed to end assignment. " + error.message);
    } finally {
      setIsEndingAssignment(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!user || reviewRating === 0) { toast.error("Please select a rating."); return; }
    setIsSubmittingReview(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        employer_id: user.id,
        helper_id: worker.id,
        rating: reviewRating,
        comment: reviewComment || null,
        would_hire_again: wouldHireAgain,
        placement_id: activePlacement?.id || null,
      });
      if (error) throw error;
      toast.success("Review submitted! Thank you.");
      setShowReviewForm(false);
      setReviewRating(0);
      setReviewComment("");
      setWouldHireAgain(false);
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, comment, would_hire_again, created_at")
        .eq("helper_id", worker.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) setReviews(data);
    } catch (error: any) {
      toast.error("Failed to submit review. " + error.message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const completedPlacements = placements.filter((p) => p.status === "completed");

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl shadow-float animate-slide-up max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-card pt-3 pb-2 flex justify-center z-10">
          <div className="w-10 h-1 bg-muted rounded-full" />
        </div>

        <button onClick={onClose} className="absolute top-4 right-12 p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors">
          <X size={18} />
        </button>
        {user && (
          <button onClick={() => setShowReportSheet(true)} className="absolute top-4 right-4 p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors">
            <MoreHorizontal size={18} />
          </button>
        )}

        <ScreenshotGuard watermark="CONFIDENTIAL">
        <div className="px-5 pb-28">
          {/* Status Banner */}
          {status !== "available" && (
            <div className={`mb-4 p-3 rounded-2xl ${
              isNotAvailable 
                ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800" 
                : "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{statusInfo.emoji}</span>
                <p className={`text-sm font-semibold ${
                  isNotAvailable ? "text-amber-800 dark:text-amber-300" : "text-blue-800 dark:text-blue-300"
                }`}>
                  {worker.availableFrom
                    ? `Currently working — available again from ${new Date(worker.availableFrom).toLocaleDateString("en-ZA", { month: "long", day: "numeric" })}`
                    : statusInfo.label
                  }
                </p>
              </div>
            </div>
          )}

          {/* (Payment success banner removed - using in-app messaging now) */}

          {/* Unlock Badge */}
          {isUnlocked && (
            <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-2xl flex items-center gap-2">
              <Eye size={16} className="text-primary" />
              <p className="text-xs font-semibold text-primary">Full profile unlocked</p>
            </div>
          )}

          {/* Header */}
          <div className="flex items-start gap-4 mb-5">
            <StatusFrame status={status} size="lg">
              <div className={`w-20 h-20 bg-primary-light ${isNotAvailable ? "opacity-60" : ""}`}>
                <img src={worker.avatar} alt={displayName} className="w-full h-full object-cover" />
              </div>
            </StatusFrame>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
              <p className="text-muted-foreground">{worker.role}</p>
              <div className="flex items-center gap-2 mt-2">
                <StarRating rating={Math.round(worker.rating)} />
                <span className="font-bold text-sm">{worker.rating}</span>
                <span className="text-sm text-muted-foreground">({worker.reviews})</span>
              </div>
            </div>
          </div>

          {/* Intro Video - blurred when locked */}
          {worker.introVideo && (
            <div className="mb-5">
              <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                <Play size={16} className="text-primary" />
                Meet {displayName.split(" ")[0]}
              </h3>
              <div className="relative rounded-2xl overflow-hidden bg-muted aspect-video">
                {isUnlocked ? (
                  <video
                    src={worker.introVideo}
                    controls
                    playsInline
                    controlsList="nodownload"
                    poster={worker.avatar}
                    className="w-full h-full object-cover"
                    onPlay={() => setIsVideoPlaying(true)}
                    onPause={() => setIsVideoPlaying(false)}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                ) : (
                  <div className="w-full h-full relative">
                    <img src={worker.avatar} alt="" className="w-full h-full object-cover blur-md scale-110" />
                    <div className="absolute inset-0 bg-foreground/30 flex flex-col items-center justify-center gap-2">
                      <div className="w-14 h-14 rounded-full bg-card/90 flex items-center justify-center shadow-float">
                        <Lock size={22} className="text-muted-foreground" />
                      </div>
                      <p className="text-sm font-bold text-white">Unlock to watch intro</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Flag Video Button */}
              {isUnlocked && user && (
                <button
                  onClick={async () => {
                    try {
                      const { error } = await supabase.from("video_flags").insert({
                        helper_id: worker.id,
                        flagged_by: user.id,
                        reason: "contact_info_in_video",
                      });
                      if (error) {
                        if (error.code === "23505") {
                          toast.info("You've already flagged this video.");
                        } else {
                          throw error;
                        }
                      } else {
                        toast.success("Video flagged for review. Thank you!");
                      }
                    } catch (err: any) {
                      toast.error("Failed to flag video.");
                    }
                  }}
                  className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Flag size={12} />
                  Report video (contains contact info)
                </button>
              )}
            </div>
          )}

          {/* Quick Info - FREE */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-secondary rounded-2xl p-3 text-center">
              <p className="text-lg font-bold text-secondary-foreground">{worker.experience}</p>
              <p className="text-xs text-muted-foreground">experience</p>
            </div>
            <div className="bg-accent rounded-2xl p-3 text-center">
              <div className="flex justify-center"><MapPin size={18} className="text-accent-foreground" /></div>
              <p className="text-xs text-muted-foreground mt-1">{worker.location}</p>
            </div>
          </div>

          {/* Badges - FREE */}
          {helperBadges.length > 0 && (
            <div className="mb-5">
              <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                <Award size={16} className="text-primary" />
                Badges
              </h3>
              <BadgeDisplay badges={helperBadges} />
            </div>
          )}

          {/* Bio - FREE (contact info masked) */}
          <div className="mb-5">
            <h3 className="font-bold text-foreground mb-2">About</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{displayBio}</p>
          </div>

          {/* Skills - FREE */}
          <div className="mb-5">
            <h3 className="font-bold text-foreground mb-2">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {worker.skills.map((skill) => (
                <Badge key={skill} variant="soft">{skill}</Badge>
              ))}
            </div>
          </div>

          {/* Languages - FREE */}
          {worker.languages && worker.languages.length > 0 && (
            <div className="mb-5">
              <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                <Globe size={16} className="text-primary" />
                Languages
              </h3>
              <div className="flex flex-wrap gap-2">
                {worker.languages.map((lang) => (
                  <Badge key={lang} variant="outline">{lang}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Salary - FREE */}
          <div className="mb-5">
            <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
              <DollarSign size={16} className="text-primary" />
              Salary Per Month
            </h3>
            <p className="text-sm text-muted-foreground">{worker.monthlyRate}/month</p>
          </div>

          {/* Availability - FREE */}
          <div className="mb-5">
            <h3 className="font-bold text-foreground mb-2">Availability</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar size={14} />
              <span>{worker.availability || "Available Mon-Sat"}</span>
            </div>
          </div>

          {/* Rating summary - FREE */}
          <div className="mb-5">
            <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
              <Star size={16} className="text-amber-400 fill-amber-400" />
              Rating
            </h3>
            <div className="flex items-center gap-2">
              <StarRating rating={Math.round(worker.rating)} />
              <span className="font-bold text-sm">{worker.rating}</span>
              <span className="text-sm text-muted-foreground">({worker.reviews} reviews)</span>
            </div>
          </div>

          {/* ======= LOCKED SECTIONS ======= */}
          {isUnlocked ? (
            <>
              {/* Phone number hidden per spec - no call feature */}

              {/* Phone number hidden per spec - no call feature */}
              {/* Work History / References - UNLOCKED */}
              <div className="mb-5">
                <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                  <Briefcase size={16} className="text-primary" />
                  Work History & References ({completedPlacements.length})
                </h3>
                {completedPlacements.length > 0 ? (
                  <div className="space-y-2">
                    {completedPlacements.map((p) => (
                      <div key={p.id} className="bg-muted/40 rounded-2xl p-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center shrink-0">
                          <Briefcase size={18} className="text-secondary-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {p.employer_name || "Private Employer"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDuration(p.hired_at, p.ended_at)}
                            {p.job_type && ` — ${p.job_type.charAt(0).toUpperCase() + p.job_type.slice(1)}`}
                            {p.job_category && ` — ${p.job_category}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No work history yet.</p>
                )}
              </div>

              {/* Reviews - UNLOCKED */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    <MessageSquare size={16} className="text-primary" />
                    Reviews ({reviews.length})
                  </h3>
                  {user && !showReviewForm && (
                    <button onClick={() => setShowReviewForm(true)} className="text-sm text-primary font-semibold">
                      Write Review
                    </button>
                  )}
                </div>

                {/* Review Form */}
                {showReviewForm && (
                  <div className="bg-muted/50 rounded-2xl p-4 mb-4 space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-2">Rate {worker.name.split(" ")[0]}</p>
                      <StarRating rating={reviewRating} onRate={setReviewRating} interactive size={28} />
                    </div>
                    <Textarea
                      placeholder="Share your experience..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="rounded-xl resize-none"
                      rows={3}
                    />
                    <div className="flex items-center gap-3 p-3 bg-card rounded-xl">
                      <Checkbox
                        id="hire-again"
                        checked={wouldHireAgain}
                        onCheckedChange={(v) => setWouldHireAgain(v === true)}
                      />
                      <label htmlFor="hire-again" className="text-sm font-medium text-foreground flex items-center gap-2">
                        <ThumbsUp size={16} className="text-primary" />
                        Would you hire again?
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="rounded-xl"
                        onClick={() => { setShowReviewForm(false); setReviewRating(0); setReviewComment(""); }}>
                        Cancel
                      </Button>
                      <Button size="sm" className="rounded-xl flex-1" onClick={handleSubmitReview}
                        disabled={isSubmittingReview || reviewRating === 0}>
                        {isSubmittingReview ? "Submitting..." : "Submit Review"}
                      </Button>
                    </div>
                  </div>
                )}

                {reviews.length > 0 ? (
                  <div className="space-y-3">
                    {reviews.map((review) => (
                      <div key={review.id} className="bg-muted/30 rounded-2xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <StarRating rating={review.rating} />
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>
                        )}
                        {review.would_hire_again && (
                          <div className="flex items-center gap-1 mt-2">
                            <ThumbsUp size={12} className="text-primary" />
                            <span className="text-xs text-primary font-semibold">Would hire again</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No reviews yet.</p>
                )}
              </div>

              {/* Message Action - UNLOCKED */}
              {!isNotAvailable && (
                <Button size="lg" className="w-full" onClick={handleMessageClick}>
                  <MessageCircle size={18} />
                  Message {displayName.split(" ")[0]}
                </Button>
              )}
            </>
          ) : (
            <>
              {/* Video is shown in the main section above */}

              {/* Locked preview for work history & references */}
              <div className="mb-5 p-4 bg-muted/30 rounded-2xl border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Lock size={14} className="text-muted-foreground" />
                  <h3 className="font-bold text-foreground text-sm">Work History, References & Reviews</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Unlock this profile to view full work history, employer references, and detailed reviews.
                </p>
              </div>

              {/* Contact details locked - messaging only */}
              <div className="mb-5 p-4 bg-muted/30 rounded-2xl border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Lock size={14} className="text-muted-foreground" />
                  <h3 className="font-bold text-foreground text-sm">Direct Messaging</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Unlock this profile to chat directly with this helper.
                </p>
              </div>

              {/* Unlock CTA */}
              <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-2xl text-center">
                <Lock size={20} className="text-primary mx-auto mb-2" />
                <p className="text-sm font-bold text-foreground mb-1">Unlock Full Profile</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Use 1 credit to unlock full profile, intro video, work history, reviews, and direct messaging.
                </p>
                <Button size="lg" className="w-full" onClick={() => setShowBundleSheet(true)}>
                  <Eye size={18} />
                  View Full Profile
                </Button>
              </div>

              {/* Disabled message button */}
              {!isNotAvailable && (
                <Button size="lg" className="w-full opacity-50 cursor-not-allowed" disabled>
                  <Lock size={16} />
                  <MessageCircle size={18} />
                  Message — Unlock to chat
                </Button>
              )}
            </>
          )}
        </div>
        </ScreenshotGuard>
      </div>

      {/* In-App Chat */}
      <InAppChat
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        helperId={worker.id}
        helperName={displayName}
        helperAvatar={worker.avatar}
        onHired={onHired}
        isHired={!!activePlacement}
      />

      {/* Unlock Confirm Sheet */}
      <UnlockConfirmSheet
        isOpen={showBundleSheet}
        onClose={() => setShowBundleSheet(false)}
        helperName={displayName}
        helperId={worker.id}
        onUnlocked={handleUnlockSuccess}
        onBuyCredits={() => {
          setShowBundleSheet(false);
          setShowCreditStore(true);
        }}
      />

      {/* Credit Store Sheet */}
      {showCreditStore && (
        <div className="fixed inset-0 z-[65]">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setShowCreditStore(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl shadow-float animate-slide-up max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-card pt-3 pb-2 flex justify-center z-10">
              <div className="w-10 h-1 bg-muted rounded-full" />
            </div>
            <button onClick={() => setShowCreditStore(false)} className="absolute top-4 right-4 p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors">
              <X size={18} />
            </button>
            <div className="px-5 pb-28">
              <h2 className="text-xl font-bold text-foreground text-center mb-4">Buy Credits</h2>
              <CreditWalletCard onPurchaseComplete={() => setShowCreditStore(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Report/Block Sheet */}
      <ReportBlockSheet
        isOpen={showReportSheet}
        onClose={() => setShowReportSheet(false)}
        targetUserId={worker.id}
        targetName={displayName}
      />
    </div>
  );
};

export default WorkerDetailSheet;
