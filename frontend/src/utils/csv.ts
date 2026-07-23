const RISKY_LEADING_CHAR = /^[=+\-@]/;

/**
 * Neutralizes CSV/formula injection (OWASP): a cell whose text begins with
 * =, +, -, or @ is interpreted as a formula by Excel/Sheets when the file is
 * opened, not as literal data. Prefixing it with a leading apostrophe forces
 * spreadsheet apps to treat it as plain text instead. Applies to every
 * exported value — including a literal negative number like `-500` — which
 * is the standard, expected trade-off of this mitigation (it will display as
 * text rather than a right-aligned number), not a bug.
 */
export function sanitizeCsvCell(value: string | number): string {
  const str = String(value);
  return RISKY_LEADING_CHAR.test(str) ? `'${str}` : str;
}

export function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const csv = rows
    .map((r) => r.map((cell) => `"${sanitizeCsvCell(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
