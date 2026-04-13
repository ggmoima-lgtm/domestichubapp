import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send, Shield, X, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  showContactButton?: boolean;
}

const FAQ_DATA: { category: string; questions: { q: string; a: string }[] }[] = [
  {
    category: "Credits & Payments",
    questions: [
      {
        q: "How do credits work?",
        a: "Credits are used to unlock helper profiles. You purchase credits through our secure payment system and they're added to your wallet. Each profile unlock costs a set number of credits depending on the bundle type.",
      },
      {
        q: "How do I buy credits?",
        a: "Go to the Home tab and tap the credit wallet card, or visit your Profile and look for the Credits section. Choose a credit package, complete payment via Paystack, and credits will be added to your wallet automatically.",
      },
      {
        q: "Can I get a refund on credits?",
        a: "Refunds are handled on a case-by-case basis. Please review our Refund Policy in the app settings, or contact our support team for assistance with specific refund requests.",
      },
      {
        q: "How much does it cost to unlock a profile?",
        a: "The cost depends on the credit bundle you choose. You can view available bundles and their prices in the Credit Store accessible from the Home tab.",
      },
      {
        q: "My payment went through but I didn't get credits",
        a: "Credits are added automatically after successful payment. Please wait a few minutes for processing. If credits still haven't appeared, contact our support team with your payment reference for assistance.",
      },
    ],
  },
  {
    category: "Hiring Process",
    questions: [
      {
        q: "How do I unlock a profile?",
        a: "Browse available helpers on the Home tab. When you find someone you're interested in, tap their profile card and select 'Unlock Profile'. This will use credits from your wallet to reveal their full contact details.",
      },
      {
        q: "What happens after I unlock a profile?",
        a: "Once unlocked, you'll see the helper's phone number and email. You can contact them directly to discuss employment terms. The unlocked profile will appear in your Hub tab for easy access.",
      },
      {
        q: "How do I contact a helper?",
        a: "After unlocking a helper's profile, their contact details (phone and email) will be visible. You can also use the in-app messaging feature to communicate before unlocking.",
      },
      {
        q: "Why is a helper unavailable?",
        a: "A helper may be marked as unavailable if they're currently employed, taking a break, or have temporarily paused their profile. Check back later or browse other available helpers.",
      },
      {
        q: "How do I post a job?",
        a: "Go to your Profile tab and find the 'My Jobs' section. Tap 'Create Job Post' and fill in the details including category, location, duties, and salary range. Published jobs will be visible to matching helpers.",
      },
      {
        q: "How do I review job applications?",
        a: "When helpers apply to your job posts, you'll see the application count on the Home tab. Tap it to view all applications. You can review each applicant's profile, accept, or decline applications.",
      },
    ],
  },
  {
    category: "Verification",
    questions: [
      {
        q: "How does verification work?",
        a: "Helpers can verify their identity through our secure verification process. This includes ID document verification and background checks. Verified helpers display a verification badge on their profile.",
      },
      {
        q: "How long does verification take?",
        a: "Verification typically takes 24-48 hours after submitting your documents. You'll receive a notification once the process is complete.",
      },
      {
        q: "Why was my verification declined?",
        a: "Verification may be declined if documents are unclear, expired, or don't match your profile information. You can re-submit with corrected documents. Contact support if you need further assistance.",
      },
      {
        q: "What documents do I need for verification?",
        a: "You'll need a valid South African ID document or passport. The verification process will guide you through capturing clear photos of your documents.",
      },
    ],
  },
  {
    category: "Profile Help",
    questions: [
      {
        q: "How do I update my profile?",
        a: "Go to the Profile tab and tap the edit icon next to any section you want to update. You can change your bio, skills, availability, location, and profile photo. Remember to save your changes.",
      },
      {
        q: "How do I change my phone number?",
        a: "Go to Profile → Settings section and tap 'Change Phone'. You'll need to verify your new phone number with an OTP code.",
      },
      {
        q: "How do I upload a profile photo?",
        a: "Go to your Profile tab and tap the camera icon on your profile picture. Select a photo from your device. Your photo will be uploaded and displayed on your profile.",
      },
      {
        q: "How do I add an intro video?",
        a: "Helpers can add an intro video from the Profile tab. Tap the video section and upload a short video introducing yourself. Videos are moderated for appropriate content before being published.",
      },
      {
        q: "How do I change my availability status?",
        a: "Helpers can update their availability status from the Profile tab. Toggle between 'Available', 'Busy', or 'Unavailable'. You can also set a specific 'Available From' date if you'll be available in the future.",
      },
    ],
  },
  {
    category: "Account & Settings",
    questions: [
      {
        q: "How do I delete my account?",
        a: "Go to Profile → scroll down to 'Delete Account'. You'll go through a secure 4-step process: review your data, request an SMS OTP to verify your identity, enter the code, and confirm deletion. All your data including profile, messages, credits, and uploaded files will be permanently removed.",
      },
      {
        q: "How do I reset my password?",
        a: "On the login screen, tap 'Forgot Password'. Enter your registered phone number and you'll receive an OTP to verify your identity. You can then set a new password.",
      },
      {
        q: "How do I change my email address?",
        a: "Currently, email changes need to be handled through our support team. Please contact info@domestichub.co.za with your request.",
      },
      {
        q: "Can I switch between employer and helper roles?",
        a: "Each account is registered with a specific role (employer or helper). If you need to use the platform in a different role, you'll need to create a separate account with a different phone number.",
      },
    ],
  },
  {
    category: "Notifications",
    questions: [
      {
        q: "How do I enable push notifications?",
        a: "When you first log in, you'll be prompted to enable push notifications. If you dismissed it, go to your device's Settings → find Domestic Hub → enable Notifications. In-app notification preferences can be managed from Profile → Notification Preferences.",
      },
      {
        q: "What notifications will I receive?",
        a: "You can receive notifications for: new messages, profile unlocks, credit transactions, hire updates, interview requests, reviews, and admin actions. Customise which ones you receive from Profile → Notification Preferences.",
      },
      {
        q: "How do I turn off notifications?",
        a: "Go to Profile → Notification Preferences. Toggle off the notification types you don't want to receive. You can also disable push notifications entirely from your device settings.",
      },
      {
        q: "I'm not receiving notifications",
        a: "Check that push notifications are enabled in your device settings for Domestic Hub. Also verify your preferences in Profile → Notification Preferences. If issues persist, try logging out and back in, or contact support.",
      },
    ],
  },
  {
    category: "Reporting & Safety",
    questions: [
      {
        q: "How do I report a user?",
        a: "Open the user's profile and tap the report button (flag icon). Select a reason for reporting and provide any additional details. Our team will review the report and take appropriate action.",
      },
      {
        q: "Is Domestic Hub responsible for agreements outside the app?",
        a: "No. Domestic Hub is a connection platform that helps employers find helpers. We are not responsible for any agreements, employment terms, or interactions that occur outside the app. We strongly recommend formalising any employment arrangements with proper contracts.",
      },
      {
        q: "How do I block a user?",
        a: "Open the user's profile or message thread and tap the report/block option. Select 'Block User' to prevent them from contacting you. Blocked users won't be able to see your profile or send you messages.",
      },
      {
        q: "How do I flag inappropriate video content?",
        a: "If you see a helper's intro video with inappropriate content, tap the flag icon on the video player. Select a reason and our moderation team will review the content within 24 hours.",
      },
    ],
  },
  {
    category: "App & Updates",
    questions: [
      {
        q: "How do I update the app?",
        a: "Domestic Hub is a web application that updates automatically. Simply refresh the page or close and reopen the app to get the latest version. No manual app store updates are required.",
      },
      {
        q: "The app is not loading properly",
        a: "Try these steps: 1) Refresh the page, 2) Clear your browser cache, 3) Try a different browser (Chrome is recommended), 4) Check your internet connection. If the issue persists, contact our support team.",
      },
      {
        q: "Which browsers are supported?",
        a: "Domestic Hub works best on Google Chrome, Safari, and Firefox. We recommend using the latest version of your browser for the best experience.",
      },
      {
        q: "Can I install Domestic Hub on my phone?",
        a: "Yes! You can add Domestic Hub to your home screen. On Chrome: tap the menu (⋮) → 'Add to Home screen'. On Safari: tap the share button → 'Add to Home Screen'. This gives you an app-like experience.",
      },
    ],
  },
];

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi 👋 I'm the Domestic Hub Support Assistant. I can help with common questions about credits, profiles, verification, hiring, payments, notifications, account settings, and more.\n\nChoose a category below or type your question:",
};

