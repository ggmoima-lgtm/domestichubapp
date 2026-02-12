import { useState, useEffect } from "react";
import { Star, MapPin, CheckCircle, Phone, MessageCircle, Calendar, X, Play, Lock, CheckCheck, UserCheck, MessageSquare } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

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
    availabilityStatus?: "available" | "unavailable";
  } | null;
  isOpen: boolean;
  onClose: () => void;
  paidAction?: "call" | "message" | null;
  onHired?: () => void;
}

const StarRating = ({ rating, onRate, interactive = false }: { rating: number; onRate?: (r: number) => void; interactive?: boolean }) => (
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
          size={interactive ? 24 : 14}
          className={star <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}
        />
      </button>
    ))}
  </div>
);

const WorkerDetailSheet = ({ worker, isOpen, onClose, paidAction, onHired }: WorkerDetailSheetProps) => {
  const { user } = useAuth();
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isHiring, setIsHiring] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Fetch reviews for this helper
  useEffect(() => {
    if (worker && isOpen) {
      supabase
        .from("reviews")
        .select("id, rating, comment, created_at")
        .eq("helper_id", worker.id)
        .order("created_at", { ascending: false })
        .limit(10)
        .then(({ data }) => {
          if (data) setReviews(data);
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
  const isUnavailable = worker.availabilityStatus === "unavailable";

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
    if (!user) {
      toast.error("Please log in first.");
      return;
    }
    setIsHiring(true);
    try {
      // Create placement record
      const { error: placementError } = await supabase.from("placements").insert({
        employer_id: user.id,
        helper_id: worker.id,
        status: "active",
      });
      if (placementError) throw placementError;

      // Update helper availability status
      const { error: updateError } = await supabase
        .from("helpers")
        .update({ availability_status: "unavailable" })
        .eq("id", worker.id);
      if (updateError) throw updateError;

      toast.success(`${worker.name} has been marked as hired!`);
      onHired?.();
    } catch (error: any) {
      console.error("Hire error:", error);
      toast.error("Failed to mark as hired. " + error.message);
    } finally {
      setIsHiring(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!user || reviewRating === 0) {
      toast.error("Please select a rating.");
      return;
    }
    setIsSubmittingReview(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        employer_id: user.id,
        helper_id: worker.id,
        rating: reviewRating,
        comment: reviewComment || null,
      });
      if (error) throw error;
      toast.success("Review submitted!");
      setShowReviewForm(false);
      setReviewRating(0);
      setReviewComment("");
      // Refresh reviews
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at")
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
          {/* Unavailable Banner */}
          {isUnavailable && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center gap-2">
              <span className="text-lg">🟡</span>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Currently Employed — On Assignment</p>
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
              <div className={`w-20 h-20 rounded-2xl overflow-hidden bg-primary-light ${isUnavailable ? "opacity-60" : ""}`}>
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
                <video
                  src={worker.introVideo}
                  controls
                  playsInline
                  poster={worker.avatar}
                  className="w-full h-full object-cover"
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                />
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
              {worker.bio || "Dedicated and experienced domestic helper with a passion for providing excellent care."}
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

          {/* Availability */}
          <div className="mb-5">
            <h3 className="font-bold text-foreground mb-2">Availability</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar size={14} />
              <span>{worker.availability || "Available Mon-Sat, Full-time or Part-time"}</span>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <MessageSquare size={16} className="text-primary" />
                Reviews ({reviews.length})
              </h3>
              {user && (
                <button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="text-sm text-primary font-semibold"
                >
                  {showReviewForm ? "Cancel" : "Write Review"}
                </button>
              )}
            </div>

            {/* Review Form */}
            {showReviewForm && (
              <div className="bg-muted/50 rounded-2xl p-4 mb-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Your Rating</p>
                  <StarRating rating={reviewRating} onRate={setReviewRating} interactive />
                </div>
                <Textarea
                  placeholder="Share your experience with this helper..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="rounded-xl resize-none"
                  rows={3}
                />
                <Button
                  size="sm"
                  className="rounded-xl"
                  onClick={handleSubmitReview}
                  disabled={isSubmittingReview || reviewRating === 0}
                >
                  {isSubmittingReview ? "Submitting..." : "Submit Review"}
                </Button>
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
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            )}
          </div>

          {/* Mark as Hired Button */}
          {!isUnavailable && user && (
            <div className="mb-4">
              <Button
                variant="outline"
                size="lg"
                className="w-full rounded-xl border-primary text-primary hover:bg-primary/5"
                onClick={handleMarkAsHired}
                disabled={isHiring}
              >
                <UserCheck size={18} />
                {isHiring ? "Processing..." : "Mark as Hired"}
              </Button>
            </div>
          )}

          {/* Payment notice */}
          {!paidAction && !isUnavailable && (
            <div className="mb-4 p-3 bg-muted rounded-2xl flex items-center gap-2 text-sm text-muted-foreground">
              <Lock size={14} className="shrink-0" />
              <span>A placement fee of <strong className="text-foreground">R250</strong> is required to contact this helper via Paystack.</span>
            </div>
          )}

          {/* Contact Actions */}
          {!isUnavailable && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => handleContactClick("call")}
                disabled={isProcessingPayment || !!paidAction}
              >
                <Phone size={18} />
                {isProcessingPayment ? "Processing..." : paidAction === "call" ? "Calling..." : "Call"}
              </Button>
              <Button
                size="lg"
                className="flex-1"
                onClick={() => handleContactClick("message")}
                disabled={isProcessingPayment || !!paidAction}
              >
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
