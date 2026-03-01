/**
 * Fetch full HTML from a vehicle listing URL for the enquiry pipeline (SLA path).
 *
 * DESIGN (SLA + full context):
 * - We always use Playwright first so the agent has full context (expanded "Detailed
 *   specifications", all sections). Plain fetch often returns a JS shell or partial HTML;
 *   we have no data showing fetch content equals Playwright, and character counts are
 *   similar across pages so length/keyword heuristics are unreliable. One consistent
 *   path = predictable performance and guaranteed full context when Playwright succeeds.
 * - Playwright is capped by VEHICLE_FETCH_SLA_MS so we don't blow the 60s callback SLA.
 * - If Playwright fails or times out, we fall back to fetch and log that context may be
 *   partial (agent might not answer every question). We still attempt the call.
 *
 * Used by: dealer-forwarding pipeline (SLA), refresh-vehicle-context (dashboard).
 */

export type FetchHtmlResult =
  | { ok: true; html: string }
  | { ok: false; error: string };

/** Max time for vehicle fetch step so pipeline can meet 60s callback SLA. */
const VEHICLE_FETCH_SLA_MS = 45_000;
const FETCH_TIMEOUT_MS = 35_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** Browser-like headers to reduce bot detection / 503 from listing sites. */
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent": USER_AGENT,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-ZA,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

/**
 * Fetch page HTML using Playwright (full JS render). Returns error if Playwright fails or times out.
 */
async function fetchWithPlaywright(url: string): Promise<FetchHtmlResult> {
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    try {
      const page = await browser.newPage({
        userAgent: USER_AGENT,
        viewport: { width: 1280, height: 720 },
        locale: "en-ZA",
      });
      await page.setExtraHTTPHeaders({
        "Accept-Language": "en-ZA,en;q=0.9",
        Referer: "https://www.autotrader.co.za/",
      });
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: VEHICLE_FETCH_SLA_MS,
      });
      await new Promise((r) => setTimeout(r, 500));
      try {
        const cookieBtn = page.getByRole("button", { name: /accept|agree|allow all|i accept|cookies/i }).first();
        await cookieBtn.click({ timeout: 1000 });
      } catch {
        // No cookie button — continue
      }
      await page.evaluate(() => window.scrollBy(0, 600));
      try {
        const specBtn = page.locator('a, button').filter({
          hasText: /detailed specifications|view (full )?specs?|specifications?|tech specs?|full specs?/i,
        }).first();
        await specBtn.click({ timeout: 1500 });
        await new Promise((r) => setTimeout(r, 600));
        // Expand all spec sections via role="tab" in a single evaluate (no round-trips)
        const tabsClicked = await page.evaluate(() => {
          const tabs = document.querySelectorAll('[role="tab"]');
          let clicked = 0;
          tabs.forEach((el, i) => {
            if (i > 25) return;
            (el as HTMLElement).click();
            clicked++;
          });
          return clicked;
        });
        if (tabsClicked === 0) {
          // Fallback: click common section labels in a single evaluate (avoids per-label round-trips)
          await page.evaluate(() => {
            const labels = ["General", "Engine", "Handling", "Comfort", "Technology", "Safety", "Exterior", "Interior", "Performance", "Warranty"];
            for (const label of labels) {
              const re = new RegExp("\\b" + label + "\\b", "i");
              const els = document.querySelectorAll('button, a, [role="button"], [role="tab"]');
              for (const el of els) {
                if (re.test(el.textContent ?? "")) { (el as HTMLElement).click(); break; }
              }
            }
          });
        }
        await new Promise((r) => setTimeout(r, 300));
        await page.evaluate(() => window.scrollBy(0, 2000));
        await new Promise((r) => setTimeout(r, 300));
      } catch {
        // No spec button — keep initial content
      }
      const html = await page.content();
      await browser.close();
      if (!html || html.length < 500) {
        return { ok: false, error: "Page content too small or empty." };
      }
      return { ok: true, html };
    } finally {
      await browser.close().catch(() => {});
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Playwright failed: ${msg}` };
  }
}

/**
 * Plain fetch. Works for server-rendered pages; JS-heavy SPAs may return a shell.
 * @param timeoutMs - abort after this many ms
 */
async function fetchWithFetch(url: string, timeoutMs: number = FETCH_TIMEOUT_MS): Promise<FetchHtmlResult> {
  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const html = await res.text();
    if (!html || html.length < 500) {
      return { ok: false, error: "Response too small or empty." };
    }
    return { ok: true, html };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Fetch failed: ${msg}` };
  }
}

/**
 * Fetch full HTML from a vehicle listing URL.
 * Uses Playwright first (full context for agent); on failure or SLA timeout, falls back to fetch.
 */
export async function fetchVehicleListingHtml(url: string): Promise<FetchHtmlResult> {
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return { ok: false, error: "URL must start with http:// or https://" };
  }
  let playwrightResult: FetchHtmlResult;
  try {
    playwrightResult = await withTimeout(
      fetchWithPlaywright(trimmed),
      VEHICLE_FETCH_SLA_MS,
      "Playwright timed out (SLA cap)"
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    playwrightResult = { ok: false, error: msg };
  }
  if (playwrightResult.ok) return playwrightResult;
  if (playwrightResult.error?.includes("timed out") || playwrightResult.error?.includes("SLA cap")) {
    console.warn("[fetchVehicleListingHtml] Playwright SLA timeout — falling back to fetch; context may be partial.", { url: trimmed });
  }
  const fetchResult = await fetchWithFetch(trimmed, Math.min(10_000, VEHICLE_FETCH_SLA_MS - 5000));
  if (fetchResult.ok) return fetchResult;
  return playwrightResult;
}

function withTimeout<T>(p: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), ms)
    ),
  ]);
}
