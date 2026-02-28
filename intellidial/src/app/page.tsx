"use client";

import { useState, useEffect, useRef } from "react";
import { VoiceDemo, VoiceDemoRef } from "./components/VoiceDemo";
import { LoginModal } from "./components/LoginModal";
import {
  Phone,
  BarChart3,
  FileSpreadsheet,
  Building2,
  Users,
  Home,
  TrendingUp,
  Check,
  ChevronDown,
  Mail,
  Zap,
  Shield,
  Clock,
  Globe,
  Menu,
  X,
  Play,
  ArrowRight,
  Star,
  Lock,
  Headphones,
  CheckCircle2,
  Wallet,
  CalendarCheck,
  Calendar,
  Server,
  ShieldCheck,
  Settings,
  FileAudio,
  Scale,
  FileText,
  Car,
  Megaphone,
} from "lucide-react";

// Animated counter hook
function useCountUp(end: number, duration: number = 2000, startOnView: boolean = true) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startOnView) {
      setHasStarted(true);
    }
  }, [startOnView]);

  useEffect(() => {
    if (startOnView && ref.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !hasStarted) {
            setHasStarted(true);
          }
        },
        { threshold: 0.5 }
      );
      observer.observe(ref.current);
      return () => observer.disconnect();
    }
  }, [startOnView, hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;
    
    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration, hasStarted]);

  return { count, ref };
}

// Fade in on scroll component
function FadeInOnScroll({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          window.setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
    >
      {children}
    </div>
  );
}

const WAITLIST_INTEGRATIONS = [
  "Salesforce",
  "Zoho CRM",
  "Azure",
  "AWS",
  "Airtable",
  "Zapier",
  "Pipedrive",
  "Monday.com",
  "Freshsales",
  "Other",
];

