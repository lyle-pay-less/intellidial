"use client";

import { useState, useEffect, useRef } from "react";
import { VoiceDemo } from "./components/VoiceDemo";
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
  MessageCircle,
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
          setTimeout(() => setIsVisible(true), delay);
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

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);

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
            </a>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#how-it-works" className="text-slate-600 hover:text-teal-600 transition-colors font-medium">
                How it Works
              </a>
              <a href="#demo" className="text-slate-600 hover:text-teal-600 transition-colors font-medium">
                Demo
              </a>
              <a href="#pricing" className="text-slate-600 hover:text-teal-600 transition-colors font-medium">
                Pricing
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
            <a href="#how-it-works" className="block text-slate-600 hover:text-teal-600 py-2 font-medium" onClick={() => setMobileMenuOpen(false)}>
              How it Works
            </a>
            <a href="#demo" className="block text-slate-600 hover:text-teal-600 py-2 font-medium" onClick={() => setMobileMenuOpen(false)}>
              Demo
            </a>
            <a href="#pricing" className="block text-slate-600 hover:text-teal-600 py-2 font-medium" onClick={() => setMobileMenuOpen(false)}>
              Pricing
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
      <section id="demo" className="relative pt-28 md:pt-36 pb-16 md:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
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
              <p className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
                We call your list, ask your questions, and return Excel + recordings in 2–5 days.
                No manual dialling — just structured data.
              </p>
            </FadeInOnScroll>

            <FadeInOnScroll delay={300}>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="#contact"
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
            </FadeInOnScroll>
          </div>

          {/* Demo part — main convincer: Talk to our AI (moved into hero) */}
          <FadeInOnScroll delay={350}>
            <div className="mt-14 md:mt-16 max-w-2xl mx-auto">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 border-2 border-teal-400/80 text-teal-700 px-4 py-2 rounded-full text-sm font-bold mb-3 bg-teal-50/90">
                  <Play className="w-4 h-4 fill-teal-600 text-teal-600" />
                  Live Demo
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
                  Talk to our AI
                </h2>
                <p className="text-slate-600 text-sm sm:text-base mt-1 max-w-lg mx-auto">
                  Ask about pricing, use cases, or how it works — then book a call or enter your email below
                </p>
              </div>
              <VoiceDemo />
            </div>
          </FadeInOnScroll>

          {/* Trust indicators */}
          <FadeInOnScroll delay={400}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
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
                <div className="font-bold text-slate-900">2-5 Days</div>
                <div className="text-xs text-slate-500">Avg. Turnaround</div>
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
                src="/steps.jpeg" 
                alt="Intellidial 3-Step Process: Upload & Import, AI-Powered Calling, Download Results" 
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
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Upload or We Generate</h3>
                  <p className="text-slate-600">
                    Have a list? Upload it. Don't have one? <span className="text-teal-600 font-medium">We'll build it for you</span> using Google Places API.
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
                <h3 className="text-xl font-bold text-slate-900 mb-3">Get Structured Data</h3>
                <p className="text-slate-600">
                  Receive an Excel file with extracted answers, full transcripts, and audio recordings.
                  Ready for analysis.
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
              { icon: Zap, title: "Natural AI Conversations", desc: "Our AI handles follow-ups, IVR systems, and complex dialogues naturally." },
              { icon: FileSpreadsheet, title: "Structured Data Output", desc: "Not just transcripts—actual usable data in Excel with the fields you need." },
              { icon: Globe, title: "List Generation", desc: "No contact list? We build it using Google Places API. Just tell us what to find." },
              { icon: Shield, title: "Full Recordings", desc: "Every call recorded for QA, compliance, and verification purposes." },
              { icon: Lock, title: "Local SA Numbers", desc: "Higher answer rates with local South African caller ID." },
              { icon: Headphones, title: "Dedicated Support", desc: "Real humans available to help you succeed with your projects." },
              { icon: Clock, title: "Fast Turnaround", desc: "Most projects completed within 2-5 business days." },
              { icon: Star, title: "Quality Guaranteed", desc: "95%+ accuracy or we'll rerun the calls at no extra cost." },
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

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            {[
              {
                name: "Starter",
                price: "R999",
                popular: false,
                trial: true,
                features: ["100 calls per month", "1 project", "Excel export", "Call recordings", "Email support"],
                cta: "Start free trial",
                ctaStyle: "secondary",
              },
              {
                name: "Growth",
                price: "R2,999",
                popular: true,
                trial: true,
                features: ["300 calls per month", "3 projects", "List generation included", "Excel export", "Call recordings", "Priority support"],
                cta: "Start free trial",
                ctaStyle: "primary",
              },
              {
                name: "Pro",
                price: "R8,999",
                popular: false,
                trial: true,
                features: ["1,000 calls per month", "Unlimited projects", "List generation included", "Excel + API export", "Dedicated manager", "Custom AI voice"],
                cta: "Contact Us",
                ctaStyle: "secondary",
              },
            ].map((plan, i) => (
              <FadeInOnScroll key={i} delay={i * 100}>
                <div className={`relative bg-white rounded-2xl p-8 border-2 transition-all duration-300 hover:shadow-xl ${
                  plan.popular ? "border-teal-500 shadow-xl shadow-teal-500/10" : "border-slate-200 hover:border-teal-200"
                }`}>
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-teal-500 to-teal-700 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
                      Most Popular
                    </div>
                  )}
                  {plan.trial && !plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-100 text-slate-700 px-4 py-1 rounded-full text-sm font-medium border border-slate-200">
                      Free trial
                    </div>
                  )}
                  {plan.trial && plan.popular && (
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 text-xs font-medium text-slate-500">
                      Free trial included
                    </div>
                  )}
                  <div className="text-lg font-semibold text-slate-900 mb-2">{plan.name}</div>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                    <span className="text-slate-500">/month</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-3 text-slate-600">
                        <Check className="w-5 h-5 text-teal-600 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#contact"
                    className={`block text-center px-6 py-3 rounded-xl font-semibold transition-all ${
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

          <FadeInOnScroll delay={300}>
            <div className="text-center mt-10">
              <p className="text-slate-600">
                Need more volume?{" "}
                <a href="#contact" className="text-teal-600 font-semibold hover:underline">
                  Enterprise — contact for price →
                </a>
              </p>
            </div>
          </FadeInOnScroll>
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
              <div className="absolute inset-0 bg-gradient-to-r from-teal-400/25 via-cyan-400/20 to-teal-400/25 rounded-3xl blur-3xl" />
              <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 md:p-12 text-center overflow-hidden border border-teal-500/20 shadow-2xl shadow-teal-500/10">
                {/* Pattern overlay */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}></div>
                
                <div className="relative">
                  <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4 text-glow">
                    Ready to Scale Your Outreach?
                  </h2>
                  <p className="text-xl text-slate-300 mb-8">
                    Start with a free pilot—50 calls on us. See the results before you commit.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                    <a
                      href="https://wa.me/27XXXXXXXXX?text=Hi%2C%20I'm%20interested%20in%20Intellidial"
            target="_blank"
            rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-teal-600 hover:to-teal-700 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
                    >
                      <MessageCircle className="w-5 h-5" />
                      Chat on WhatsApp
          </a>
          <a
                      href="mailto:hello@intellidial.co.za"
                      className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/20 transition-all border border-white/20"
                    >
                      <Mail className="w-5 h-5" />
                      hello@intellidial.co.za
                    </a>
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

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Logo & Description */}
            <div className="sm:col-span-2 md:col-span-2">
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
              <p className="text-slate-400 mb-4 max-w-sm">
                AI-powered phone research at scale. We call hundreds of businesses,
                ask your questions, and deliver structured data.
              </p>
              <p className="text-sm">Made with ❤️ in Cape Town, South Africa 🇿🇦</p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-3">
                <li>
                  <a href="#how-it-works" className="hover:text-teal-400 transition-colors">
                    How it Works
                  </a>
                </li>
                <li>
                  <a href="#use-cases" className="hover:text-teal-400 transition-colors">
                    Use Cases
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-teal-400 transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-teal-400 transition-colors">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href="mailto:hello@intellidial.co.za"
                    className="hover:text-teal-400 transition-colors"
                  >
                    hello@intellidial.co.za
                  </a>
                </li>
                <li>
                  <a
                    href="https://wa.me/27XXXXXXXXX"
                    className="hover:text-teal-400 transition-colors"
                  >
                    WhatsApp
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-teal-400 transition-colors">
                    LinkedIn
                  </a>
                </li>
              </ul>
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
