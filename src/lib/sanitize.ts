/**
 * Sanitizes an HTML string by removing dangerous elements and attributes
 * (such as script tags, inline event handlers, iframe tags, and javascript: URLs).
 * This protects against stored and DOM-based Cross-Site Scripting (XSS) attacks.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";

  let sanitized = html;

  // 1. Remove script tags and their contents
  sanitized = sanitized.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "");

  // 2. Remove iframe/embed/object/link/meta/style tags and their contents
  sanitized = sanitized.replace(/<(iframe|embed|object|link|meta|style)[^>]*>([\s\S]*?)<\/\1>/gi, "");
  sanitized = sanitized.replace(/<(iframe|embed|object|link|meta|style)[^>]*\/?>/gi, "");

  // 3. Remove inline event handlers (e.g. onload, onerror, onclick, onmouseover)
  // Matches "onsomething=..."
  sanitized = sanitized.replace(/\s*(on[a-zA-Z]+)\s*=\s*(?:"[^"]*"|'[^']*'|[^>\s]+)/gi, "");

  // 4. Remove javascript: URIs in href, src, or other attributes
  sanitized = sanitized.replace(/\s*(href|src|action)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^>\s]+)/gi, "");

  return sanitized;
}
