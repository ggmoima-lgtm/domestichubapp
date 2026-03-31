import { useState } from "react";
import { MessageCircle } from "lucide-react";
import FAQChatAssistant from "@/components/support/FAQChatAssistant";

const FloatingChatButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleContactSupport = () => {
    setIsOpen(false);
    const subject = encodeURIComponent("Support Request");
    const body = encodeURIComponent("Hi Domestic Hub Support,\n\nI need help with:\n\n");
    window.open(`mailto:info@domestichub.co.za?subject=${subject}&body=${body}`, "_self");
  };

  return (
    <>
      {/* Floating chat window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-[60] w-[340px] max-w-[calc(100vw-2rem)] h-[480px] max-h-[calc(100vh-8rem)] bg-card rounded-2xl shadow-float border border-border overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="p-3 h-full">
            <FAQChatAssistant
              onBack={() => setIsOpen(false)}
              onContactSupport={handleContactSupport}
              isFloating
            />
          </div>
        </div>
      )}

      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 z-[55] w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-button hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center justify-center animate-in fade-in zoom-in duration-300"
          aria-label="Open FAQ Assistant"
        >
          <MessageCircle size={22} />
        </button>
      )}
    </>
  );
};

export default FloatingChatButton;
