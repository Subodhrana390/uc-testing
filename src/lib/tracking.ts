/**
 * Marketing and Analytics Tracking Utility
 * Captures, persists, and propagates UTM and ad-click identifiers.
 */

export const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "msclkid",
  "ttclid",
  "affiliate_id",
  "referral_code",
] as const;

export type TrackingParamKey = typeof TRACKING_PARAMS[number];
export type TrackingData = Partial<Record<TrackingParamKey, string>>;

const COOKIE_EXPIRATION_DAYS = 90;
const FIRST_TOUCH_KEY = "first_touch_attribution";
const LATEST_TOUCH_KEY = "latest_touch_attribution";

// Helper to set a first-party cookie
function setCookie(name: string, value: string, days: number) {
  if (typeof window === "undefined") return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  
  let cookieString = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  
  // Support wildcards/subdomains where applicable
  const host = window.location.hostname;
  const parts = host.split(".");
  if (parts.length > 2 && !host.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)) {
    // e.g., shop.example.com -> .example.com
    const domain = "." + parts.slice(-2).join(".");
    cookieString += `;domain=${domain}`;
  }
  
  document.cookie = cookieString;
}

// Helper to retrieve a cookie
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
}

// Helper to parse stored JSON safely
function safeParse(str: string | null): TrackingData | null {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * Saves tracking parameters from the current URL to cookies & localStorage.
 * Distinguishes between first-touch (preserved) and latest-touch (updated).
 */
export function saveTrackingParams(urlParams?: URLSearchParams): void {
  if (typeof window === "undefined") return;

  const searchParams = urlParams || new URLSearchParams(window.location.search);
  const currentParams: TrackingData = {};

  TRACKING_PARAMS.forEach((key) => {
    const value = searchParams.get(key);
    if (value && value.trim() !== "") {
      currentParams[key] = value.trim();
    }
  });

  // If no tracking parameters are present in the URL, do nothing
  if (Object.keys(currentParams).length === 0) {
    return;
  }

  // 1. First-Touch Attribution (Preserve original values)
  const existingFirstTouch = 
    safeParse(localStorage.getItem(FIRST_TOUCH_KEY)) || 
    safeParse(getCookie(FIRST_TOUCH_KEY));

  if (!existingFirstTouch) {
    const dataStr = JSON.stringify(currentParams);
    localStorage.setItem(FIRST_TOUCH_KEY, dataStr);
    setCookie(FIRST_TOUCH_KEY, dataStr, COOKIE_EXPIRATION_DAYS);
  }

  // 2. Latest-Touch Attribution (Overwrite with latest values)
  const existingLatestTouch = 
    safeParse(localStorage.getItem(LATEST_TOUCH_KEY)) || 
    safeParse(getCookie(LATEST_TOUCH_KEY)) || 
    {};

  const updatedLatestTouch = {
    ...existingLatestTouch,
    ...currentParams,
  };

  const latestStr = JSON.stringify(updatedLatestTouch);
  localStorage.setItem(LATEST_TOUCH_KEY, latestStr);
  setCookie(LATEST_TOUCH_KEY, latestStr, COOKIE_EXPIRATION_DAYS);
}

/**
 * Retrieves the currently stored tracking parameters.
 * Prefers latest-touch but falls back to first-touch.
 */
export function getTrackingParams(): TrackingData {
  if (typeof window === "undefined") return {};

  const latest = 
    safeParse(localStorage.getItem(LATEST_TOUCH_KEY)) || 
    safeParse(getCookie(LATEST_TOUCH_KEY));
    
  if (latest && Object.keys(latest).length > 0) {
    return latest;
  }

  const first = 
    safeParse(localStorage.getItem(FIRST_TOUCH_KEY)) || 
    safeParse(getCookie(FIRST_TOUCH_KEY));

  return first || {};
}

/**
 * Returns a complete attribution payload for both first-touch and latest-touch.
 */
export function getAttributionData() {
  if (typeof window === "undefined") {
    return { first_touch: {}, latest_touch: {} };
  }

  const first_touch = 
    safeParse(localStorage.getItem(FIRST_TOUCH_KEY)) || 
    safeParse(getCookie(FIRST_TOUCH_KEY)) || 
    {};

  const latest_touch = 
    safeParse(localStorage.getItem(LATEST_TOUCH_KEY)) || 
    safeParse(getCookie(LATEST_TOUCH_KEY)) || 
    {};

  return { first_touch, latest_touch };
}

/**
 * Appends the stored tracking parameters to a given URL.
 * Preserves existing query parameters and avoids duplicates.
 */
export function appendTrackingParamsToUrl(url: string): string {
  if (!url) return url;
  
  // Ignore mailto, tel, anchor links, and external links if they shouldn't be touched
  if (url.startsWith("mailto:") || url.startsWith("tel:") || url.startsWith("#")) {
    return url;
  }

  try {
    const storedParams = getTrackingParams();
    if (Object.keys(storedParams).length === 0) {
      return url;
    }

    // Parse URL (resolve relative URLs in client environment)
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://dummy.com";
    const parsedUrl = new URL(url, baseUrl);

    // Append each stored param if not already present in the target URL
    Object.entries(storedParams).forEach(([key, val]) => {
      if (val && !parsedUrl.searchParams.has(key)) {
        parsedUrl.searchParams.set(key, val);
      }
    });

    // Return relative or absolute URL based on original format
    if (url.startsWith("/") || !url.startsWith("http")) {
      return parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
    }
    return parsedUrl.toString();
  } catch (e) {
    console.error("Error appending tracking parameters:", e);
    return url;
  }
}

/**
 * Triggers a simulated or real analytics event for Google Analytics and Meta Pixel,
 * automatically appending the stored first-touch and latest-touch attribution data.
 */
export function trackAnalyticsEvent(eventName: string, eventParams: Record<string, any> = {}): void {
  if (typeof window === "undefined") return;

  const attribution = getAttributionData();
  const fullyAttributedParams = {
    ...eventParams,
    // Add first-touch parameters directly
    ...attribution.first_touch,
    // Add latest-touch parameters prefixed with latest_ to prevent collision
    ...Object.entries(attribution.latest_touch).reduce((acc, [key, val]) => {
      acc[`latest_${key}`] = val;
      return acc;
    }, {} as Record<string, any>),
    attribution_data: attribution, // Include the full raw object structure
  };

  // Log event details to console for tracking and verification
  console.log(`[Analytics Event: ${eventName}]`, fullyAttributedParams);

  // Safely trigger Google Analytics gtag event if defined
  const win = window as any;
  if (typeof win.gtag === "function") {
    try {
      win.gtag("event", eventName, fullyAttributedParams);
    } catch (e) {
      console.error("Error invoking Google Analytics gtag:", e);
    }
  }

  // Safely trigger Meta Pixel fbq track event if defined
  if (typeof win.fbq === "function") {
    try {
      win.fbq("track", eventName, fullyAttributedParams);
    } catch (e) {
      console.error("Error invoking Meta Pixel fbq:", e);
    }
  }
}

