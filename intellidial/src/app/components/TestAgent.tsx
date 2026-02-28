"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Mic, Loader2, PhoneOff } from "lucide-react";
import Vapi from "@vapi-ai/web";
import { useAuth } from "@/lib/auth/AuthContext";

const WAVE_BAR_COUNT = 48;
const BASE_HEIGHTS = Array.from({ length: WAVE_BAR_COUNT }, (_, i) =>
  30 + 45 * Math.sin((i / WAVE_BAR_COUNT) * Math.PI * 2) * Math.sin(i * 0.3)
);

const CONNECTING_MESSAGES = [
  "Connecting…",
  "Preparing your agent",
  "Loading instructions",
  "Almost there…",
];

interface TestAgentProps {
  projectId: string;
  projectName?: string;
}

/**
 * Test Agent component: allows users to test their project's agent before calling real clients.
 * Similar to VoiceDemo but uses the project's assistant configuration.
 */
export function TestAgent({ projectId, projectName }: TestAgentProps) {
  const { user } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callActive, setCallActive] = useState(false);
  const [transcript, setTranscript] = useState<{ role: string; text: string }[]>([]);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [connectingMessageIndex, setConnectingMessageIndex] = useState(0);
  const [testFirstName, setTestFirstName] = useState("");
  const [testSurname, setTestSurname] = useState("");
  const vapiRef = useRef<Vapi | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  // Suppress known benign errors from triggering Next.js error overlay (Daily, browser audio, etc.)
  useEffect(() => {
    const original = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      const first = args[0];
      const s = typeof first === "string" ? first : first != null && typeof (first as Error).message === "string" ? (first as Error).message : "";
      const combined = `${s} ${args.slice(1).map((a) => (typeof a === "string" ? a : "")).join(" ")}`;
      if (
        typeof s === "string" &&
        (s.includes("ejection") ||
          s.includes("Meeting has ended") ||
          s.includes("unsupported input processor") ||
          combined.includes("audio") && combined.includes("unsupported"))
      ) {
        return; // drop so overlay doesn't show
      }
      original(...args);
    };
    return () => {
      console.error = original;
    };
  }, []);

  // Only auto-scroll to bottom when user is already near bottom
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

  const startTest = useCallback(async (forceRefresh?: boolean, firstName?: string, surname?: string) => {
    setConnecting(true);
    setConnectingMessageIndex(0);
    setError(null);
    setTranscript([]);
    setVolumeLevel(0);

    if (!user?.uid) {
      setError("Please log in to test your agent");
      return;
    }

    try {
      // ?refresh=1 forces a new test assistant (no server URL); use if call keeps dropping.
      const url = `/api/projects/${projectId}/test-assistant${forceRefresh ? "?refresh=1" : ""}`;
      const res = await fetch(url, {
        headers: {
          "x-user-id": user.uid,
        },
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to get test assistant");
      }
      
      const { assistantId: rawAssistantId, publicKey: rawPublicKey } = await res.json();
      if (!rawPublicKey || !rawAssistantId) {
        throw new Error("Missing assistant credentials");
      }

      // Trim whitespace
      const publicKey = rawPublicKey.trim();
      const assistantId = rawAssistantId.trim();

      // Validate format
      if (!publicKey || publicKey.length < 10) {
        throw new Error("Invalid VAPI_PUBLIC_KEY format");
      }
      if (!assistantId || assistantId.length < 10) {
        throw new Error("Invalid assistant ID format");
      }

      console.log("[TestAgent] Starting test call with assistantId:", assistantId.substring(0, 8) + "...");
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
      vapi.on("message", (message: { type?: string; role?: string; transcript?: string; transcriptType?: string }) => {
        if (message.type !== "transcript" || !message.role || !message.transcript) return;
        const isFinal = message.transcriptType === "final" || message.transcriptType === undefined;
        if (!isFinal) return;
        const role = message.role;
        const text = message.transcript.trim();
        if (!text) return;
        setTranscript((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === role && last.text === text) return prev;
          if (last && last.role === role) {
            return [...prev.slice(0, -1), { role, text: last.text + " " + text }];
          }
          return [...prev, { role, text }];
        });
      });
      vapi.on("error", (e: unknown) => {
        clearConnectionTimeout();
        let msg = "Voice error. Try again.";
        if (e instanceof Error) {
          msg = e.message;
        } else if (typeof e === "object" && e !== null) {
          const o = e as Record<string, unknown>;
          const inner = o.error && typeof o.error === "object" ? (o.error as Record<string, unknown>) : null;
          const raw =
            typeof o.message === "string" ? o.message
            : typeof o.errorMsg === "string" ? o.errorMsg
            : typeof o.error === "string" ? o.error
            : typeof o.details === "string" ? o.details
            : inner && typeof inner.errorMsg === "string" ? inner.errorMsg
            : inner && typeof inner.message === "string" ? inner.message
            : typeof o.message === "object" && o.message && typeof (o.message as Record<string, unknown>).message === "string"
              ? (o.message as Record<string, unknown>).message as string
              : "";
          if (raw && raw !== "[object Object]") {
            msg = raw;
          }
          // Map common codes to clearer messages
          const code = typeof o.code === "string" ? o.code : "";
          if (code && !raw) {
            if (code.includes("permission") || code.includes("microphone") || code.includes("denied")) {
              msg = "Microphone access denied. Allow the mic and try again.";
            } else if (code.includes("network") || code.includes("connection")) {
              msg = "Connection lost. Check your network and try again.";
            }
          }
          // Daily.co (call layer) error with no detail – often network/firewall or WebRTC
          if (o.type === "daily-error" && !raw) {
            msg =
              "Call connection failed. Check your microphone, allow the site to use it, and try again. If on a VPN or corporate network, try without or use another browser.";
          }
        }
        if (msg === "[object Object]" || (typeof msg === "string" && msg.includes("object Object"))) {
          msg = "Voice connection error. Try again.";
        }
        // Friendly message for common Daily/VAPI session endings (don't treat as hard error)
        const isCallEnded = typeof msg === "string" && (msg.includes("ejection") || msg.includes("Meeting has ended"));
        if (isCallEnded) {
          msg = "Call ended. You can start a new test call.";
        }
        // Always log full error in dev so you can see the real reason in the console
        console.warn("[TestAgent] VAPI error (full object):", e);
        setError(msg);
        setConnecting(false);
        setCallActive(false);
      });

      vapiRef.current = vapi;
      const fName = (firstName ?? testFirstName).trim();
      const sName = (surname ?? testSurname).trim();
      const fullName = [fName, sName].filter(Boolean).join(" ") || undefined;
      if (fullName) {
        const overrides = { variableValues: { customerName: fullName, customerNumber: "test" } };
        (vapi.start as (id: string, overrides?: Record<string, unknown>) => void)(assistantId, overrides);
      } else {
        vapi.start(assistantId);
      }

      connectionTimeoutId = window.setTimeout(() => {
        setConnecting((prev) => {
          if (!prev) return prev;
          setError("Connection timed out. Allow microphone access and try again.");
          return false;
        });
      }, 20000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start test");
      setConnecting(false);
    }
  }, [projectId, user?.uid, testFirstName, testSurname]);

  const endCall = useCallback(() => {
    if (vapiRef.current) {
      vapiRef.current.stop();
      vapiRef.current = null;
    }
    setCallActive(false);
    setVolumeLevel(0);
  }, []);

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
      {/* Rotating gradient border */}
      <div className="absolute inset-0 rounded-2xl bg-[conic-gradient(from_0deg,rgba(20,184,166,0.8),rgba(34,211,238,0.8),rgba(94,234,212,0.8),rgba(20,184,166,0.8))] opacity-90 animate-spin-slow" />
      <div className="absolute inset-[2px] rounded-2xl bg-slate-900/95 z-[1]" />

      <div className="relative z-10 rounded-2xl overflow-hidden glass-panel border border-white/5 shadow-2xl animate-pulse-glow noise-overlay">
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(20,184,166,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(20,184,166,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
        {/* Scan-line */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.04)_2px,rgba(255,255,255,0.04)_4px)]" />

        {/* Volume-reactive wave */}
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
            <div className="relative w-full max-w-sm space-y-4">
              <div className="rounded-xl bg-slate-800/50 border border-white/10 p-4 space-y-3">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Test contact (optional)</p>
                <p className="text-xs text-slate-500">The agent will use this name when addressing you (e.g. &quot;Hi, is this John?&quot;).</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="test-first-name" className="sr-only">First name</label>
                    <input
                      id="test-first-name"
                      type="text"
                      value={testFirstName}
                      onChange={(e) => setTestFirstName(e.target.value)}
                      placeholder="First name"
                      className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="test-surname" className="sr-only">Surname</label>
                    <input
                      id="test-surname"
                      type="text"
                      value={testSurname}
                      onChange={(e) => setTestSurname(e.target.value)}
                      placeholder="Surname"
                      className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="relative">
                {/* Pulsing ring effect */}
                <div className="absolute inset-0 rounded-xl bg-teal-400/30 animate-ping opacity-75" style={{ animationDuration: '2s' }}></div>
                <div className="absolute inset-0 rounded-xl bg-cyan-400/20 animate-ping opacity-50" style={{ animationDuration: '2s', animationDelay: '0.5s' }}></div>
                <button
                  type="button"
                  onClick={() => startTest()}
                  className="relative w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-teal-400 via-cyan-400 to-teal-400 bg-[length:200%_100%] animate-gradient-shift hover:animate-none text-slate-900 px-10 py-4 rounded-xl font-bold text-lg transition-all glow-teal-sm hover:glow-neon hover:scale-[1.05] active:scale-[0.98] border border-white/20 animate-heartbeat cursor-pointer shadow-lg shadow-teal-400/30"
                >
                  <Mic className="w-5 h-5 relative z-10" />
                  <span className="relative z-10">Talk to your agent</span>
                </button>
              </div>
            </div>
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
              Test call active — speak now to test your agent&apos;s responses.
            </p>
            <button
              type="button"
              onClick={endCall}
              className="inline-flex items-center gap-2 bg-red-500/90 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-medium transition-all"
            >
              <PhoneOff className="w-4 h-4" />
              End call
            </button>

            {/* Live transcript */}
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
                      <span className="font-semibold text-teal-400/80">{t.role === "user" ? "You: " : "Agent: "}</span>
                      <span className={isLatest ? "text-white/95" : ""}>{t.text}</span>
                    </div>
                  );
                })}
                <div ref={transcriptEndRef} />
              </div>
            )}
          </div>
        )}
        {error && (
          <div className="text-center space-y-1">
            <p className="text-sm text-red-400">{error}</p>
            {error.includes("Try again") && (
              <p className="text-xs text-slate-500">Open the browser console (F12 → Console) to see the exact error.</p>
            )}
            <button
              type="button"
              onClick={() => startTest(true)}
              className="text-xs text-teal-400 hover:text-teal-300 underline mt-1"
            >
              Try again with a fresh test agent
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
