/**
 * Fetch full HTML from a vehicle listing URL. Uses Playwright (headless Chromium) when
 * available so JS-rendered content is included; falls back to fetch for static pages.
 * Used by refresh-vehicle-context to get full page content for Gemini extraction.
 */

export type FetchHtmlResult =
  | { ok: true; html: string }
  | { ok: false; error: string };

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
        timeout: FETCH_TIMEOUT_MS,
      });
      // Wait for JS to render listing content
      await new Promise((r) => setTimeout(r, 2000));
      // Dismiss cookie banner so it doesn't cover the spec button (AutoTrader, Cars.co.za, etc.)
      try {
        const cookieBtn = page.getByRole("button", { name: /accept|agree|allow all|i accept|cookies/i }).first();
        await cookieBtn.click({ timeout: 3000 });
        await new Promise((r) => setTimeout(r, 500));
      } catch {
        // No cookie button or different text — continue
      }
      // Scroll down to trigger lazy-loaded content
      await page.evaluate(() => window.scrollBy(0, 600));
      await new Promise((r) => setTimeout(r, 800));
      // Expand detailed specifications panel (AutoTrader hides specs behind a button)
      try {
        const specBtn = page.locator('a, button').filter({ hasText: /detailed specifications/i }).first();
        await specBtn.click({ timeout: 5000 });
        await new Promise((r) => setTimeout(r, 3000));
        // AutoTrader shows spec categories (General, Engine, Handling, Comfort, Technology, Safety) collapsed;
        // expand each so their content is in the DOM for extraction
        const sectionLabels = ["General", "Engine", "Handling", "Comfort", "Technology", "Safety"];
        for (const label of sectionLabels) {
          try {
            const sectionBtn = page.locator('button, a, [role="button"], [role="tab"]').filter({ hasText: new RegExp(`\\b${label}\\b`, "i") }).first();
            await sectionBtn.click({ timeout: 2000 });
            await new Promise((r) => setTimeout(r, 400));
          } catch {
            // Section not found or not clickable — skip
          }
        }
        await new Promise((r) => setTimeout(r, 800));
        // Scroll within the page to ensure all spec content is loaded
        await page.evaluate(() => window.scrollBy(0, 2000));
        await new Promise((r) => setTimeout(r, 1500));
      } catch {
        // No spec button found — keep initial content
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
 * Fallback: plain fetch. Works for server-rendered pages; JS-heavy SPAs may return a shell.
 */
async function fetchWithFetch(url: string): Promise<FetchHtmlResult> {
  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
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
 * Fetch full HTML from a vehicle listing URL. Tries Playwright first for full JS render;
 * falls back to fetch if Playwright fails (e.g. not installed or timeout).
 */
export async function fetchVehicleListingHtml(url: string): Promise<FetchHtmlResult> {
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return { ok: false, error: "URL must start with http:// or https://" };
  }
  const playwrightResult = await fetchWithPlaywright(trimmed);
  if (playwrightResult.ok) return playwrightResult;
  return fetchWithFetch(trimmed);
}
