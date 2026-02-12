import { useState, useEffect } from "react";
import { Star, MapPin, CheckCircle, Phone, MessageCircle, Calendar, X, Play, Lock, CheckCheck, UserCheck, MessageSquare, Briefcase, ThumbsUp, CheckSquare } from "lucide-react";
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
  } | null;
  isOpen: boolean;
  onClose: () => void;
  paidAction?: "call" | "message" | null;
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

const WorkerDetailSheet = ({ worker, isOpen, onClose, paidAction, onHired }: WorkerDetailSheetProps) => {
  const { user } = useAuth();
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isHiring, setIsHiring] = useState(false);
  const [showHireForm, setShowHireForm] = useState(false);
  const [hireEmployerName, setHireEmployerName] = useState("");
  const [hireJobType, setHireJobType] = useState("");
  const [hireJobCategory, setHireJobCategory] = useState("");
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

  // Fetch reviews and work history
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
    }
  }, [worker, isOpen]);

  // Auto-trigger contact action after successful payment
  useEffect(() => {
    if (paidAction && worker && isOpen) {
      toast.success("Payment successful! Connecting you now...");
      const timer = setTimeout(() => {
        if (paidAction === "call") {
          window.location.href = `tel:+27600000000`;
        } else if (paidAction === "message") {
          const message = encodeURIComponent(
            `Hi ${worker.name}, I found your profile on Domestic Hub and I'd like to discuss hiring you. I've paid the placement fee.`
          );
          window.open(`https://wa.me/27600000000?text=${message}`, "_blank");
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [paidAction, worker, isOpen]);

  if (!worker || !isOpen) return null;

  const PLACEMENT_FEE = 250;
  const status = worker.availabilityStatus || "available";
  const isNotAvailable = status !== "available" && status !== "interviewing";
  const statusInfo = statusLabels[status];

  const handleContactClick = async (type: "call" | "message") => {
    setIsProcessingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke("initialize-payment", {
        body: {
          email: "customer@example.com",
          amount: PLACEMENT_FEE,
          workerId: worker.id,
          workerName: worker.name,
          callbackUrl: window.location.origin + "/home?payment=success&worker=" + worker.id + "&action=" + type,
        },
      });
      if (error) throw error;
      if (data?.data?.authorization_url) {
        window.location.href = data.data.authorization_url;
      } else {
        throw new Error("No payment URL returned");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to initialize payment. Please try again.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleMarkAsHired = async () => {
    if (!user) { toast.error("Please log in first."); return; }
    if (!hireEmployerName) { toast.error("Please enter your name/family name."); return; }
    if (!hireJobType) { toast.error("Please select job type."); return; }
    
    setIsHiring(true);
    try {
      const { error: placementError } = await supabase.from("placements").insert({
        employer_id: user.id,
        helper_id: worker.id,
        status: "active",
        employer_name: hireEmployerName,
        job_type: hireJobType,
        job_category: hireJobCategory || worker.role,
      });
      if (placementError) throw placementError;

      const { error: updateError } = await supabase
        .from("helpers")
        .update({ availability_status: "hired_platform" })
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
      setShowReviewForm(true); // Trigger review flow after ending
      
      // Refresh placements
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

        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors">
          <X size={18} />
        </button>

        <div className="px-5 pb-8">
          {/* Status Banner */}
          {status !== "available" && (
            <div className={`mb-4 p-3 rounded-2xl flex items-center gap-2 ${
              isNotAvailable 
                ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800" 
                : "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
            }`}>
              <span className="text-lg">{statusInfo.emoji}</span>
              <p className={`text-sm font-semibold ${
                isNotAvailable ? "text-amber-800 dark:text-amber-300" : "text-blue-800 dark:text-blue-300"
              }`}>{statusInfo.label}</p>
            </div>
          )}

          {/* Payment Success Banner */}
          {paidAction && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl flex items-center gap-3">
              <CheckCheck size={20} className="text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-800 dark:text-green-300 text-sm">Payment Successful!</p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {paidAction === "call" ? "Initiating call..." : "Opening chat..."}
                </p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-start gap-4 mb-5">
            <div className="relative">
              <div className={`w-20 h-20 rounded-2xl overflow-hidden bg-primary-light ${isNotAvailable ? "opacity-60" : ""}`}>
                <img src={worker.avatar} alt={worker.name} className="w-full h-full object-cover" />
              </div>
              {worker.verified && (
                <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1">
                  <CheckCircle size={14} />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{worker.name}</h2>
              <p className="text-muted-foreground">{worker.role}</p>
              <div className="flex items-center gap-2 mt-2">
                <StarRating rating={Math.round(worker.rating)} />
                <span className="font-bold text-sm">{worker.rating}</span>
                <span className="text-sm text-muted-foreground">({worker.reviews})</span>
              </div>
            </div>
          </div>

          {/* Intro Video */}
          {worker.introVideo && (
            <div className="mb-5">
              <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                <Play size={16} className="text-primary" />
                Meet {worker.name.split(" ")[0]}
              </h3>
              <div className="relative rounded-2xl overflow-hidden bg-muted aspect-video">
                <video src={worker.introVideo} controls playsInline poster={worker.avatar} className="w-full h-full object-cover"
                  onPlay={() => setIsVideoPlaying(true)} onPause={() => setIsVideoPlaying(false)} />
              </div>
            </div>
          )}

          {/* Quick Info */}
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

          {/* Bio */}
          <div className="mb-5">
            <h3 className="font-bold text-foreground mb-2">About</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {worker.bio || "Dedicated and experienced domestic helper."}
            </p>
          </div>

          {/* Skills */}
          <div className="mb-5">
            <h3 className="font-bold text-foreground mb-2">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {worker.skills.map((skill) => (
                <Badge key={skill} variant="soft">{skill}</Badge>
              ))}
            </div>
          </div>

          {/* Work History */}
          <div className="mb-5">
            <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
              <Briefcase size={16} className="text-primary" />
              Work History ({completedPlacements.length})
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

          {/* Availability */}
          <div className="mb-5">
            <h3 className="font-bold text-foreground mb-2">Availability</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar size={14} />
              <span>{worker.availability || "Available Mon-Sat"}</span>
            </div>
          </div>

          {/* Reviews Section */}
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

            {/* Enhanced Review Form */}
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => { setShowReviewForm(false); setReviewRating(0); setReviewComment(""); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-xl flex-1"
                    onClick={handleSubmitReview}
                    disabled={isSubmittingReview || reviewRating === 0}
                  >
                    {isSubmittingReview ? "Submitting..." : "Submit Review"}
                  </Button>
                </div>
              </div>
            )}

            {/* Reviews List */}
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

          {/* End Assignment Button (for active placements by this employer) */}
          {activePlacement && user && activePlacement.employer_name && (
            <div className="mb-4">
              {!showEndAssignment ? (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full rounded-xl"
                  onClick={() => setShowEndAssignment(true)}
                >
                  <CheckSquare size={18} />
                  Assignment Completed
                </Button>
              ) : (
                <div className="bg-muted/50 rounded-2xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground">End this assignment?</p>
                  <p className="text-xs text-muted-foreground">
                    {worker.name} will be marked as available again and visible to other employers.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowEndAssignment(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" className="rounded-xl flex-1" onClick={handleEndAssignment} disabled={isEndingAssignment}>
                      {isEndingAssignment ? "Ending..." : "Confirm End"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mark as Hired */}
          {!isNotAvailable && user && (
            <div className="mb-4">
              {!showHireForm ? (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full rounded-xl border-primary text-primary hover:bg-primary/5"
                  onClick={() => setShowHireForm(true)}
                >
                  <UserCheck size={18} />
                  Mark as Hired
                </Button>
              ) : (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
                  <h4 className="font-bold text-foreground text-sm">Hiring Details</h4>
                  <div>
                    <Label className="text-xs text-muted-foreground">Your Name / Family Name *</Label>
                    <Input
                      placeholder="e.g., Smith Family"
                      value={hireEmployerName}
                      onChange={(e) => setHireEmployerName(e.target.value)}
                      className="rounded-xl h-10 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Job Type *</Label>
                    <Select value={hireJobType} onValueChange={setHireJobType}>
                      <SelectTrigger className="rounded-xl h-10 mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Full-time</SelectItem>
                        <SelectItem value="part-time">Part-time</SelectItem>
                        <SelectItem value="live-in">Live-in</SelectItem>
                        <SelectItem value="live-out">Live-out</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Job Category</Label>
                    <Input
                      placeholder={worker.role}
                      value={hireJobCategory}
                      onChange={(e) => setHireJobCategory(e.target.value)}
                      className="rounded-xl h-10 mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowHireForm(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" className="rounded-xl flex-1" onClick={handleMarkAsHired} disabled={isHiring}>
                      {isHiring ? "Processing..." : "Confirm Hire"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment notice */}
          {!paidAction && !isNotAvailable && (
            <div className="mb-4 p-3 bg-muted rounded-2xl flex items-center gap-2 text-sm text-muted-foreground">
              <Lock size={14} className="shrink-0" />
              <span>A placement fee of <strong className="text-foreground">R250</strong> is required to contact this helper via Paystack.</span>
            </div>
          )}

          {/* Contact Actions */}
          {!isNotAvailable && (
            <div className="flex gap-3">
              <Button variant="outline" size="lg" className="flex-1"
                onClick={() => handleContactClick("call")}
                disabled={isProcessingPayment || !!paidAction}>
                <Phone size={18} />
                {isProcessingPayment ? "Processing..." : paidAction === "call" ? "Calling..." : "Call"}
              </Button>
              <Button size="lg" className="flex-1"
                onClick={() => handleContactClick("message")}
                disabled={isProcessingPayment || !!paidAction}>
                <MessageCircle size={18} />
                {isProcessingPayment ? "Processing..." : paidAction === "message" ? "Opening..." : "Message"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkerDetailSheet;