function WaitlistForm() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [integration, setIntegration] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !integration) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: "Waitlist Signup",
          message: `Integration waitlist request:\n\nEmail: ${email}\nIntegration: ${integration}`,
        }),
      });
      if (res.ok) {
        setStatus("sent");
        setEmail("");
        setIntegration("");
        setTimeout(() => { setOpen(false); setStatus("idle"); }, 3000);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="text-center mt-10">
      <p className="text-sm text-slate-500 mb-6">
        Want early access? We&apos;ll notify you when new integrations launch.
      </p>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-teal-700 hover:to-cyan-700 transition-all shadow-lg shadow-teal-600/20 hover:shadow-xl hover:-translate-y-0.5"
        >
          <Mail className="w-5 h-5" />
          Join waitlist
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-sm mx-auto space-y-3">
          <select
            value={integration}
            onChange={(e) => setIntegration(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
          >
            <option value="" disabled>Which integration do you need?</option>
            {WAITLIST_INTEGRATIONS.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
          />
          <button
            type="submit"
            disabled={status === "sending" || status === "sent"}
            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-teal-700 hover:to-cyan-700 transition-all shadow-lg shadow-teal-600/20 disabled:opacity-60"
          >
            <Mail className="w-5 h-5" />
            {status === "sending" ? "Submitting..." : status === "sent" ? "You're on the list!" : status === "error" ? "Failed — try again" : "Join waitlist"}
          </button>
          {status === "sent" && (
            <p className="text-teal-600 text-sm font-medium">We&apos;ll email you when it&apos;s ready!</p>
          )}
        </form>
      )}
    </div>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [demoEmail, setDemoEmail] = useState("");
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const voiceDemoRef = useRef<VoiceDemoRef>(null);
  const [scrolled, setScrolled] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  // Scroll effect for nav
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const faqs = [
    {
      question: "How accurate is the data extraction?",
      answer:
        "Intellidial achieves 95%+ accuracy using advanced AI analysis powered by Google Gemini. Every call is recorded and available for review, giving you full transparency and quality assurance.",
    },
    {
      question: "What countries do you support?",
      answer:
        "We primarily operate in South Africa with local phone numbers, which significantly improves answer rates. We can support other African countries and international markets on request.",
    },
    {
      question: "Can I customize the questions?",
      answer:
        "Absolutely. Every project is fully customizable. You define the questions you need answered, and our AI asks them naturally during each call, adapting to the conversation flow.",
    },
    {
      question: "How long does a project take?",
      answer:
        "Most projects are completed within 2-5 business days depending on volume. We can call 100-500 numbers per day. Rush projects are available for time-sensitive needs.",
    },
    {
      question: "Is my data secure?",
      answer:
        "Yes. All data is encrypted and stored securely. We sign NDAs for enterprise clients and never share your contact lists or results with third parties.",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation — glass on scroll */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/90 backdrop-blur-xl shadow-lg shadow-slate-900/5 border-b border-slate-200/50" : "bg-transparent"
      }`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            {/* Logo */}
            <a 
              href="/" 
              onClick={(e) => {
                e.preventDefault();
                window.location.reload();
              }}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <img src="/intellidial-logo.png" alt="Intellidial" className="h-9 w-auto" />
              <span className="font-display text-xl font-bold text-slate-900">
                Intelli<span className="text-teal-600">dial</span>
              </span>
              <img
                src="https://flagcdn.com/w40/za.png"
                srcSet="https://flagcdn.com/w80/za.png 2x"
                alt=""
                width={20}
                height={14}
                className="shrink-0 rounded-sm border border-slate-200/80 object-cover h-[14px] w-[20px]"
                title="South Africa"
                aria-hidden="true"
              />
            </a>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="/dealers" className="text-slate-600 hover:text-teal-600 transition-colors font-medium">
                Dealers
              </a>
              <a href="#how-it-works" className="text-slate-600 hover:text-teal-600 transition-colors font-medium">
                How it Works
              </a>
              <a
                href="#talk-to-ai"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("talk-to-ai")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="text-slate-600 hover:text-teal-600 transition-colors font-medium"
              >
                Demo
              </a>
              <a href="#pricing" className="text-slate-600 hover:text-teal-600 transition-colors font-medium">
                Pricing
              </a>
              <a href="#hubspot" className="text-slate-600 hover:text-teal-600 transition-colors font-medium">
                HubSpot
              </a>
              <a href="#faq" className="text-slate-600 hover:text-teal-600 transition-colors font-medium">
                FAQ
              </a>
              <button type="button" onClick={() => setLoginModalOpen(true)} className="text-slate-600 hover:text-teal-600 transition-colors font-medium">
                Login
              </button>
              <a
                href="#contact"
                className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-2.5 rounded-xl font-semibold hover:from-teal-700 hover:to-teal-800 transition-all shadow-lg shadow-teal-600/20 hover:shadow-xl hover:shadow-teal-600/30 hover:-translate-y-0.5"
              >
                Get Started
              </a>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 space-y-3 shadow-lg">
            <a href="/dealers" className="block text-slate-600 hover:text-teal-600 py-2 font-medium" onClick={() => setMobileMenuOpen(false)}>
              Dealers
            </a>
            <a href="#how-it-works" className="block text-slate-600 hover:text-teal-600 py-2 font-medium" onClick={() => setMobileMenuOpen(false)}>
              How it Works
            </a>
            <a
              href="#talk-to-ai"
              className="block text-slate-600 hover:text-teal-600 py-2 font-medium"
              onClick={(e) => {
                e.preventDefault();
                setMobileMenuOpen(false);
                document.getElementById("talk-to-ai")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              Demo
            </a>
            <a href="#pricing" className="block text-slate-600 hover:text-teal-600 py-2 font-medium" onClick={() => setMobileMenuOpen(false)}>
              Pricing
            </a>
            <a href="#hubspot" className="block text-slate-600 hover:text-teal-600 py-2 font-medium" onClick={() => setMobileMenuOpen(false)}>
              HubSpot
            </a>
            <a href="#faq" className="block text-slate-600 hover:text-teal-600 py-2 font-medium" onClick={() => setMobileMenuOpen(false)}>
              FAQ
            </a>
            <button type="button" className="block text-slate-600 hover:text-teal-600 py-2 font-medium w-full text-left" onClick={() => { setMobileMenuOpen(false); setLoginModalOpen(true); }}>
              Login
            </button>
            <a
              href="#contact"
              className="block bg-gradient-to-r from-teal-600 to-teal-700 text-white px-5 py-3 rounded-xl font-semibold text-center mt-4"
              onClick={() => setMobileMenuOpen(false)}
            >
              Get Started
            </a>
          </div>
        )}
      </nav>

      {/* Hero Section — original: explains what we do; demo block in hero as main convincer */}
      <section id="demo" className="relative pt-28 md:pt-36 pb-16 md:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden scroll-mt-20 md:scroll-mt-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_80%_at_50%_0%,rgba(20,184,166,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_20%,rgba(34,211,238,0.06),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_20%_80%,rgba(94,234,212,0.05),transparent)]" />
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-teal-400/20 blur-[80px] animate-float pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-cyan-400/15 blur-[100px] animate-float pointer-events-none" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 right-1/3 w-48 h-48 rounded-full bg-emerald-400/10 blur-[60px] animate-float pointer-events-none" style={{ animationDelay: "3s" }} />

        <div className="max-w-6xl mx-auto relative">
          {/* Top part — what the company does (restored) */}
          <div className="text-center max-w-4xl mx-auto">
            <FadeInOnScroll>
              <div className="inline-flex items-center gap-2 bg-teal-50/90 text-teal-700 px-4 py-2 rounded-full text-sm font-semibold mb-6 border border-teal-200/80 shadow-lg shadow-teal-500/5">
                <Zap className="w-4 h-4 text-cyan-600" />
                AI-Powered Phone Research
              </div>
            </FadeInOnScroll>

            <FadeInOnScroll delay={100}>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-slate-900 leading-tight tracking-tight">
                AI That Makes the Calls
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-teal-600 via-cyan-600 to-emerald-500 mt-2 animate-gradient-shift">
                  So You Don&apos;t Have To
                </span>
              </h1>
            </FadeInOnScroll>

            <FadeInOnScroll delay={200}>
              <p className="mt-6 text-lg sm:text-xl lg:text-2xl text-slate-700 leading-relaxed max-w-3xl mx-auto font-medium">
                Our Agentic Workforce understands your context, calls your contact list, and asks your questions with natural human flow.
                <span className="block mt-3 text-slate-600 font-normal">
                  Scale from 10 to 10,000 calls simultaneously. Get recordings, transcripts, and structured tabular data instantly — no manual dialling or hiring required.
                </span>
              </p>
            </FadeInOnScroll>

            <FadeInOnScroll delay={300}>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="#pricing"
                  className="group font-display bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-teal-500 hover:to-cyan-500 transition-all shadow-xl shadow-teal-600/25 hover:shadow-[0_0_40px_rgba(20,184,166,0.4)] hover:-translate-y-1 flex items-center justify-center gap-2 border border-white/20"
                >
                  Start Free Pilot
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
                <a
                  href="#how-it-works"
                  className="group bg-white text-slate-700 px-8 py-4 rounded-xl font-semibold text-lg border-2 border-slate-200 hover:border-teal-200 hover:bg-teal-50 transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5 text-teal-600" />
                  See How It Works
                </a>
              </div>
              
              {/* Integration badges — integrated below CTAs */}
              <FadeInOnScroll delay={350}>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <a
                    href="#hubspot"
                    className="inline-flex items-center gap-2.5 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 border border-slate-200/60 shadow-sm hover:shadow-md hover:border-teal-200 hover:bg-white transition-all duration-300 group"
                  >
                    <img src="https://cdn.simpleicons.org/hubspot/FF7A59" alt="HubSpot" className="h-5 w-5 flex-shrink-0" />
                    <span className="text-xs font-medium text-slate-600 group-hover:text-teal-700">
                      Works with <span className="font-semibold">HubSpot CRM</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
                  </a>
                  <a
                    href="#export-integrations"
                    className="inline-flex items-center gap-2.5 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 border border-slate-200/60 shadow-sm hover:shadow-md hover:border-emerald-200 hover:bg-white transition-all duration-300 group"
                  >
                    <img src="https://cdn.simpleicons.org/googlesheets/34A853" alt="Google Sheets" className="h-5 w-5 flex-shrink-0" />
                    <span className="text-xs font-medium text-slate-600 group-hover:text-emerald-700">
                      Export to <span className="font-semibold">Sheets & GCP</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                  </a>
                </div>
              </FadeInOnScroll>
            </FadeInOnScroll>
          </div>

          {/* Demo part — main convincer: Talk to our AI (moved into hero) */}
          <FadeInOnScroll delay={350}>
            <div id="talk-to-ai" className="mt-14 md:mt-16 max-w-2xl mx-auto scroll-mt-24 md:scroll-mt-28">
              <div className="text-center mb-6">
                <button
                  onClick={() => voiceDemoRef.current?.startDemo()}
                  className="inline-flex items-center gap-2 border-2 border-teal-400/80 text-teal-700 px-4 py-2 rounded-full text-sm font-bold mb-3 bg-teal-50/90 hover:bg-teal-100/90 hover:border-teal-500 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-teal-600 text-teal-600" />
                  Live Demo
                </button>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
                  Talk to our AI
                </h2>
                <p className="text-slate-600 text-sm sm:text-base mt-1 max-w-lg mx-auto">
                  Ask about pricing, use cases, or how it works — <span className="font-semibold text-teal-600">click below to start</span>
                </p>
              </div>
              <VoiceDemo ref={voiceDemoRef} />
              
              {/* Book Demo Now section */}
              <div className="mt-6 p-5 rounded-xl bg-gradient-to-br from-teal-50/50 to-cyan-50/50 border border-teal-100/50 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-3 text-center">Book Demo Now</h3>
                <div className="flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto">
                  <div className="flex-1 relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      placeholder="your@company.com"
                      value={demoEmail || ""}
                      onChange={(e) => setDemoEmail(e.target.value || "")}
                      className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20 outline-none transition-all bg-white text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const baseUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || "https://calendly.com/growth-intellidial/30min";
                      const url = demoEmail.trim()
                        ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}email=${encodeURIComponent(demoEmail.trim())}`
                        : baseUrl;
                      setDemoSubmitted(true);
                      window.open(url, "_blank");
                    }}
                    className="relative inline-flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-600 text-white px-7 py-3 rounded-lg font-bold text-base hover:from-teal-500 hover:via-teal-400 hover:to-cyan-500 transition-all shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg animate-glisten overflow-hidden"
                  >
                    <Calendar className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">{demoSubmitted ? "Opened" : "Book Demo"}</span>
                  </button>
                </div>
              </div>
            </div>
          </FadeInOnScroll>

          {/* Trust indicators + HubSpot */}
          <FadeInOnScroll delay={400}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                No setup fees
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                50 free calls to start
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                Cancel anytime
              </div>
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <img src="https://cdn.simpleicons.org/hubspot/FF7A59" alt="HubSpot" className="h-5 w-5" />
                <span className="font-medium text-slate-600">HubSpot CRM integrated</span>
              </div>
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <img src="https://cdn.simpleicons.org/googlesheets/34A853" alt="Google Sheets" className="h-5 w-5" />
                <span className="font-medium text-slate-600">Google Sheets & GCP export</span>
              </div>
            </div>
          </FadeInOnScroll>
        </div>

      </section>

      {/* Social Proof Bar */}
      <section className="py-10 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
            <div className="flex items-center gap-2 text-slate-600">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                <Phone className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <div className="font-bold text-slate-900">10,000+</div>
                <div className="text-xs text-slate-500">Calls Completed</div>
              </div>
            </div>
            <div className="w-px h-10 bg-slate-200 hidden sm:block"></div>
            <div className="flex items-center gap-2 text-slate-600">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <div className="font-bold text-slate-900">95%+</div>
                <div className="text-xs text-slate-500">Data Accuracy</div>
              </div>
            </div>
            <div className="w-px h-10 bg-slate-200 hidden sm:block"></div>
            <div className="flex items-center gap-2 text-slate-600">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <div className="font-bold text-slate-900">Instant</div>
                <div className="text-xs text-slate-500">Real-time Results</div>
              </div>
            </div>
            <div className="w-px h-10 bg-slate-200 hidden sm:block"></div>
            <div className="flex items-center gap-2 text-slate-600">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <div className="font-bold text-slate-900">100%</div>
                <div className="text-xs text-slate-500">Call Recordings</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <FadeInOnScroll>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 px-4 py-2 rounded-full text-sm font-semibold mb-4 border border-teal-100">
                Simple Process
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">How It Works</h2>
              <p className="mt-4 text-xl text-slate-600">Three simple steps to data at scale</p>
            </div>
          </FadeInOnScroll>

          {/* Process Infographic */}
          <FadeInOnScroll delay={100}>
            <div className="mb-16">
              <img 
                src="/3steps.jpeg" 
                alt="Intellidial 3-Step Process: Connect CRM or Upload List, AI-Powered Calling, Automated Updates & Insights" 
                className="w-full max-w-4xl mx-auto rounded-2xl shadow-lg"
              />
            </div>
          </FadeInOnScroll>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {/* Step 1 */}
            <FadeInOnScroll delay={0}>
              <div className="relative">
                <div className="text-center">
                  <div className="relative inline-block">
                    <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-teal-500/20">
                      <FileSpreadsheet className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-teal-500 text-teal-600 font-bold text-sm">
                      1
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Connect CRM or Upload List</h3>
                  <p className="text-slate-600">
                    Have a list? Upload it. Or connect your CRM (HubSpot, Salesforce, Zoho) to sync contacts automatically. 
                    Don&apos;t have one? <span className="text-teal-600 font-medium">We&apos;ll build it for you</span> using Google Places API.
                    Just tell us what businesses to find.
                  </p>
                </div>
                {/* Connector line - desktop only */}
                <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-teal-300 to-transparent"></div>
              </div>
            </FadeInOnScroll>

            {/* Step 2 */}
            <FadeInOnScroll delay={150}>
              <div className="relative">
                <div className="text-center">
                  <div className="relative inline-block">
                    <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-teal-500/20">
                      <Phone className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-teal-500 text-teal-600 font-bold text-sm">
                      2
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">We Call Using AI</h3>
                  <p className="text-slate-600">
                    Our AI makes natural phone calls, handles IVR systems, and asks your questions
                    professionally. Every call is recorded.
                  </p>
                </div>
                {/* Connector line - desktop only */}
                <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-teal-300 to-transparent"></div>
              </div>
            </FadeInOnScroll>

            {/* Step 3 */}
            <FadeInOnScroll delay={300}>
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-teal-500/20">
                    <BarChart3 className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-teal-500 text-teal-600 font-bold text-sm">
                    3
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Automated Updates & Insights</h3>
                <p className="text-slate-600">
                  Automatic CRM updates (Lead Status, meetings) or download an organized file. Receive extracted answers, full transcripts, and audio recordings. Export to Excel, sync to Google Sheets, 
                  or drop files directly to your cloud provider (AWS S3, Azure Blob, GCP Storage).
                </p>
              </div>
            </FadeInOnScroll>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto">
          <FadeInOnScroll>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 px-4 py-2 rounded-full text-sm font-semibold mb-4 border border-teal-100">
                Use Cases
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">
                Built for Data-Driven Teams
              </h2>
              <p className="mt-4 text-xl text-slate-600">
                From healthcare to debt collection, we help teams gather data faster
              </p>
            </div>
          </FadeInOnScroll>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {[
              {
                icon: Building2,
                title: "Healthcare & Medical Aids",
                desc: "Verify provider networks, check doctor availability, confirm services offered, and update medical directories at scale.",
                items: ["Provider network verification", "Appointment availability checks", "Service & pricing confirmation"],
              },
              {
                icon: Users,
                title: "Recruitment & HR",
                desc: "Screen candidates at scale, verify availability, conduct initial qualification calls, and schedule interviews automatically.",
                items: ["Candidate pre-screening", "Availability confirmation", "Reference checks"],
              },
              {
                icon: Home,
                title: "Property & Real Estate",
                desc: "Verify rental listings, check property availability, confirm pricing, and update property databases efficiently.",
                items: ["Listing verification", "Availability & pricing", "Agent contact updates"],
              },
              {
                icon: TrendingUp,
                title: "Market Research",
                desc: "Conduct price surveys, gather competitive intelligence, verify business information, and build comprehensive market data.",
                items: ["Price surveys", "Competitor analysis", "Business data verification"],
              },
              {
                icon: Wallet,
                title: "Debt Collection & Arrears",
                desc: "Confirm balances, agree payment plans, capture commitment dates and callback preferences — compliant and at scale.",
                items: ["Balance confirmation", "Payment plan setup", "Callback scheduling"],
              },
              {
                icon: CalendarCheck,
                title: "Appointment Reminders & Confirmations",
                desc: "Reduce no-shows by confirming appointments, rescheduling, and capturing attendance intent across clinics, salons, and services.",
                items: ["Appointment confirmation", "Reschedule offers", "No-show reduction"],
              },
              {
                icon: Car,
                title: "Car Dealership Speed-to-Lead",
                desc: "Instantly call back every online enquiry within 60 seconds — qualify the buyer, confirm interest, and book a test drive before your competitors even pick up the phone.",
                items: ["60-second lead callback", "Buyer qualification", "Test drive booking"],
              },
              {
                icon: Megaphone,
                title: "Sales & Lead Follow-Up",
                desc: "Respond to inbound leads from web forms, ads, and marketplaces in seconds. Qualify prospects, capture intent, and route warm leads to your sales team instantly.",
                items: ["Instant lead response", "Prospect qualification", "Warm handoff to sales"],
              },
            ].map((useCase, i) => (
              <FadeInOnScroll key={i} delay={i * 100}>
                <div className="group bg-white rounded-2xl p-8 border border-slate-200 hover:border-teal-400/50 hover:shadow-xl hover:shadow-teal-500/20 transition-all duration-300">
                  <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-teal-500/20 group-hover:scale-110 transition-transform">
                    <useCase.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{useCase.title}</h3>
                  <p className="text-slate-600 mb-4">{useCase.desc}</p>
                  <ul className="space-y-2">
                    {useCase.items.map((item, j) => (
                      <li key={j} className="flex items-center gap-3 text-slate-600">
                        <Check className="w-5 h-5 text-teal-600 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <FadeInOnScroll>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 px-4 py-2 rounded-full text-sm font-semibold mb-4 border border-teal-100">
                Features
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">
                Why Choose Intelli<span className="text-teal-600">dial</span>
              </h2>
              <p className="mt-4 text-xl text-slate-600">
                Built for accuracy, speed, and compliance
              </p>
            </div>
          </FadeInOnScroll>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Clock, title: "Massive Time Savings", desc: "Automate hundreds of calls per day. What takes your team weeks, we do in hours." },
              { icon: Server, title: "Parallel Calling at Scale", desc: "Make multiple calls simultaneously. Scale from 10 to 10,000 calls without hiring extra staff." },
              { icon: Settings, title: "Full Control & Customization", desc: "Control exactly when calls are made, customize agent behavior, and define conversation flows." },
              { icon: FileAudio, title: "Complete Recordings & Transcripts", desc: "Every call recorded and fully transcribed for QA, compliance, and verification." },
              { icon: FileSpreadsheet, title: "Structured Data Output", desc: "Get answers in clean, tabular format. Ready-to-use Excel files with exact data fields you need." },
              { icon: Scale, title: "Scale Without Hiring", desc: "Handle 10 calls or 10,000 calls with the same setup. No need to hire or train additional staff." },
              { icon: Zap, title: "Natural AI Conversations", desc: "Our AI handles follow-ups, IVR systems, and complex dialogues naturally." },
              { icon: Globe, title: "List Generation", desc: "No contact list? We build it using Google Places API. Just tell us what to find." },
              { icon: Lock, title: "Local SA Numbers", desc: "Higher answer rates with local South African caller ID." },
              { icon: Star, title: "Quality Guaranteed", desc: "95%+ accuracy or we'll rerun the calls at no extra cost." },
              { icon: Headphones, title: "Dedicated Support", desc: "Real humans available to help you succeed with your projects." },
            ].map((feature, i) => (
              <FadeInOnScroll key={i} delay={i * 50}>
                <div className="text-center group">
                  <div className="w-14 h-14 bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:from-teal-500 group-hover:to-teal-700 transition-all duration-300">
                    <feature.icon className="w-7 h-7 text-teal-600 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-slate-600 text-sm">{feature.desc}</p>
                </div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* HubSpot CRM Integration — Live */}
      <section id="hubspot" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto">
          <FadeInOnScroll>
            <div className="text-center mb-14">
              <div className="inline-flex items-center justify-center gap-2 mb-4">
                <img src="https://cdn.simpleicons.org/hubspot/FF7A59" alt="HubSpot" className="h-10 w-10" />
                <span className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold border border-emerald-200">
                  <Check className="w-4 h-4" />
                  Available now
                </span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">
                HubSpot CRM integration
              </h2>
              <p className="mt-4 text-xl text-slate-600 max-w-2xl mx-auto">
                Connect once. Import by Lead Status or HubSpot list, sync call results to the contact record, and we respect &quot;do not call&quot; in HubSpot—one source of truth.
              </p>
            </div>
          </FadeInOnScroll>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[
              { icon: Users, title: "Import contacts", desc: "Pull contacts by Lead Status or by HubSpot list—same segments you use every day. No rebuilding lists." },
              { icon: BarChart3, title: "Update Lead Status", desc: "Success, no-answer, and meeting booked automatically update Lead Status in HubSpot (configurable in Sync Settings)." },
              { icon: FileText, title: "Notes & transcripts", desc: "\"Intellidial Call\" notes with transcript appear on the contact timeline so your team has full context." },
              { icon: FileAudio, title: "Recording links", desc: "Recording URL is stored on the contact so you can listen to any call from the HubSpot record." },
              { icon: CalendarCheck, title: "Meetings & deals", desc: "When a meeting is booked on a call, we create the meeting in HubSpot and optionally create a deal in your pipeline." },
              { icon: Zap, title: "One-click connect", desc: "Secure OAuth—connect your HubSpot account in seconds. No API keys or credentials to manage." },
            ].map((benefit, i) => (
              <FadeInOnScroll key={i} delay={i * 80}>
                <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-teal-200 hover:shadow-lg transition-all">
                  <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mb-4">
                    <benefit.icon className="w-6 h-6 text-teal-600" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">{benefit.title}</h3>
                  <p className="text-slate-600 text-sm">{benefit.desc}</p>
                </div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Export Integrations — Google Sheets & GCP */}
      <section id="export-integrations" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-6xl mx-auto">
          <FadeInOnScroll>
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold mb-4 border border-emerald-200">
                <Check className="w-4 h-4" />
                Available now
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">
                Export Integrations
              </h2>
              <p className="mt-4 text-xl text-slate-600 max-w-2xl mx-auto">
                Export your call results directly to Google Sheets or GCP Cloud Storage. No manual downloads needed.
              </p>
            </div>
          </FadeInOnScroll>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Google Sheets */}
            <FadeInOnScroll delay={100}>
              <div className="bg-white rounded-2xl p-8 border border-slate-200 hover:border-teal-200 hover:shadow-lg transition-all">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl flex items-center justify-center">
                    <img
                      src="https://cdn.simpleicons.org/googlesheets/34A853"
                      alt="Google Sheets"
                      className="h-10 w-10"
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Google Sheets</h3>
                    <p className="text-sm text-slate-600">Automatic export to spreadsheets</p>
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-3 text-slate-600">
                    <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Export project results directly to Google Sheets</span>
                  </li>
                  <li className="flex items-start gap-3 text-slate-600">
                    <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Share sheet with service account for automatic updates</span>
                  </li>
                  <li className="flex items-start gap-3 text-slate-600">
                    <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Export all contacts or filter failed calls only</span>
                  </li>
                </ul>
                <a
                  href="/login"
                  className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold text-sm"
                >
                  Set up in dashboard
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </FadeInOnScroll>

            {/* GCP Cloud Storage */}
            <FadeInOnScroll delay={200}>
              <div className="bg-white rounded-2xl p-8 border border-slate-200 hover:border-teal-200 hover:shadow-lg transition-all">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center">
                    <img
                      src="https://cdn.simpleicons.org/googlecloud/4285F4"
                      alt="Google Cloud Platform"
                      className="h-10 w-10"
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">GCP Cloud Storage</h3>
                    <p className="text-sm text-slate-600">Direct export to your bucket</p>
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-3 text-slate-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Export CSV files directly to your GCP bucket</span>
                  </li>
                  <li className="flex items-start gap-3 text-slate-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Secure service account authentication</span>
                  </li>
                  <li className="flex items-start gap-3 text-slate-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Automatic file naming with timestamps</span>
                  </li>
                </ul>
                <a
                  href="/login"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm"
                >
                  Configure in dashboard
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </FadeInOnScroll>
          </div>
        </div>
      </section>

      {/* More integrations coming soon */}
      <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-4xl mx-auto">
          <FadeInOnScroll>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-sm font-semibold mb-4 border border-amber-200">
                Coming Soon
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                More integrations
              </h2>
              <p className="text-slate-600">
                Salesforce, Zoho, Azure, AWS, and more — we&apos;re adding them next
              </p>
            </div>
          </FadeInOnScroll>

          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 lg:gap-10">
            {[
              { name: "Salesforce", logo: "https://mitto.ch/wp-content/uploads/2024/01/salesforce@2x-8-1.png", fallback: "SF", delay: 100 },
              { name: "Zoho", logo: "https://www.zohowebstatic.com/sites/zweb/images/commonroot/zoho-logo-web.svg", delay: 150 },
              { name: "Azure", logo: "https://azure.microsoft.com/svghandler/azure-logo/Azure-Logo.svg", delay: 200 },
              { name: "AWS", logo: "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg", delay: 300 },
              { name: "Airtable", logo: "https://cdn.simpleicons.org/airtable/18BFFF", delay: 400 },
              { name: "Zapier", logo: "https://cdn.simpleicons.org/zapier/FF4A00", delay: 500 },
            ].map((integration) => (
              <FadeInOnScroll key={integration.name} delay={integration.delay}>
                <div className="flex flex-col items-center group">
                  <div className="relative">
                    <div className={`w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-xl shadow-md border border-slate-200 flex items-center justify-center ${integration.name === "Salesforce" ? "p-0" : "p-3 sm:p-4"} group-hover:shadow-lg transition-shadow overflow-hidden`}>
                      {integration.fallback ? (
                        <img
                          src={integration.logo}
                          alt={integration.name}
                          className={integration.name === "Salesforce" ? "w-[180%] h-[180%] object-contain" : "w-full h-full object-contain"}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const parent = e.currentTarget.parentElement;
                            if (parent && !parent.querySelector(".fallback-text")) {
                              const fallback = document.createElement("div");
                              fallback.className = "fallback-text text-slate-700 font-bold text-sm sm:text-lg flex items-center justify-center w-full h-full";
                              fallback.textContent = integration.fallback;
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      ) : (
                        <img
                          src={integration.logo}
                          alt={integration.name}
                          className="w-full h-full object-contain"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const parent = e.currentTarget.parentElement;
                            if (parent && !parent.querySelector(".fallback-text")) {
                              const fallback = document.createElement("div");
                              fallback.className = "fallback-text text-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center w-full h-full text-center px-1";
                              fallback.textContent = integration.name.split(" ")[0];
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      )}
                    </div>
                    <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">Soon</div>
                  </div>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 font-medium text-center max-w-[80px] sm:max-w-none">{integration.name}</p>
                </div>
              </FadeInOnScroll>
            ))}
          </div>

          <FadeInOnScroll delay={600}>
            <WaitlistForm />
          </FadeInOnScroll>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto">
          <FadeInOnScroll>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-teal-100">
                Pricing
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
                Simple, Transparent Pricing
              </h2>
              <p className="mt-4 text-xl text-slate-600">
                Start small, scale as you grow
              </p>
              <p className="mt-2 text-sm font-semibold text-teal-600">
                Start with a free trial — no card required
              </p>
            </div>
          </FadeInOnScroll>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-6 max-w-6xl mx-auto">
            {[
              {
                name: "Starter",
                price: "R999",
                priceCustom: false,
                popular: false,
                trial: true,
                features: ["50 calls per month", "1 project", "Call recordings & transcripts", "Excel export"],
                cta: "Start free trial",
                ctaStyle: "secondary",
                ctaHref: process.env.NEXT_PUBLIC_CALENDLY_URL || "https://calendly.com/growth-intellidial/30min",
              },
              {
                name: "Growth",
                price: "R2,999",
                priceCustom: false,
                popular: true,
                trial: true,
                features: ["150 calls per month", "3 projects", "HubSpot import & sync", "Call recordings & transcripts in CRM", "Excel export"],
                cta: "Start free trial",
                ctaStyle: "primary",
                ctaHref: process.env.NEXT_PUBLIC_CALENDLY_URL || "https://calendly.com/growth-intellidial/30min",
              },
              {
                name: "Pro",
                price: "R8,999",
                priceCustom: false,
                popular: false,
                trial: true,
                features: ["500 calls per month", "Unlimited projects", "HubSpot import, sync & two-way", "Notes, recordings & transcripts in HubSpot", "Excel + API export", "Custom AI voice"],
                cta: "Start free trial",
                ctaStyle: "secondary",
                ctaHref: process.env.NEXT_PUBLIC_CALENDLY_URL || "https://calendly.com/growth-intellidial/30min",
              },
              {
                name: "Enterprise",
                price: "Contact for pricing",
                priceCustom: true,
                popular: false,
                trial: false,
                features: ["Custom call volume", "Unlimited projects", "SLA & custom integrations", "White-label & compliance options"],
                cta: "Contact us",
                ctaStyle: "secondary",
                ctaHref: process.env.NEXT_PUBLIC_CALENDLY_URL || "https://calendly.com/growth-intellidial/30min",
              },
            ].map((plan, i) => (
              <FadeInOnScroll key={i} delay={i * 100}>
                <div className={`relative flex flex-col bg-white rounded-2xl p-8 border-2 transition-all duration-300 hover:shadow-xl h-full min-h-[420px] ${
                  plan.popular ? "border-teal-500 shadow-xl shadow-teal-500/10" : "border-slate-200 hover:border-teal-200"
                }`}>
                  {/* Tag area — fixed height so all cards align (Enterprise has no tag) */}
                  <div className="h-9 mb-1 flex items-center justify-center">
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-teal-500 to-teal-700 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
                        Most Popular
                      </div>
                    )}
                    {plan.trial && !plan.popular && (
                      <div className="bg-slate-100 text-slate-700 px-4 py-1 rounded-full text-sm font-medium border border-slate-200">
                        Free trial
                      </div>
                    )}
                    {plan.trial && plan.popular && (
                      <span className="text-xs font-medium text-slate-500">Free trial included</span>
                    )}
                  </div>
                  <div className="text-lg font-semibold text-slate-900 mb-2">{plan.name}</div>
                  <div className="flex items-baseline gap-1 mb-6 min-h-[2.5rem]">
                    {plan.priceCustom ? (
                      <span className="text-xl font-bold text-slate-900">{plan.price}</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                        <span className="text-slate-500">/month</span>
                      </>
                    )}
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-3 text-slate-600">
                        <Check className="w-5 h-5 text-teal-600 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={plan.ctaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block text-center px-6 py-3 rounded-xl font-semibold transition-all mt-auto ${
                      plan.ctaStyle === "primary"
                        ? "bg-gradient-to-r from-teal-600 to-teal-700 text-white hover:from-teal-700 hover:to-teal-800 shadow-lg shadow-teal-500/20"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {plan.cta}
                  </a>
                </div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <FadeInOnScroll>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-teal-100">
                Testimonials
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">What Our Clients Say</h2>
            </div>
          </FadeInOnScroll>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                quote: "Saved us 40 hours of manual calling in one week. The data quality was better than our internal team could achieve.",
                author: "Operations Manager",
                company: "Healthcare Company, Cape Town",
                rating: 5,
              },
              {
                quote: "We verified 500 property listings in 3 days. Would have taken our team weeks. The recordings gave us complete peace of mind.",
                author: "Data Lead",
                company: "Property Portal, Johannesburg",
                rating: 5,
              },
            ].map((testimonial, i) => (
              <FadeInOnScroll key={i} delay={i * 100}>
                <div className="bg-gradient-to-br from-teal-50 to-slate-50 rounded-2xl p-8 border border-teal-100">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, j) => (
                      <Star key={j} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <blockquote className="text-lg text-slate-700 leading-relaxed mb-6">
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="text-slate-600">
                    <div className="font-semibold text-slate-900">{testimonial.author}</div>
                    <div className="text-sm">{testimonial.company}</div>
                  </div>
                </div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <FadeInOnScroll>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-teal-100">
                FAQ
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
                Frequently Asked Questions
              </h2>
            </div>
          </FadeInOnScroll>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <FadeInOnScroll key={index} delay={index * 50}>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-teal-200 transition-colors">
                  <button
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  >
                    <span className="font-semibold text-slate-900">{faq.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${
                        openFaq === index ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${openFaq === index ? "max-h-96" : "max-h-0"}`}>
                    <div className="px-6 pb-5 text-slate-600">{faq.answer}</div>
                  </div>
                </div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section — futuristic glow */}
      <section id="contact" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <FadeInOnScroll>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-teal-400/25 via-cyan-400/20 to-teal-400/25 rounded-3xl blur-3xl pointer-events-none" />
              <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 md:p-12 text-center overflow-hidden border border-teal-500/20 shadow-2xl shadow-teal-500/10">
                {/* Pattern overlay — pointer-events-none so the mailto link is clickable */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}></div>
                
                <div className="relative z-10">
                  <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4 text-glow">
                    Ready to Scale Your Outreach?
                  </h2>
                  <p className="text-xl text-slate-300 mb-8">
                    Start with a free pilot—50 calls on us. See the results before you commit.
                  </p>

                  <div className="max-w-md mx-auto mb-8">
                    {contactSuccess ? (
                      <div className="rounded-xl bg-teal-500/20 border border-teal-400/40 text-white py-4 px-6 text-center">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-teal-300" />
                        <p className="font-semibold">Message sent!</p>
                        <p className="text-sm text-slate-300 mt-1">We&apos;ll get back to you at {contactEmail} within 2 hours.</p>
                      </div>
                    ) : (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          setContactError(null);
                          setContactSubmitting(true);
                          try {
                            const res = await fetch("/api/contact", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                email: contactEmail,
                                message: contactMessage || "I'm interested in the free pilot.",
                              }),
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error || "Failed to send");
                            setContactSuccess(true);
                          } catch (err) {
                            setContactError(err instanceof Error ? err.message : "Something went wrong.");
                          } finally {
                            setContactSubmitting(false);
                          }
                        }}
                        className="space-y-4"
                      >
                        <input
                          type="email"
                          required
                          placeholder="Your email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                          disabled={contactSubmitting}
                        />
                        <textarea
                          placeholder="Your message (optional)"
                          value={contactMessage}
                          onChange={(e) => setContactMessage(e.target.value)}
                          rows={2}
                          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent resize-none"
                          disabled={contactSubmitting}
                        />
                        {contactError && (
                          <p className="text-sm text-red-300">{contactError}</p>
                        )}
                        <button
                          type="submit"
                          disabled={contactSubmitting}
                          className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-teal-600 hover:to-teal-700 transition-all shadow-xl hover:shadow-2xl disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          <Mail className="w-5 h-5" />
                          {contactSubmitting ? "Sending…" : "Send message"}
                        </button>
                        <p className="text-center text-sm text-slate-400">
                          Replies from hello@intellidial.co.za
                        </p>
                      </form>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Response within 2 hours
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      No commitment required
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Free pilot included
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeInOnScroll>
        </div>
      </section>

      {/* Trust & compliance — horizontal banner, single line */}
      <section className="py-4 px-4 sm:px-6 bg-slate-50/80 border-y border-slate-200/80" aria-label="Trust and compliance">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
            Trust & compliance
          </p>
          <div className="flex flex-nowrap items-center justify-center gap-x-4 sm:gap-x-6 overflow-x-auto text-sm">
            <span className="flex items-center gap-2 shrink-0 text-slate-700 font-medium">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/10">
                <FileText className="h-4 w-4 text-teal-600" />
              </span>
              NDA
            </span>
            <span className="flex items-center gap-2 shrink-0 text-slate-700 font-medium">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/10">
                <ShieldCheck className="h-4 w-4 text-teal-600" />
              </span>
              GDPR compliant
            </span>
            <span className="flex items-center gap-2 shrink-0 text-slate-700 font-medium">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/10">
                <Shield className="h-4 w-4 text-teal-600" />
              </span>
              POPIA compliant
            </span>
            <span className="flex items-center gap-2 shrink-0 text-slate-700 font-medium">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/10">
                <Server className="h-4 w-4 text-teal-600" />
              </span>
              Data secured on Google Cloud
            </span>
            <span className="flex items-center gap-2 shrink-0 text-slate-700 font-medium">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/10">
                <Lock className="h-4 w-4 text-teal-600" />
              </span>
              Encryption
            </span>
            <span className="flex items-center gap-2 shrink-0 text-slate-700 font-medium">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/10">
                <CheckCircle2 className="h-4 w-4 text-teal-600" />
              </span>
              Responsible AI practices
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            {/* Logo & Description */}
            <div className="max-w-md">
              <div className="flex items-center gap-2 mb-4">
                <a 
                  href="/" 
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.reload();
                  }}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <img src="/intellidial-logo.png" alt="Intellidial" className="h-9 w-auto" />
                </a>
                <span className="text-xl font-bold text-white">
                  Intelli<span className="text-teal-400">dial</span>
                </span>
              </div>
              <p className="text-slate-400 mb-4 max-w-sm text-sm">
                AI-powered phone research at scale. We call hundreds of businesses,
                ask your questions, and deliver structured data.
              </p>
              <p className="text-xs">Made with ❤️ in Cape Town, South Africa 🇿🇦</p>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm">
              © 2026 Intelli<span className="text-teal-400">dial</span>. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="hover:text-teal-400 transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-teal-400 transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Login modal — pops over hero with blurred background */}
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </div>
  );
}
