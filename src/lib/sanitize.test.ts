import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "./sanitize";

describe("HTML Sanitizer Utility", () => {
  it("should return empty string for null/empty input", () => {
    expect(sanitizeHtml("")).toBe("");
    expect(sanitizeHtml((null as any))).toBe("");
  });

  it("should preserve safe HTML tags and text", () => {
    const safeHtml = "<div><p>Hello <strong>World</strong></p></div>";
    expect(sanitizeHtml(safeHtml)).toBe(safeHtml);
  });

  it("should strip out script tags and their content", () => {
    const dangerousHtml = "<div><p>Test</p><script>alert('XSS')</script></div>";
    const expected = "<div><p>Test</p></div>";
    expect(sanitizeHtml(dangerousHtml)).toBe(expected);
  });

  it("should strip out script tags case-insensitively", () => {
    const dangerousHtml = "<div><SCRIPT src='evil.js'></SCRIPT></div>";
    const expected = "<div></div>";
    expect(sanitizeHtml(dangerousHtml)).toBe(expected);
  });

  it("should strip out inline script handlers", () => {
    const dangerousHtml = "<button onclick=\"alert('XSS')\" onerror='fail()'>Click me</button>";
    const expected = "<button>Click me</button>";
    expect(sanitizeHtml(dangerousHtml)).toBe(expected);
  });

  it("should strip out javascript: URLs in href and src", () => {
    const dangerousHtml = "<a href=\"javascript:alert('XSS')\">Link</a><img src='javascript:attack()'/>";
    const expected = "<a>Link</a><img/>";
    expect(sanitizeHtml(dangerousHtml)).toBe(expected);
  });

  it("should strip out iframe and embed tags", () => {
    const dangerousHtml = "<div><iframe src='malicious.html'></iframe><embed src='flash.swf'/></div>";
    const expected = "<div></div>";
    expect(sanitizeHtml(dangerousHtml)).toBe(expected);
  });
});
