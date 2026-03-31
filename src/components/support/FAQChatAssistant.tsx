import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    ],
  },
];

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi 👋 I'm the Domestic Hub Support Assistant. I can help with common questions about credits, profiles, verification, hiring, payments, and reporting issues.\n\nChoose a category below or type your question:",
};

const CATEGORIES = FAQ_DATA.map((c) => c.category);

const findAnswer = (input: string): string | null => {
  const lower = input.toLowerCase();
  for (const cat of FAQ_DATA) {
    for (const faq of cat.questions) {
      const keywords = faq.q.toLowerCase().split(/\s+/);
      const matchCount = keywords.filter((w) => w.length > 3 && lower.includes(w)).length;
      if (matchCount >= 2) return faq.a;
    }
  }
  // Check for keyword matches
  if (lower.includes("credit")) return FAQ_DATA[0].questions[0].a;
  if (lower.includes("unlock")) return FAQ_DATA[1].questions[0].a;
  if (lower.includes("refund")) return FAQ_DATA[0].questions[2].a;
  if (lower.includes("verif")) return FAQ_DATA[2].questions[0].a;
  if (lower.includes("profile") && lower.includes("update")) return FAQ_DATA[3].questions[0].a;
  if (lower.includes("report")) return FAQ_DATA[4].questions[0].a;
  if (lower.includes("contact") && lower.includes("helper")) return FAQ_DATA[1].questions[2].a;
  if (lower.includes("unavailable")) return FAQ_DATA[1].questions[3].a;
  if (lower.includes("phone")) return FAQ_DATA[3].questions[1].a;
  if (lower.includes("outside") || lower.includes("liable") || lower.includes("responsible")) return FAQ_DATA[4].questions[1].a;
  if (lower.includes("buy") || lower.includes("purchase")) return FAQ_DATA[0].questions[1].a;
  if (lower.includes("hire") || lower.includes("hiring")) return FAQ_DATA[1].questions[0].a;
  return null;
};

interface FAQChatAssistantProps {
  onBack: () => void;
  onContactSupport: () => void;
}

const FAQChatAssistant = ({ onBack, onContactSupport }: FAQChatAssistantProps) => {
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
        "I'm sorry, I couldn't find an answer to that question.\n\nThis issue may need support assistance. Please contact our support team for further help.",
        true
      );
    }
  };

  // Extract clickable questions from bot messages
  const extractQuestions = (content: string): string[] => {
    const matches = content.match(/• .+/g);
    return matches ? matches.map((m) => m.replace("• ", "")) : [];
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-border">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <div>
          <h2 className="font-bold text-sm text-foreground">FAQ Assistant</h2>
          <p className="text-[11px] text-muted-foreground">Always here to help</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
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

              {/* Clickable question list */}
              {msg.role === "assistant" && extractQuestions(msg.content).length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {extractQuestions(msg.content).map((q) => (
                    <button
                      key={q}
                      onClick={() => handleQuestionClick(q)}
                      className="block w-full text-left text-xs px-3 py-2 rounded-lg bg-background/60 hover:bg-background text-primary font-medium transition-colors"
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

        {/* Category pills */}
        {showCategories && (
          <div className="flex flex-wrap gap-2 px-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="flex items-center gap-1.5 px-1 py-1.5">
        <Shield size={10} className="text-muted-foreground shrink-0" />
        <p className="text-[9px] text-muted-foreground">
          Domestic Hub is a connection platform and is not responsible for agreements outside the app.
        </p>
      </div>

      {/* Input */}
      <div className="flex gap-2 pt-2 border-t border-border">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type your question..."
          className="flex-1 rounded-xl text-sm"
        />
        <Button size="icon" onClick={handleSend} disabled={!input.trim()}>
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
};

export default FAQChatAssistant;
