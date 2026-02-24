import { useEffect, useState, ReactNode } from "react";
import { ShieldAlert } from "lucide-react";

/**
 * Wraps sensitive content to discourage screenshots, screen recording, and screen sharing.
 * - Hides content during print / print-screen
 * - Detects screen capture/recording via Display Media API
 * - Prevents text selection and drag
 * - Adds a watermark overlay (optional)
 */
const ScreenshotGuard = ({ children, watermark }: { children: ReactNode; watermark?: string }) => {
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    // Attempt to detect PrintScreen key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        e.preventDefault();
        navigator.clipboard?.writeText?.("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    // Detect screen capture via navigator.mediaDevices
    // When getDisplayMedia is called by any app, we can't directly detect it,
    // but we can use the Screen Capture API's "change" events and visibility API
    const handleVisibilityChange = () => {
      // Not directly useful but part of layered defense
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Detect Picture-in-Picture which could be used for recording
    const handlePiP = () => setIsCapturing(true);
    const handlePiPExit = () => setIsCapturing(false);
    document.addEventListener("enterpictureinpicture", handlePiP);
    document.addEventListener("leavepictureinpicture", handlePiPExit);

    // Override getDisplayMedia to detect when screen sharing starts
    if (navigator.mediaDevices) {
      const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia?.bind(navigator.mediaDevices);
      if (originalGetDisplayMedia) {
        navigator.mediaDevices.getDisplayMedia = async (constraints?: DisplayMediaStreamOptions) => {
          setIsCapturing(true);
          const stream = await originalGetDisplayMedia(constraints);
          stream.getTracks().forEach((track) => {
            track.addEventListener("ended", () => setIsCapturing(false));
          });
          return stream;
        };
      }
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("enterpictureinpicture", handlePiP);
      document.removeEventListener("leavepictureinpicture", handlePiPExit);
    };
  }, []);

  return (
    <div className="screenshot-guard relative">
      {isCapturing ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
          <ShieldAlert size={40} className="text-destructive" />
          <h3 className="text-lg font-bold text-foreground">Screen Recording Detected</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Personal details are hidden while screen recording or sharing is active. Please stop recording to view this content.
          </p>
        </div>
      ) : (
        <div className="select-none" style={{ WebkitUserSelect: "none", userSelect: "none" }} draggable={false}>
          {children}
        </div>
      )}
      {watermark && !isCapturing && (
        <div
          className="pointer-events-none absolute inset-0 z-[5] overflow-hidden opacity-[0.04]"
          aria-hidden="true"
        >
          <div className="w-full h-full flex flex-wrap items-center justify-center gap-8 -rotate-45">
            {Array.from({ length: 20 }).map((_, i) => (
              <span key={i} className="text-foreground text-xs font-bold whitespace-nowrap">
                {watermark}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreenshotGuard;
