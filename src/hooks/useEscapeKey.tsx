import { useEffect } from "react";

/**
 * Calls `onEscape` when the Escape key is pressed while `isActive` is true.
 * Use in modal sheets/dialogs to support keyboard dismissal.
 */
export const useEscapeKey = (isActive: boolean, onEscape: () => void) => {
  useEffect(() => {
    if (!isActive) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isActive, onEscape]);
};
