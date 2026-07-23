import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadCsv, sanitizeCsvCell } from "./csv";

describe("sanitizeCsvCell", () => {
  it("prefixes a formula starting with '=' with an apostrophe", () => {
    expect(sanitizeCsvCell("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
  });

  it("prefixes a formula starting with '+'", () => {
    expect(sanitizeCsvCell("+cmd|'/c calc'!A1")).toBe("'+cmd|'/c calc'!A1");
  });

  it("prefixes a formula starting with '-'", () => {
    expect(sanitizeCsvCell("-HYPERLINK(\"http://evil.example\",\"click\")")).toBe(
      "'-HYPERLINK(\"http://evil.example\",\"click\")",
    );
  });

  it("prefixes a formula starting with '@'", () => {
    expect(sanitizeCsvCell("@formula")).toBe("'@formula");
  });

  it("leaves normal text untouched", () => {
    expect(sanitizeCsvCell("Ravi Teja Reddy")).toBe("Ravi Teja Reddy");
  });

  it("leaves a plain positive number untouched", () => {
    expect(sanitizeCsvCell(1500)).toBe("1500");
  });

  it("prefixes a negative number (standard, expected trade-off of this mitigation)", () => {
    expect(sanitizeCsvCell(-500)).toBe("'-500");
  });

  it("leaves an empty string untouched", () => {
    expect(sanitizeCsvCell("")).toBe("");
  });

  it("leaves unicode text untouched", () => {
    expect(sanitizeCsvCell("रवि तेजा — ₹1,23,456.50")).toBe("रवि तेजा — ₹1,23,456.50");
  });

  it("does not flag a value that merely contains a risky character mid-string", () => {
    expect(sanitizeCsvCell("Profit = Revenue - Cost")).toBe("Profit = Revenue - Cost");
  });
});

describe("downloadCsv", () => {
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.fn>;
  let capturedBlob: Blob | undefined;

  beforeEach(() => {
    createObjectURLSpy = vi.fn((blob: Blob) => {
      capturedBlob = blob;
      return "blob:mock-url";
    });
    revokeObjectURLSpy = vi.fn();
    URL.createObjectURL = createObjectURLSpy as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURLSpy as unknown as typeof URL.revokeObjectURL;
    clickSpy = vi.fn();
    HTMLAnchorElement.prototype.click = clickSpy as unknown as () => void;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    capturedBlob = undefined;
  });

  it("builds a CSV blob with the correct MIME type", () => {
    downloadCsv("employees.csv", [["Name", "Code"], ["Ravi Teja", "EMP001"]]);
    expect(capturedBlob?.type).toBe("text/csv;charset=utf-8;");
  });

  it("triggers a click on a temporary anchor and revokes the object URL", () => {
    downloadCsv("employees.csv", [["Name"], ["Ravi"]]);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-url");
  });

  it("quotes cells and escapes embedded double quotes", async () => {
    downloadCsv("data.csv", [["Say \"hello\"", "plain"]]);
    const text = await capturedBlob!.text();
    expect(text).toBe('"Say ""hello""","plain"');
  });

  it("joins multiple rows with newlines", async () => {
    downloadCsv("data.csv", [["a", "b"], ["c", "d"]]);
    const text = await capturedBlob!.text();
    expect(text).toBe('"a","b"\n"c","d"');
  });

  it("stringifies numeric cells", async () => {
    downloadCsv("data.csv", [["Count", 42]]);
    const text = await capturedBlob!.text();
    expect(text).toBe('"Count","42"');
  });

  it("neutralizes a formula-injection payload end-to-end (e.g. a booby-trapped employee name)", async () => {
    downloadCsv("employees.csv", [["Name", "Code"], ['=HYPERLINK("http://evil.example","x")', "EMP001"]]);
    const text = await capturedBlob!.text();
    expect(text).toBe('"Name","Code"\n"\'=HYPERLINK(""http://evil.example"",""x"")","EMP001"');
  });
});
