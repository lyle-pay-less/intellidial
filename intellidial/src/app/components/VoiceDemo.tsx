"use client";

import { useState, useCallback, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { Mic, Loader2, PhoneOff } from "lucide-react";
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
export interface VoiceDemoRef {
  startDemo: () => void;
}

export const VoiceDemo = forwardRef<VoiceDemoRef>((props, ref) => {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callActive, setCallActive] = useState(false);
  const [transcript, setTranscript] = useState<{ role: string; text: string }[]>([]);
  const [volumeLevel, setVolumeLevel] = useState(0);
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
      const { assistantId: rawAssistantId, publicKey: rawPublicKey } = await res.json();
      if (!rawPublicKey || !rawAssistantId) {
        throw new Error("Missing VAPI_PUBLIC_KEY or VAPI_DEMO_ASSISTANT_ID in doctor .env");
      }

      // Trim whitespace (Secret Manager might add newlines)
      const publicKey = rawPublicKey.trim();
      const assistantId = rawAssistantId.trim();

      // Validate format
      if (!publicKey || publicKey.length < 10) {
        throw new Error("Invalid VAPI_PUBLIC_KEY format");
      }
      if (!assistantId || assistantId.length < 10) {
        throw new Error("Invalid VAPI_DEMO_ASSISTANT_ID format");
      }

      console.log("[VoiceDemo] Starting call with assistantId:", assistantId.substring(0, 8) + "...");
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
        console.error("[VoiceDemo] VAPI error:", e);
        let msg = "Voice error";
        if (e instanceof Error) {
          msg = e.message;
        } else if (typeof e === "object" && e) {
          // Try to extract detailed error message
          if ("message" in e) {
            msg = String(e.message);
          } else if ("error" in e) {
            msg = String(e.error);
          } else if ("details" in e) {
            msg = String(e.details);
          }
          // Check for common VAPI error patterns
          const errorStr = JSON.stringify(e);
          if (errorStr.includes("400") || errorStr.includes("Bad Request")) {
            msg = "Invalid request. Check VAPI_PUBLIC_KEY and VAPI_DEMO_ASSISTANT_ID in environment.";
          } else if (errorStr.includes("401") || errorStr.includes("Unauthorized")) {
            msg = "Authentication failed. Check VAPI_PUBLIC_KEY is correct.";
          } else if (errorStr.includes("404") || errorStr.includes("Not Found")) {
            msg = "Assistant not found. Check VAPI_DEMO_ASSISTANT_ID is correct.";
          }
        }
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

  useImperativeHandle(ref, () => ({
    startDemo,
  }));

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
            <div className="relative">
              {/* Pulsing ring effect */}
              <div className="absolute inset-0 rounded-xl bg-teal-400/30 animate-ping opacity-75" style={{ animationDuration: '2s' }}></div>
              <div className="absolute inset-0 rounded-xl bg-cyan-400/20 animate-ping opacity-50" style={{ animationDuration: '2s', animationDelay: '0.5s' }}></div>
              <button
                type="button"
                onClick={startDemo}
                className="relative inline-flex items-center justify-center gap-2 bg-gradient-to-r from-teal-400 via-cyan-400 to-teal-400 bg-[length:200%_100%] animate-gradient-shift hover:animate-none text-slate-900 px-10 py-4 rounded-xl font-bold text-lg transition-all glow-teal-sm hover:glow-neon hover:scale-[1.05] active:scale-[0.98] border border-white/20 animate-heartbeat cursor-pointer shadow-lg shadow-teal-400/30"
              >
                <Mic className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Talk to our AI</span>
              </button>
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

          </div>
        )}
        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
        </div>
      </div>
    </div>
  );
});

VoiceDemo.displayName = "VoiceDemo";
