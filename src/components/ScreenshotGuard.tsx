import { useEffect, ReactNode } from "react";

/**
 * Wraps sensitive content to discourage screenshots and screen capture.
 * - Hides content during print / print-screen
 * - Prevents text selection and drag
 * - Adds a watermark overlay (optional)
 * - Uses CSS to interfere with common screen-capture tools
 */
const ScreenshotGuard = ({ children, watermark }: { children: ReactNode; watermark?: string }) => {
  useEffect(() => {
    // Attempt to detect PrintScreen key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        e.preventDefault();
        navigator.clipboard?.writeText?.("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="screenshot-guard relative">
      <div className="select-none" style={{ WebkitUserSelect: "none", userSelect: "none" }} draggable={false}>
        {children}
      </div>
      {watermark && (
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
