"use client";

import { useEffect, useState } from "react";
import { Shield, BarChart3, Settings, CheckCircle2, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";

export default function CookiePreferencesManager() {
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: false,
    marketing: false,
  });

  const [hasLoaded, setHasLoaded] = useState(false);

  // Load current preferences from localStorage
  const loadPreferences = () => {
    const consent = localStorage.getItem("uc-cookie-consent");
    if (consent) {
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
    setHasLoaded(true);
  };

  useEffect(() => {
    loadPreferences();

    // Listen to custom updates (so changes in the floating banner reflect here immediately)
    const handleConsentUpdated = () => {
      loadPreferences();
    };
    window.addEventListener("uc-cookie-consent-updated", handleConsentUpdated);
    return () => window.removeEventListener("uc-cookie-consent-updated", handleConsentUpdated);
  }, []);

  const handleSave = () => {
    const consentObj = {
      ...preferences,
      essential: true,
      timestamp: Date.now(),
    };
    localStorage.setItem("uc-cookie-consent", JSON.stringify(consentObj));
    toast.success("Cookie preferences updated successfully!");
    
    // Notify the floating banner
    window.dispatchEvent(new CustomEvent("uc-cookie-consent-updated", { detail: consentObj }));
  };

  const triggerResetBanner = () => {
    window.dispatchEvent(new CustomEvent("open-cookie-settings"));
  };

  if (!hasLoaded) {
    return (
      <div className="bg-white border border-zinc-200/80 p-8 rounded-3xl animate-pulse space-y-4 max-w-2xl mx-auto shadow-2xs">
        <div className="h-4 bg-zinc-100 rounded w-1/4"></div>
        <div className="h-10 bg-zinc-50 rounded"></div>
        <div className="h-10 bg-zinc-50 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-zinc-200/80 p-6 sm:p-8 rounded-[2rem] shadow-sm max-w-2xl mx-auto text-left space-y-6">
      <div>
        <h3 className="text-base font-black text-zinc-900 uppercase tracking-wide">Manage Your Cookie Preferences</h3>
        <p className="text-xs text-zinc-500 font-semibold uppercase tracking-widest mt-1">Privacy Control Center</p>
      </div>

      <div className="space-y-4">
        {/* Essential */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/50">
            <Shield className="w-4 h-4" />
          </div>
          <div className="flex-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-800">Essential Cookies</span>
              <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-100/50">Always Active</span>
            </div>
            <p className="text-[10px] text-zinc-500 leading-normal font-medium">Required for login session validation, CSRF protection, and shopping cart persistence. These cannot be disabled.</p>
          </div>
          <div className="flex items-center h-9">
            <input
              type="checkbox"
              checked
              disabled
              className="w-4 h-4 rounded-sm border-zinc-300 text-zinc-950 focus:ring-zinc-950 focus:ring-offset-0 accent-zinc-950 cursor-not-allowed opacity-50"
            />
          </div>
        </div>

        {/* Analytics */}
        <label className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-white border border-zinc-150 hover:border-zinc-300 transition-all cursor-pointer select-none">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-650 flex items-center justify-center shrink-0 border border-indigo-100/50">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div className="flex-1 space-y-0.5">
            <span className="text-xs font-bold text-zinc-800">Analytics Cookies</span>
            <p className="text-[10px] text-zinc-500 leading-normal font-medium">Helps our team track page speed performance, anonymous visitor volumes, and layout clicks so we can improve UC Enterprises.</p>
          </div>
          <div className="flex items-center h-9">
            <input
              type="checkbox"
              checked={preferences.analytics}
              onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
              className="w-4 h-4 rounded-sm border-zinc-300 text-zinc-950 focus:ring-zinc-950 focus:ring-offset-0 accent-zinc-950 cursor-pointer"
            />
          </div>
        </label>

        {/* Marketing */}
        <label className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-white border border-zinc-150 hover:border-zinc-300 transition-all cursor-pointer select-none">
          <div className="w-9 h-9 rounded-xl bg-orange-50 text-primary flex items-center justify-center shrink-0 border border-orange-100/50">
            <Settings className="w-4 h-4" />
          </div>
          <div className="flex-1 space-y-0.5">
            <span className="text-xs font-bold text-zinc-800">Marketing & Personalization</span>
            <p className="text-[10px] text-zinc-500 leading-normal font-medium">Used to customize deals campaigns, banners relevance, and product recommendations tailored to your enterprise profile.</p>
          </div>
          <div className="flex items-center h-9">
            <input
              type="checkbox"
              checked={preferences.marketing}
              onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
              className="w-4 h-4 rounded-sm border-zinc-300 text-zinc-950 focus:ring-zinc-950 focus:ring-offset-0 accent-zinc-950 cursor-pointer"
            />
          </div>
        </label>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-3">
        <button
          onClick={handleSave}
          className="flex-1 rounded-xl h-11 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs tracking-wide transition flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-zinc-950/10"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Save Active Preferences
        </button>
        <button
          onClick={triggerResetBanner}
          className="rounded-xl h-11 px-5 border border-zinc-200 hover:bg-zinc-50 text-zinc-650 font-bold text-xs tracking-wide transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-zinc-400" /> Open Full Settings Dialog
        </button>
      </div>
    </div>
  );
}
