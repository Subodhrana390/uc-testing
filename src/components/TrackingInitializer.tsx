"use client";

import { useEffect } from "react";
import { saveTrackingParams, appendTrackingParamsToUrl, getTrackingParams } from "@/lib/tracking";

export default function TrackingInitializer() {
  useEffect(() => {
    // 1. Read and store parameters from the URL
    saveTrackingParams();

    // 2. Global click interception (capturing phase) to decorate links before navigation
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Ignore standard non-navigation protocols and external links
      if (
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        href.startsWith("javascript:")
      ) {
        return;
      }

      // Check if it's a relative URL or matches current origin
      const isRelative = href.startsWith("/") && !href.startsWith("//");
      const isSameOrigin = href.startsWith(window.location.origin);

      if (isRelative || isSameOrigin) {
        const updatedHref = appendTrackingParamsToUrl(href);
        if (updatedHref !== href) {
          anchor.setAttribute("href", updatedHref);
        }
      }
    };

    // 3. Global form submission interception to inject hidden inputs with tracking parameters
    const handleFormSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement;
      if (!form) return;

      const params = getTrackingParams();
      if (Object.keys(params).length === 0) return;

      Object.entries(params).forEach(([key, val]) => {
        if (val) {
          let hiddenInput = form.querySelector(`input[name="${key}"][type="hidden"]`) as HTMLInputElement;
          if (!hiddenInput) {
            hiddenInput = document.createElement("input");
            hiddenInput.type = "hidden";
            hiddenInput.name = key;
            form.appendChild(hiddenInput);
          }
          hiddenInput.value = val;
        }
      });
    };

    // Register event listeners on document in capturing phase
    document.addEventListener("click", handleDocumentClick, true);
    document.addEventListener("submit", handleFormSubmit, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      document.removeEventListener("submit", handleFormSubmit, true);
    };
  }, []);

  return null;
}
