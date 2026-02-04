"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Mic, Loader2, PhoneOff, Mail, Calendar, MessageCircle } from "lucide-react";
import Vapi from "@vapi-ai/web";

const WAVE_BAR_COUNT = 48;
const BASE_HEIGHTS = Array.from({ length: WAVE_BAR_COUNT }, (_, i) =>
  30 + 45 * Math.sin((i / WAVE_BAR_COUNT) * Math.PI * 2) * Math.sin(i * 0.3)
);

const CONNECTING_MESSAGES = [
  "Connecting…",
  "Finding an agent for you",
  "Routing to your agent",
  "Preparing your call",
  "Saving time by automating manual calls",
  "Turning conversations into actionable insights",
  "Every call recorded and transcribed",
  "95%+ accuracy, South African numbers",
  "Almost there…",
];

/**
 * Voice demo: one button starts the call. Volume-reactive wave, live transcript, email + Book CTA.
 * Creds from doctor .env via /api/demo-assistant.
 */
export function VoiceDemo() {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callActive, setCallActive] = useState(false);
  const [transcript, setTranscript] = useState<{ role: string; text: string }[]>([]);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [email, setEmail] = useState("");
  const [bookSubmitted, setBookSubmitted] = useState(false);
  const [connectingMessageIndex, setConnectingMessageIndex] = useState(0);
  const vapiRef = useRef<Vapi | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  // Only auto-scroll to bottom when user is already near bottom — don’t pull them back if they scrolled up
  useEffect(() => {
    const container = transcriptContainerRef.current;
    if (!container) return;
    const { scrollTop, clientHeight, scrollHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distanceFromBottom < 100;
    if (nearBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }, [transcript]);

  const startDemo = useCallback(async () => {
    setConnecting(true);
    setConnectingMessageIndex(0);
    setError(null);
    setTranscript([]);
    setVolumeLevel(0);

    try {
      const res = await fetch("/api/demo-assistant");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Demo not configured");
      }
      const { assistantId, publicKey } = await res.json();
      if (!publicKey || !assistantId) {
        throw new Error("Missing VAPI_PUBLIC_KEY or VAPI_DEMO_ASSISTANT_ID in doctor .env");
      }

      const vapi = new Vapi(publicKey);
      let connectionTimeoutId: number | null = null;

      const clearConnectionTimeout = () => {
        if (connectionTimeoutId != null) {
          window.clearTimeout(connectionTimeoutId);
          connectionTimeoutId = null;
        }
      };

      vapi.on("call-start", () => {
        clearConnectionTimeout();
        setConnecting(false);
        setCallActive(true);
      });
      vapi.on("call-end", () => {
        setCallActive(false);
        setVolumeLevel(0);
      });
      vapi.on("volume-level", (level: unknown) => {
        const n = typeof level === "number" ? level : typeof level === "object" && level && "volume" in level ? Number((level as { volume: unknown }).volume) : 0;
        const normalized = n > 1 ? n / 100 : n;
        setVolumeLevel(Math.min(1, Math.max(0, normalized)));
      });
      vapi.on("message", (message: { type?: string; role?: string; transcript?: string }) => {
        if (message.type === "transcript" && message.role && message.transcript) {
          const role = message.role;
          const transcript = message.transcript;
          setTranscript((prev) => [...prev, { role, text: transcript }]);
        }
      });
      vapi.on("error", (e: unknown) => {
        clearConnectionTimeout();
        const msg =
          e instanceof Error
            ? e.message
            : typeof e === "object" && e && "message" in e
              ? String((e as { message: unknown }).message)
              : "Voice error";
        setError(msg);
        setConnecting(false);
        setCallActive(false);
      });

      vapiRef.current = vapi;
      vapi.start(assistantId);

      connectionTimeoutId = window.setTimeout(() => {
        setConnecting((prev) => {
          if (!prev) return prev;
          setError("Connection timed out. Allow microphone access and try again.");
          return false;
        });
      }, 20000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start");
      setConnecting(false);
    }
  }, []);

  const endCall = useCallback(() => {
    if (vapiRef.current) {
      vapiRef.current.stop();
      vapiRef.current = null;
    }
    setCallActive(false);
    setVolumeLevel(0);
  }, []);

  const handleBookCall = useCallback(() => {
    if (!email.trim()) return;
    setBookSubmitted(true);
    window.open(`mailto:hello@intellidial.co.za?subject=Book a call - ${encodeURIComponent(email)}&body=Email: ${encodeURIComponent(email)}`, "_blank");
  }, [email]);

  useEffect(() => {
    return () => {
      if (vapiRef.current) vapiRef.current.stop();
    };
  }, []);

  // Rotate connecting messages every 2.5s while connecting
  useEffect(() => {
    if (!connecting) return;
    const id = window.setInterval(() => {
      setConnectingMessageIndex((prev) => (prev + 1) % CONNECTING_MESSAGES.length);
    }, 2500);
    return () => window.clearInterval(id);
  }, [connecting]);

  const vol = callActive ? volumeLevel : 0;
  const waveScale = 0.7 + vol * 0.6;

  return (
    <div className="relative p-[2px] rounded-2xl overflow-hidden">
      {/* Rotating gradient border — next-level */}
      <div className="absolute inset-0 rounded-2xl bg-[conic-gradient(from_0deg,rgba(20,184,166,0.8),rgba(34,211,238,0.8),rgba(94,234,212,0.8),rgba(20,184,166,0.8))] opacity-90 animate-spin-slow" />
      <div className="absolute inset-[2px] rounded-2xl bg-slate-900/95 z-[1]" />

      <div className="relative z-10 rounded-2xl overflow-hidden glass-panel border border-white/5 shadow-2xl animate-pulse-glow noise-overlay">
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(20,184,166,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(20,184,166,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
        {/* Scan-line */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.04)_2px,rgba(255,255,255,0.04)_4px)]" />

        {/* Volume-reactive wave — neon bars */}
        <div className="absolute inset-0 flex items-center justify-center gap-0.5 px-4 py-6 overflow-hidden">
          {BASE_HEIGHTS.map((base, i) => {
            const variation = 0.85 + 0.3 * Math.sin((i * 0.4) + vol * Math.PI * 2);
            const h = Math.max(8, base * waveScale * variation);
            const opacity = 0.6 + vol * 0.4 + (i % 3) * 0.05;
            return (
              <div
                key={i}
                className="w-1.5 rounded-full min-h-[6px] transition-all duration-75 ease-out bg-gradient-to-t from-teal-500 to-cyan-400"
                style={{
                  height: `${h}%`,
                  opacity: Math.min(1, opacity),
                  boxShadow: vol > 0.15
                    ? "0 0 16px rgba(94,234,212,0.6), 0 0 6px rgba(34,211,238,0.5)"
                    : "0 0 8px rgba(20,184,166,0.3)",
                }}
              />
            );
          })}
        </div>

        <div className="relative z-10 p-8 flex flex-col items-center gap-5">
          {!callActive && !connecting && (
            <button
              type="button"
              onClick={startDemo}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-teal-400 via-cyan-400 to-teal-400 bg-[length:200%_100%] animate-gradient-shift hover:animate-none text-slate-900 px-10 py-4 rounded-xl font-bold text-lg transition-all glow-teal-sm hover:glow-neon hover:scale-[1.03] active:scale-[0.98] border border-white/20"
            >
              <Mic className="w-5 h-5" />
              Talk to our AI
            </button>
          )}
        {connecting && (
          <div className="flex items-center justify-center gap-3 min-h-[2.5rem] px-5 py-3 rounded-xl bg-slate-900/70 border border-teal-500/20 shadow-lg shadow-teal-500/10">
            <Loader2 className="w-5 h-5 animate-spin shrink-0 text-cyan-400" />
            <span className="text-slate-100 font-semibold text-base text-center">
              {CONNECTING_MESSAGES[connectingMessageIndex]}
            </span>
          </div>
        )}
        {callActive && (
          <div className="flex flex-col items-center gap-4 w-full max-w-lg">
            <p className="text-slate-200 text-sm font-medium text-center">
              Call live — speak now. Ask about pricing, use cases, or how it works.
            </p>
            <button
              type="button"
              onClick={endCall}
              className="inline-flex items-center gap-2 bg-red-500/90 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-medium transition-all"
            >
              <PhoneOff className="w-4 h-4" />
              End call
            </button>

            {/* Live transcript — latest line slightly bigger */}
            {transcript.length > 0 && (
              <div
                ref={transcriptContainerRef}
                className="w-full mt-1 p-4 rounded-xl bg-slate-900/70 border border-white/5 text-left max-h-40 overflow-y-auto space-y-2 scroll-smooth"
              >
                {transcript.map((t, i) => {
                  const isLatest = i === transcript.length - 1;
                  return (
                    <div
                      key={i}
                      className={`transition-all duration-300 rounded px-1 -mx-1 ${
                        t.role === "user" ? "text-slate-300" : "text-teal-400/95"
                      } ${isLatest ? "text-base font-medium bg-teal-500/10" : "text-sm"}`}
                    >
                      <span className="font-semibold text-teal-400/80">{t.role === "user" ? "You: " : "AI: "}</span>
                      <span className={isLatest ? "text-white/95" : ""}>{t.text}</span>
                    </div>
                  );
                })}
                <div ref={transcriptEndRef} />
              </div>
            )}

            {/* Email + Book a call / Enterprise chat — conversion CTA */}
            <div className="w-full mt-2 p-4 rounded-xl bg-slate-900/60 border border-teal-500/25 backdrop-blur-sm">
              <p className="text-slate-300 text-xs font-medium mb-3 uppercase tracking-wider">Book a call or start enterprise chat</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="your@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-slate-400 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 outline-none transition-all"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleBookCall}
                    disabled={!email.trim()}
                    className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 px-5 py-3 rounded-lg font-semibold transition-all"
                  >
                    <Calendar className="w-4 h-4" />
                    {bookSubmitted ? "Opened" : "Book a call"}
                  </button>
                  <a
                    href="https://wa.me/27XXXXXXXXX?text=Hi%2C%20I'm%20interested%20in%20Intellidial"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-5 py-3 rounded-lg font-medium transition-all border border-white/10"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Enterprise chat
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
        </div>
      </div>
    </div>
  );
}
