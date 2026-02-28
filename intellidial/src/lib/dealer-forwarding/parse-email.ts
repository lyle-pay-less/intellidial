/**
 * Parse forwarded enquiry email body for: name, contact number, vehicle link.
 * Supports simple test format (Name:, Phone:, Link:) and fallback regex for SA numbers + AutoTrader URLs.
 */

export type ParsedEnquiry = {
  name: string;
  phone: string;
  vehicleLink: string;
};

const NAME_KEYS = /^(?:name|lead\s*name|contact\s*name|customer\s*name)\s*[:=]/i;
const PHONE_KEYS = /^(?:phone|contact\s*number|number|tel|cell|mobile)\s*[:=]/i;
const LINK_KEYS = /^(?:link|vehicle\s*link|url|car\s*link|listing|advert)\s*[:=]/i;

/** SA phone: 0xxxxxxxxx, +27xxxxxxxxx, 27xxxxxxxxx, with optional spaces/dashes */
const SA_PHONE_REGEX = /(?:\+27|0|27)\s*[\d\s\-]{8,12}\d/g;
/** AutoTrader (and similar) listing URL */
const VEHICLE_LINK_REGEX = /https?:\/\/(?:www\.)?(?:autotrader\.co\.za|cars\.co\.za)\/[^\s<>"']+/gi;

function extractByLabel(text: string): Partial<ParsedEnquiry> {
  const out: Partial<ParsedEnquiry> = {};
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (NAME_KEYS.test(trimmed)) {
      out.name = trimmed.replace(NAME_KEYS, "").trim();
    } else if (PHONE_KEYS.test(trimmed)) {
      out.phone = trimmed.replace(PHONE_KEYS, "").trim().replace(/\s/g, "");
    } else if (LINK_KEYS.test(trimmed)) {
      out.vehicleLink = trimmed.replace(LINK_KEYS, "").trim();
    }
  }
  return out;
}

function extractPhoneFallback(text: string): string | null {
  const matches = text.match(SA_PHONE_REGEX);
  if (!matches || matches.length === 0) return null;
  const normalized = matches[0].replace(/\s/g, "").trim();
  return normalized.length >= 10 ? normalized : null;
}

function extractLinkFallback(text: string): string | null {
  const matches = text.match(VEHICLE_LINK_REGEX);
  return matches && matches[0] ? matches[0].trim() : null;
}

/** Strip HTML tags for plain-text parsing. */
function htmlToText(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Parse email body (plain text and/or HTML) and return name, phone, vehicle link.
 * Returns null if any required field is missing.
 */
export function parseEnquiryEmail(text: string, html?: string | null): ParsedEnquiry | null {
  const combined = [text, html ? htmlToText(html) : ""].filter(Boolean).join("\n");
  const byLabel = extractByLabel(combined);
  let name = byLabel.name?.trim() ?? "";
  let phone = (byLabel.phone ?? extractPhoneFallback(combined))?.trim().replace(/\s/g, "") ?? "";
  let vehicleLink = (byLabel.vehicleLink ?? extractLinkFallback(combined))?.trim() ?? "";

  if (!vehicleLink && combined) {
    const linkMatch = combined.match(VEHICLE_LINK_REGEX);
    if (linkMatch) vehicleLink = linkMatch[0].trim();
  }
  if (!phone && combined) {
    const p = extractPhoneFallback(combined);
    if (p) phone = p;
  }

  if (!phone || !vehicleLink) return null;
  if (!name) name = "Customer";

  if (!vehicleLink.startsWith("http")) vehicleLink = "https://" + vehicleLink;

  return { name, phone, vehicleLink };
}