const CATEGORIES = FAQ_DATA.map((c) => c.category);

const findAnswer = (input: string): string | null => {
  const lower = input.toLowerCase();
  
  // First try exact question matching with high keyword overlap
  for (const cat of FAQ_DATA) {
    for (const faq of cat.questions) {
      const keywords = faq.q.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const matchCount = keywords.filter((w) => lower.includes(w)).length;
      // Require at least 50% of keywords to match AND at least 2 matches
      if (keywords.length > 0 && matchCount >= Math.max(2, Math.ceil(keywords.length * 0.5))) return faq.a;
    }
  }
  
  // Specific keyword-based matching (ordered from most specific to least)
  if (lower.includes("didn't come") || lower.includes("didnt come") || lower.includes("no show") || lower.includes("not come to work")) {
    return "Domestic Hub is a connection platform that helps employers find helpers. We are not responsible for any agreements, employment terms, or interactions that occur outside the app. We strongly recommend formalising any employment arrangements with proper contracts. If you'd like to report the helper, you can do so from their profile.";
  }
  if (lower.includes("delete") && lower.includes("account")) return FAQ_DATA[4].questions[0].a;
  if (lower.includes("reset") && lower.includes("password")) return FAQ_DATA[4].questions[1].a;
  if (lower.includes("switch") && lower.includes("role")) return FAQ_DATA[4].questions[3].a;
  if (lower.includes("notif") && lower.includes("enable")) return FAQ_DATA[5].questions[0].a;
  if (lower.includes("notif") && (lower.includes("off") || lower.includes("turn"))) return FAQ_DATA[5].questions[2].a;
  if (lower.includes("notif") && lower.includes("not receiv")) return FAQ_DATA[5].questions[3].a;
  if (lower.includes("notification")) return FAQ_DATA[5].questions[1].a;
  if (lower.includes("update") && lower.includes("app")) return FAQ_DATA[7].questions[0].a;
  if (lower.includes("not loading") || lower.includes("won't load")) return FAQ_DATA[7].questions[1].a;
  if (lower.includes("browser") && lower.includes("support")) return FAQ_DATA[7].questions[2].a;
  if (lower.includes("install") || lower.includes("home screen")) return FAQ_DATA[7].questions[3].a;
  if (lower.includes("block") && lower.includes("user")) return FAQ_DATA[6].questions[2].a;
  if (lower.includes("flag") && lower.includes("video")) return FAQ_DATA[6].questions[3].a;
  if (lower.includes("post") && lower.includes("job")) return FAQ_DATA[1].questions[4].a;
  if (lower.includes("application") && (lower.includes("review") || lower.includes("view"))) return FAQ_DATA[1].questions[5].a;
  if ((lower.includes("photo") || lower.includes("picture")) && lower.includes("profile")) return FAQ_DATA[3].questions[2].a;
  if (lower.includes("video") && lower.includes("intro")) return FAQ_DATA[3].questions[3].a;
  if (lower.includes("availability") && lower.includes("status")) return FAQ_DATA[3].questions[4].a;
  if (lower.includes("declined") && lower.includes("verif")) return FAQ_DATA[2].questions[2].a;
  if (lower.includes("verification") && lower.includes("document")) return FAQ_DATA[2].questions[3].a;
  if (lower.includes("payment") && (lower.includes("didn") || lower.includes("no credit"))) return FAQ_DATA[0].questions[4].a;
  if (lower.includes("cost") || lower.includes("price")) return FAQ_DATA[0].questions[3].a;
  if (lower.includes("credit") && (lower.includes("how") || lower.includes("what"))) return FAQ_DATA[0].questions[0].a;
  if (lower.includes("buy") && lower.includes("credit")) return FAQ_DATA[0].questions[1].a;
  if (lower.includes("unlock") && lower.includes("profile")) return FAQ_DATA[1].questions[0].a;
  if (lower.includes("refund")) return FAQ_DATA[0].questions[2].a;
  if (lower.includes("verif") && !lower.includes("work")) return FAQ_DATA[2].questions[0].a;
  if (lower.includes("profile") && lower.includes("update")) return FAQ_DATA[3].questions[0].a;
  if (lower.includes("report") && lower.includes("user")) return FAQ_DATA[6].questions[0].a;
  if (lower.includes("contact") && lower.includes("helper")) return FAQ_DATA[1].questions[2].a;
  if (lower.includes("unavailable") && lower.includes("helper")) return FAQ_DATA[1].questions[3].a;
  if (lower.includes("change") && lower.includes("phone")) return FAQ_DATA[3].questions[1].a;
  if (lower.includes("change") && lower.includes("email")) return FAQ_DATA[4].questions[2].a;
  if (lower.includes("outside") || lower.includes("liable") || lower.includes("responsible")) return FAQ_DATA[6].questions[1].a;
  if (lower.includes("hire") || lower.includes("hiring")) return FAQ_DATA[1].questions[0].a;
  
  return null;
};

