import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SupportHome from "@/components/support/SupportHome";
import FAQChatAssistant from "@/components/support/FAQChatAssistant";
import ContactSupport from "@/components/support/ContactSupport";
import ReportProblem from "@/components/support/ReportProblem";

type Screen = "home" | "faq" | "contact" | "report";

const SupportPage = () => {
  const [screen, setScreen] = useState<Screen>("home");
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();

  const handleBack = () => {
    setSearchParams({ tab: "profile" }, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-4 pb-24">
      {screen === "home" && <SupportHome onNavigate={setScreen} onBack={handleBack} />}
      {screen === "faq" && (
        <FAQChatAssistant
          onBack={() => setScreen("home")}
          onContactSupport={() => setScreen("contact")}
        />
      )}
      {screen === "contact" && <ContactSupport onBack={() => setScreen("home")} />}
      {screen === "report" && <ReportProblem onBack={() => setScreen("home")} />}
    </div>
  );
};

export default SupportPage;
