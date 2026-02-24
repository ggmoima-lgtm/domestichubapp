import { useEffect } from "react";

const ArchitectureFlowchart = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
    script.onload = () => {
      (window as any).mermaid.initialize({ startOnLoad: true, theme: "default", securityLevel: "loose" });
      (window as any).mermaid.contentLoaded();
    };
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  const diagram = `graph TD
    subgraph Frontend["Frontend - React / Vite / TypeScript"]
        App[App.tsx Router]
        Auth[Auth Page]
        Onboarding[Onboarding]
        Index[Home / Index]
        Admin[Admin Dashboard]
        HelperReg[Helper Registration]
        Legal[Legal Pages]
        App --> Auth
        App --> Onboarding
        App --> Index
        App --> Admin
        App --> HelperReg
        App --> Legal
        Index --> WorkerCard[Worker Cards]
        Index --> WorkerDetail[Worker Detail Sheet]
        Index --> CartSheet[Cart / Unlock Sheet]
        Index --> InAppChat[In-App Chat]
        Index --> HelperHome[Helper Home View]
        Index --> ProfileTab[Profile Tab]
        Index --> InvoiceHistory[Invoice History]
        Index --> CreditWallet[Credit Wallet Card]
    end
    subgraph Auth_Layer["Authentication"]
        AuthProvider[AuthProvider Context]
        ProtectedRoute[ProtectedRoute Guard]
        OAuth[OAuth - Google / Apple]
        OAuth --> AuthProvider
        AuthProvider --> ProtectedRoute
    end
    subgraph Database["Database - 23 Tables with RLS"]
        profiles
        helpers
        employer_profiles
        credit_wallets
        credit_transactions
        profile_unlocks
        invoices
        messages
        job_posts
        job_applications
        placements
        reviews
        saved_helpers
        badges
        promo_codes
        user_roles
        push_tokens
    end
    subgraph Edge_Functions["Backend Functions"]
        InitPay[initialize-payment]
        Webhook[paystack-webhook]
        InvoiceEmail[send-invoice-email]
        AutoRefund[auto-refund]
        BadgeEngine[badge-engine]
        ModMsg[moderate-message]
        ModVideo[moderate-video]
        SendNotif[send-notification]
        ShuftiVerify[shufti-verify]
        ShuftiHook[shufti-webhook]
        StatusRemind[status-reminder]
    end
    subgraph External["External Services"]
        Paystack[Paystack Payments]
        Resend[Resend Email]
        Shufti[ShuftiPro KYC]
        GoogleMaps[Google Maps API]
    end
    Frontend -->|SDK| Database
    Frontend -->|useAuth| Auth_Layer
    Frontend -->|invoke| Edge_Functions
    InitPay -->|API| Paystack
    Paystack -->|webhook| Webhook
    Webhook -->|RPC| Database
    Webhook -->|call| InvoiceEmail
    InvoiceEmail -->|API| Resend
    ShuftiVerify -->|API| Shufti
    Shufti -->|webhook| ShuftiHook
    ShuftiHook --> Database
    Frontend -->|Places API| GoogleMaps`;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 24, background: "#fff", minHeight: "100vh" }}>
      <h1 style={{ textAlign: "center", fontSize: 22, marginBottom: 4 }}>Domestic Hub - Full Architecture</h1>
      <p style={{ textAlign: "center", color: "#666", fontSize: 13, marginBottom: 24 }}>Generated 2026-02-24</p>
      <div className="mermaid" style={{ display: "flex", justifyContent: "center" }}>{diagram}</div>

      <h2 style={{ fontSize: 16, marginTop: 32 }}>Layer Summary</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8, fontSize: 13 }}>
        <thead><tr>{["Layer","Tech","Purpose"].map(h=><th key={h} style={{border:"1px solid #ddd",padding:"8px 10px",background:"#f5f5f5",textAlign:"left"}}>{h}</th>)}</tr></thead>
        <tbody>
          {[
            ["UI","React, Tailwind, shadcn/ui, Framer Motion","Mobile-first PWA with bottom nav tabs"],
            ["State","React Query, React Context","Data fetching, auth state, cart state"],
            ["Auth","Lovable Cloud Auth + OAuth","Session management, protected routes, onboarding gate"],
            ["Database","23 tables with RLS","Users, helpers, credits, payments, messages, jobs, reviews, badges"],
            ["Backend","11 edge functions","Payments, webhooks, email, moderation, KYC, notifications"],
            ["Payments","Paystack (ZAR)","Credit purchase, webhook, auto-credit + invoice"],
            ["KYC","ShuftiPro","Helper identity verification"],
            ["Email","Resend","Invoice delivery with branded HTML"],
            ["Maps","Google Maps Places","Location autocomplete"],
          ].map(([a,b,c])=><tr key={a}>{[a,b,c].map((v,i)=><td key={i} style={{border:"1px solid #ddd",padding:"8px 10px"}}>{v}</td>)}</tr>)}
        </tbody>
      </table>

      <h2 style={{ fontSize: 16, marginTop: 32 }}>Payment Flow</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8, fontSize: 13 }}>
        <thead><tr>{["Step","Description"].map(h=><th key={h} style={{border:"1px solid #ddd",padding:"8px 10px",background:"#f5f5f5",textAlign:"left"}}>{h}</th>)}</tr></thead>
        <tbody>
          {[
            ["1","User selects bundle → initialize-payment → Paystack checkout"],
            ["2","Paystack confirms → paystack-webhook → verifies HMAC SHA-512"],
            ["3","Webhook calls add_credits_after_purchase RPC → updates wallets + invoices"],
            ["4","Triggers send-invoice-email → HTML invoice → Resend delivery"],
          ].map(([a,b])=><tr key={a}>{[a,b].map((v,i)=><td key={i} style={{border:"1px solid #ddd",padding:"8px 10px"}}>{v}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
};

export default ArchitectureFlowchart;
