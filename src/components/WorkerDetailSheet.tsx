import { Star, MapPin, CheckCircle, Phone, MessageCircle, Calendar, X, Play, Lock, CheckCheck } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  } | null;
  isOpen: boolean;
  onClose: () => void;
  paidAction?: "call" | "message" | null;
}

const WorkerDetailSheet = ({ worker, isOpen, onClose, paidAction }: WorkerDetailSheetProps) => {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Auto-trigger contact action after successful payment
  useEffect(() => {
    if (paidAction && worker && isOpen) {
      toast.success("Payment successful! Connecting you now...");
      // Small delay for user to see the success message
      const timer = setTimeout(() => {
        if (paidAction === "call") {
          // Open phone dialer with a placeholder number
          window.location.href = `tel:+27600000000`;
        } else if (paidAction === "message") {
          // Open WhatsApp with pre-filled message
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

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl shadow-float animate-slide-up max-h-[85vh] overflow-y-auto">
        {/* Handle */}
        <div className="sticky top-0 bg-card pt-3 pb-2 flex justify-center z-10">
          <div className="w-10 h-1 bg-muted rounded-full" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="px-5 pb-8">
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
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-primary-light">
                <img
                  src={worker.avatar}
                  alt={worker.name}
                  className="w-full h-full object-cover"
                />
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
                <div className="flex items-center gap-1">
                  <Star size={14} className="text-amber-400 fill-amber-400" />
                  <span className="font-bold">{worker.rating}</span>
                  <span className="text-sm text-muted-foreground">({worker.reviews} reviews)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Intro Video */}
          {worker.introVideo && (
            <div className="mb-5">
              <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                <Play size={16} className="text-primary" />
                Meet {worker.name.split(' ')[0]}
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
                >
                  Your browser does not support the video tag.
                </video>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Personal introduction video
              </p>
            </div>
          )}

          {/* Quick Info */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-secondary rounded-2xl p-3 text-center">
              <p className="text-lg font-bold text-secondary-foreground">{worker.experience}</p>
              <p className="text-xs text-muted-foreground">experience</p>
            </div>
            <div className="bg-accent rounded-2xl p-3 text-center">
              <div className="flex justify-center">
                <MapPin size={18} className="text-accent-foreground" />
              </div>
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
                <Badge key={skill} variant="soft">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div className="mb-6">
            <h3 className="font-bold text-foreground mb-2">Availability</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar size={14} />
              <span>{worker.availability || "Available Mon-Sat, Full-time or Part-time"}</span>
            </div>
          </div>

          {/* Payment notice or success */}
          {!paidAction && (
            <div className="mb-4 p-3 bg-muted rounded-2xl flex items-center gap-2 text-sm text-muted-foreground">
              <Lock size={14} className="shrink-0" />
              <span>A placement fee of <strong className="text-foreground">R250</strong> is required to contact this helper via Paystack.</span>
            </div>
          )}

          {/* Actions */}
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
        </div>
      </div>
    </div>
  );
};

export default WorkerDetailSheet;
