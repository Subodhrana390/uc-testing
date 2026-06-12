"use client";

import { useEffect, useState } from "react";
import { X, Cookie, Shield, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
}

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if consent has already been given
    const consent = localStorage.getItem("uc-cookie-consent");
    if (!consent) {
      // Show banner after a slight delay
      const timer = setTimeout(() => setShowBanner(true), 1200);
      return () => clearTimeout(timer);
    } else {
      try {
        const parsed = JSON.parse(consent);
        setPreferences({
          essential: true,
          analytics: !!parsed.analytics,
          marketing: !!parsed.marketing,
        });
      } catch (e) {
        console.error("Failed to parse cookie preferences", e);
      }
    }
  }, []);

  // Listen for custom trigger event to update preferences
  useEffect(() => {
    const handleOpenSettings = () => {
      setShowBanner(true);
      setIsCustomizing(true);
    };
    window.addEventListener("open-cookie-settings", handleOpenSettings);
    return () => window.removeEventListener("open-cookie-settings", handleOpenSettings);
  }, []);

  const handleAcceptAll = () => {
    const consentObj: CookiePreferences = {
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: Date.now(),
    };
    saveConsent(consentObj);
  };

  const handleRejectAll = () => {
    const consentObj: CookiePreferences = {
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: Date.now(),
    };
    saveConsent(consentObj);
  };

  const handleSaveCustom = () => {
    const consentObj: CookiePreferences = {
      ...preferences,
      essential: true,
      timestamp: Date.now(),
    };
    saveConsent(consentObj);
  };

  const saveConsent = (consentObj: CookiePreferences) => {
    localStorage.setItem("uc-cookie-consent", JSON.stringify(consentObj));
    setPreferences({
      essential: true,
      analytics: consentObj.analytics,
      marketing: consentObj.marketing,
    });
    setShowBanner(false);
    setIsCustomizing(false);
    
    // Dispatch event so other components (e.g. Cookie Policy page) sync instantly
    window.dispatchEvent(new CustomEvent("uc-cookie-consent-updated", { detail: consentObj }));
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-6 right-6 left-6 md:left-auto md:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-white/95 backdrop-blur-md border border-zinc-200/80 p-6 rounded-[2rem] shadow-2xl space-y-4">
        {/* Banner Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Cookie className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h4 className="text-sm font-black text-zinc-900 uppercase tracking-wide">Cookie Settings</h4>
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mt-0.5">Privacy Preferences</p>
            </div>
          </div>
          <button 
            onClick={() => { setShowBanner(false); setIsCustomizing(false); }}
            className="text-zinc-400 hover:text-zinc-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Customize Preferences section */}
        {isCustomizing ? (
          <div className="space-y-4 text-left border-y border-zinc-100 py-4">
            <p className="text-xs text-zinc-550 leading-relaxed font-medium">
              Customize how cookies are used on our site. Essential cookies are required for core operations.
            </p>
            <div className="space-y-3">
              {/* Essential */}
              <div className="flex items-start justify-between gap-3 p-3 rounded-2xl bg-zinc-50 border border-zinc-100">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs font-bold text-zinc-800">Essential Cookies</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-normal font-medium">Authentication, shopping cart state, and security.</p>
                </div>
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked
                    disabled
                    className="w-4 h-4 rounded-sm border-zinc-300 text-zinc-900 focus:ring-zinc-900 focus:ring-offset-0 accent-zinc-900 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Analytics */}
              <label className="flex items-start justify-between gap-3 p-3 rounded-2xl bg-white border border-zinc-150 hover:border-zinc-300 transition cursor-pointer select-none">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-zinc-800">Analytics Cookies</span>
                  <p className="text-[10px] text-zinc-500 leading-normal font-medium">Anonymous visitor counts, page performance metrics, and navigation paths.</p>
                </div>
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                    className="w-4 h-4 rounded-sm border-zinc-300 text-zinc-900 focus:ring-zinc-900 focus:ring-offset-0 accent-zinc-900 cursor-pointer"
                  />
                </div>
              </label>

              {/* Marketing */}
              <label className="flex items-start justify-between gap-3 p-3 rounded-2xl bg-white border border-zinc-150 hover:border-zinc-300 transition cursor-pointer select-none">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-zinc-800">Marketing Cookies</span>
                  <p className="text-[10px] text-zinc-500 leading-normal font-medium">Customizes promotions, offers, and recommendations matching your business.</p>
                </div>
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                    className="w-4 h-4 rounded-sm border-zinc-300 text-zinc-900 focus:ring-zinc-900 focus:ring-offset-0 accent-zinc-900 cursor-pointer"
                  />
                </div>
              </label>
            </div>
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-zinc-550 font-medium text-left border-y border-zinc-100 py-3">
            We use cookies to improve authentication, manage shopping carts, and enhance site performance. By clicking "Accept All", you agree to optional cookies. Read our <a href="/cookie-policy" className="text-primary font-bold hover:underline">Cookie Policy</a>.
          </p>
        )}

        {/* Buttons Panel */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          {isCustomizing ? (
            <>
              <button
                onClick={handleSaveCustom}
                className="flex-1 rounded-xl h-10 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs tracking-wide transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" /> Save Preferences
              </button>
              <button
                onClick={() => setIsCustomizing(false)}
                className="rounded-xl h-10 px-4 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-bold text-xs tracking-wide transition cursor-pointer"
              >
                Back
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleAcceptAll}
                className="flex-1 rounded-xl h-10 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs tracking-wide transition cursor-pointer"
              >
                Accept All
              </button>
              <button
                onClick={handleRejectAll}
                className="flex-1 rounded-xl h-10 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-bold text-xs tracking-wide transition cursor-pointer"
              >
                Reject Optional
              </button>
              <button
                onClick={() => setIsCustomizing(true)}
                className="rounded-xl h-10 px-4 border border-zinc-100 hover:bg-zinc-50 text-zinc-500 font-bold text-xs tracking-wide transition cursor-pointer"
              >
                Customize
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
