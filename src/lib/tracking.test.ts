import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  saveTrackingParams,
  getTrackingParams,
  getAttributionData,
  appendTrackingParamsToUrl,
  trackAnalyticsEvent
} from "./tracking";

// Mock cookies and localStorage
let mockLocalStorage: Record<string, string> = {};
let mockCookies: string[] = [];

beforeAll(() => {
  // Define global mocks for window and document if not present
  global.window = {
    location: {
      search: "",
      origin: "http://localhost:3000",
      hostname: "localhost"
    }
  } as any;

  global.document = {
    cookie: "",
    createElement: (tag: string) => {
      return {
        type: "",
        name: "",
        value: ""
      } as any;
    }
  } as any;

  // Mock localStorage
  const mockLocalStorageObj = {
    getItem: (key: string) => mockLocalStorage[key] || null,
    setItem: (key: string, val: string) => { mockLocalStorage[key] = val; },
    removeItem: (key: string) => { delete mockLocalStorage[key]; },
    clear: () => { mockLocalStorage = {}; }
  };
  Object.defineProperty(global.window, "localStorage", {
    value: mockLocalStorageObj,
    writable: true
  });
  global.localStorage = mockLocalStorageObj as any;

  // Mock document.cookie
  Object.defineProperty(global.document, "cookie", {
    get: () => mockCookies.join("; "),
    set: (val: string) => {
      const parts = val.split(";");
      const pair = parts[0].split("=");
      const name = pair[0].trim();
      const value = pair[1] ? pair[1].trim() : "";
      
      mockCookies = mockCookies.filter(c => !c.trim().startsWith(`${name}=`));
      mockCookies.push(`${name}=${value}`);
    },
    configurable: true
  });
});

beforeEach(() => {
  mockLocalStorage = {};
  mockCookies = [];
  global.window.location.search = "";
  if ((global.window as any).gtag) delete (global.window as any).gtag;
  if ((global.window as any).fbq) delete (global.window as any).fbq;
});

describe("Marketing Tracking Utilities", () => {
  it("should capture and store tracking parameters from search query", () => {
    const search = "?utm_source=google&utm_medium=cpc&utm_campaign=summer_sale&gclid=g123&referral_code=ref99";
    global.window.location.search = search;

    saveTrackingParams();

    const tracking = getTrackingParams();
    expect(tracking.utm_source).toBe("google");
    expect(tracking.utm_medium).toBe("cpc");
    expect(tracking.utm_campaign).toBe("summer_sale");
    expect(tracking.gclid).toBe("g123");
    expect(tracking.referral_code).toBe("ref99");
  });

  it("should preserve first-touch attribution and update latest-touch attribution", () => {
    // 1st touch
    global.window.location.search = "?utm_source=google&utm_campaign=first_campaign";
    saveTrackingParams();

    // 2nd touch
    global.window.location.search = "?utm_source=facebook&utm_campaign=second_campaign";
    saveTrackingParams();

    const attribution = getAttributionData();

    // First touch must preserve original
    expect(attribution.first_touch.utm_source).toBe("google");
    expect(attribution.first_touch.utm_campaign).toBe("first_campaign");

    // Latest touch must reflect newest
    expect(attribution.latest_touch.utm_source).toBe("facebook");
    expect(attribution.latest_touch.utm_campaign).toBe("second_campaign");
  });

  it("should ignore empty/whitespace parameters", () => {
    global.window.location.search = "?utm_source= &utm_medium=email";
    saveTrackingParams();

    const tracking = getTrackingParams();
    expect(tracking.utm_source).toBeUndefined();
    expect(tracking.utm_medium).toBe("email");
  });

  it("should append tracking parameters to relative and same-origin URLs", () => {
    global.window.location.search = "?utm_source=google&utm_medium=cpc";
    saveTrackingParams();

    // Relative URL
    const relativeUrl = "/products/chemistry-beaker?in_stock=true";
    const decoratedRelative = appendTrackingParamsToUrl(relativeUrl);
    expect(decoratedRelative).toContain("utm_source=google");
    expect(decoratedRelative).toContain("utm_medium=cpc");
    expect(decoratedRelative).toContain("in_stock=true");

    // Absolute same origin URL
    const absUrl = "http://localhost:3000/cart";
    const decoratedAbs = appendTrackingParamsToUrl(absUrl);
    expect(decoratedAbs).toContain("utm_source=google");
  });

  it("should not duplicate existing query parameters", () => {
    global.window.location.search = "?utm_source=google";
    saveTrackingParams();

    const existingUrl = "/checkout?utm_source=existing_source";
    const decorated = appendTrackingParamsToUrl(existingUrl);
    expect(decorated).toBe("/checkout?utm_source=existing_source");
  });

  it("should trigger simulated analytics events with attribution data", () => {
    global.window.location.search = "?utm_source=google&utm_campaign=sale";
    saveTrackingParams();

    const mockGtag = vi.fn();
    const mockFbq = vi.fn();
    (global.window as any).gtag = mockGtag;
    (global.window as any).fbq = mockFbq;

    trackAnalyticsEvent("purchase", { transaction_id: "T123", value: 100 });

    expect(mockGtag).toHaveBeenCalledWith("event", "purchase", expect.objectContaining({
      transaction_id: "T123",
      value: 100,
      utm_source: "google",
      utm_campaign: "sale",
      latest_utm_source: "google"
    }));

    expect(mockFbq).toHaveBeenCalledWith("track", "purchase", expect.objectContaining({
      transaction_id: "T123",
      value: 100,
      utm_source: "google",
      utm_campaign: "sale"
    }));
  });
});
