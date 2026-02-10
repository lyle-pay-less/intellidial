import { NextRequest, NextResponse } from "next/server";
import {
  getVoiceIdForKey,
  fetchElevenLabsVoiceSettings,
  ELEVENLABS_VOICE_DEFAULTS,
} from "@/lib/vapi/client";
import { getUserOrganization } from "@/lib/data/store";

// Force dynamic rendering - this route requires authentication and cannot be prerendered
export const dynamic = 'force-dynamic';

const INTRO_SCRIPT =
  "Hi, this is a quick voice preview. You're hearing how I'll sound on your calls. Thanks for listening.";

/**
 * GET /api/voice-preview?voice=rachel
 * Returns a short (~5s) MP3 of the selected agent voice for preview.
 *
 * ELEVEN_LABS_API_KEY is used ONLY here (voice preview). Production calls use VAPI;
 * we never send your ElevenLabs key to VAPI, so TTS cost on real calls runs through
 * VAPI when you do not add your ElevenLabs key in VAPI dashboard.
 * Voice param is the dropdown value (e.g. rachel, default, adam).
 */
export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = await getUserOrganization(userId);
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ELEVEN_LABS_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Voice preview not configured. Set ELEVEN_LABS_API_KEY." },
      { status: 503 }
    );
  }

  const voiceKey = req.nextUrl.searchParams.get("voice") ?? "default";
  const voiceId = getVoiceIdForKey(voiceKey);

  // Use this voice's saved settings from ElevenLabs (each voice has its own in the UI)
  const settings = await fetchElevenLabsVoiceSettings(voiceId);
  const voiceSettings = settings ?? ELEVENLABS_VOICE_DEFAULTS;

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: INTRO_SCRIPT,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: voiceSettings.stability,
            similarity_boost: voiceSettings.similarity_boost,
            style: voiceSettings.style,
            use_speaker_boost: voiceSettings.use_speaker_boost,
            speed: voiceSettings.speed,
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.warn("[Voice preview] ElevenLabs error:", res.status, err.slice(0, 200));
      return NextResponse.json(
        { error: "Failed to generate preview" },
        { status: 502 }
      );
    }

    const audio = await res.arrayBuffer();
    return new NextResponse(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (e) {
    console.warn("[Voice preview] Request failed:", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "Failed to generate preview" },
      { status: 502 }
    );
  }
}