interface FAQChatAssistantProps {
  onBack: () => void;
  onContactSupport: () => void;
  isFloating?: boolean;
}

const FAQChatAssistant = ({ onBack, onContactSupport, isFloating = false }: FAQChatAssistantProps) => {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [showCategories, setShowCategories] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const addMessages = (userMsg: string, botReply: string, showContact = false) => {
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: userMsg },
      {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: botReply,
        showContactButton: showContact,
      },
    ]);
  };

  const handleCategoryClick = (category: string) => {
    setShowCategories(false);
    const cat = FAQ_DATA.find((c) => c.category === category);
    if (!cat) return;

    const questionList = cat.questions.map((q) => `• ${q.q}`).join("\n");
    addMessages(category, `Here are common questions about **${category}**:\n\n${questionList}\n\nTap a question or type your own:`);
  };

  const handleQuestionClick = (question: string) => {
    const answer = findAnswer(question);
    if (answer) {
      addMessages(question, answer);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userInput = input.trim();
    setInput("");
    setShowCategories(false);

    const answer = findAnswer(userInput);
    if (answer) {
      addMessages(userInput, answer);
    } else {
      addMessages(
        userInput,
        "I'm sorry, I couldn't find an answer to that question.\n\nThis issue needs support assistance. Please contact our support team.",
        true
      );
    }
  };

  const extractQuestions = (content: string): string[] => {
    const matches = content.match(/• .+/g);
    return matches ? matches.map((m) => m.replace("• ", "")) : [];
  };

  const containerClass = isFloating
    ? "flex flex-col h-full"
    : "flex flex-col h-[calc(100vh-8rem)]";

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-border px-1">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          {isFloating ? <X size={18} className="text-foreground" /> : <ArrowLeft size={20} className="text-foreground" />}
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-sm text-foreground">FAQ Assistant</h2>
          <p className="text-[11px] text-muted-foreground">Always here to help</p>
        </div>
        {isFloating && (
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <Minimize2 size={16} className="text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-3 space-y-3 px-1">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              }`}
            >
              {msg.content.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
                part.startsWith("**") && part.endsWith("**") ? (
                  <strong key={i}>{part.slice(2, -2)}</strong>
                ) : (
                  <span key={i}>{part}</span>
                )
              )}

              {msg.role === "assistant" && extractQuestions(msg.content).length > 0 && (
                <div className="mt-2.5 space-y-1">
                  {extractQuestions(msg.content).map((q) => (
                    <button
                      key={q}
                      onClick={() => handleQuestionClick(q)}
                      className="block w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-background/60 hover:bg-background text-primary font-medium transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {msg.showContactButton && (
                <Button
                  size="sm"
                  className="mt-3 w-full"
                  onClick={onContactSupport}
                >
                  Contact Support
                </Button>
              )}
            </div>
          </div>
        ))}

        {showCategories && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className="px-2.5 py-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors"
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="flex items-center gap-1.5 px-1 py-1">
        <Shield size={9} className="text-muted-foreground shrink-0" />
        <p className="text-[8px] text-muted-foreground">
          Domestic Hub is a connection platform and is not responsible for agreements outside the app.
        </p>
      </div>

      {/* Input */}
      <div className="flex gap-2 pt-2 border-t border-border px-1">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type your question..."
          className="flex-1 rounded-xl text-sm h-9"
        />
        <Button size="icon" onClick={handleSend} disabled={!input.trim()} className="h-9 w-9">
          <Send size={14} />
        </Button>
      </div>
    </div>
  );
};

export default FAQChatAssistant;
