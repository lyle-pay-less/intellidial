/**
 * Fetch full HTML from a vehicle listing URL for the enquiry pipeline.
 *
 * Strategy (target: sub-10s):
 *   1. Direct fetch with browser headers (free, ~1-2s if not blocked)
 *   2. Proxy fetch via Bright Data residential IP (~2-7s, ~$0.0004/request)
 *
 * Playwright has been removed — the proxy bypasses IP blocking far faster
 * and cheaper than running a headless browser on Cloud Run.
 */

import { fetch as proxyFetch, ProxyAgent } from "undici";

export type FetchHtmlResult =
  | { ok: true; html: string }
  | { ok: false; error: string };

const FETCH_TIMEOUT_MS = 15_000;
const PROXY_TIMEOUT_MS = 30_000;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent": USER_AGENT,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-ZA,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "sec-ch-ua":
    '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

function getProxyUrl(): string | null {
  const url = process.env.BRIGHT_DATA_PROXY_URL;
  return url?.trim() || null;
}

/**
 * Direct fetch — free, fast when not blocked. Returns 503 from AutoTrader on
 * Cloud Run datacenter IPs.
 */
async function fetchDirect(url: string): Promise<FetchHtmlResult> {
  try {
    const t = Date.now();
    const res = await globalThis.fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const elapsed = Date.now() - t;
    if (!res.ok) {
      console.warn("[fetchDirect] HTTP %d in %dms for %s", res.status, elapsed, url);
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const html = await res.text();
    console.log("[fetchDirect] HTTP 200 in %dms, %d chars for %s", elapsed, html.length, url);
    if (!html || html.length < 500) {
      return { ok: false, error: "Response too small or empty" };
    }
    return { ok: true, html };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[fetchDirect] Error: %s for %s", msg, url);
    return { ok: false, error: `Direct fetch failed: ${msg}` };
  }
}

/**
 * Fetch through Bright Data residential proxy. Bypasses datacenter IP blocking.
 * Uses undici's ProxyAgent to route through the configured proxy URL.
 */
async function fetchWithProxy(url: string): Promise<FetchHtmlResult> {
  const proxyUrl = getProxyUrl();
  if (!proxyUrl) {
    return { ok: false, error: "BRIGHT_DATA_PROXY_URL not configured" };
  }

  const agent = new ProxyAgent(proxyUrl);
  try {
    const t = Date.now();
    const res = await proxyFetch(url, {
      headers: BROWSER_HEADERS,
      dispatcher: agent,
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });
    const elapsed = Date.now() - t;
    if (!res.ok) {
      console.warn("[fetchWithProxy] HTTP %d in %dms for %s", res.status, elapsed, url);
      return { ok: false, error: `Proxy HTTP ${res.status}` };
    }
    const html = await res.text();
    console.log("[fetchWithProxy] HTTP 200 in %dms, %d chars for %s", elapsed, html.length, url);
    if (!html || html.length < 500) {
      return { ok: false, error: "Proxy response too small or empty" };
    }
    return { ok: true, html };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[fetchWithProxy] Error: %s for %s", msg, url);
    return { ok: false, error: `Proxy fetch failed: ${msg}` };
  } finally {
    agent.close();
  }
}

/**
 * Fetch vehicle listing HTML. Direct first (free), proxy fallback (paid, bypasses blocking).
 */
export async function fetchVehicleListingHtml(url: string): Promise<FetchHtmlResult> {
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return { ok: false, error: "URL must start with http:// or https://" };
  }

  const directResult = await fetchDirect(trimmed);
  if (directResult.ok) {
    console.log("[fetchVehicleListingHtml] Direct fetch succeeded (%d chars)", directResult.html.length);
    return directResult;
  }
  console.warn("[fetchVehicleListingHtml] Direct fetch failed: %s — trying proxy", directResult.error);

  const proxyResult = await fetchWithProxy(trimmed);
  if (proxyResult.ok) {
    console.log("[fetchVehicleListingHtml] Proxy fetch succeeded (%d chars)", proxyResult.html.length);
  } else {
    console.error("[fetchVehicleListingHtml] Proxy also failed: %s", proxyResult.error);
  }
  return proxyResult;
}

const MAX_STRIPPED_CHARS = 60_000;

/**
 * Fast HTML-to-text conversion (~10ms). Removes scripts, styles, SVGs, and HTML tags,
 * collapses whitespace, and truncates. GPT-4o-mini can find vehicle specs in the result.
 */
export function stripHtmlToText(html: string): string {
  let text = html;
  text = text.replace(/<script[\s\S]*?<\/script>/gi, " ");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, " ");
  text = text.replace(/<svg[\s\S]*?<\/svg>/gi, " ");
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, " ");
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, " ");
  text = text.replace(
    /<\/?(div|p|br|li|tr|td|th|h[1-6]|section|article|header|main|aside|blockquote|dt|dd|figcaption)[^>]*>/gi,
    "\n"
  );
  text = text.replace(/<[^>]+>/g, " ");
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n[ \t]*/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.trim();
  if (text.length > MAX_STRIPPED_CHARS) {
    text = text.slice(0, MAX_STRIPPED_CHARS);
  }
  return text;
}
