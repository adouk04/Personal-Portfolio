// Plain-code CSV handling and money math. No model involved.
// Money is kept in integer cents so totals never pick up floating point error.

/** Parse CSV text into an array of rows (arrays of strings). Handles quotes. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  if (inQuotes) throw new Error("CSV has an unclosed quote");
  return rows;
}

export function toCsv(rows) {
  const cell = (v) => {
    const s = String(v ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(cell).join(",")).join("\n") + "\n";
}

/** "-1,234.50" or "$12.3" -> integer cents, or null if it is not a plain amount. */
export function parseCents(text) {
  const s = String(text).trim().replace(/[$,\s]/g, "");
  const m = /^([-+]?)(\d+)(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const cents = Number(m[2]) * 100 + Number((m[3] || "").padEnd(2, "0") || 0);
  if (!Number.isSafeInteger(cents)) return null;
  return m[1] === "-" ? -cents : cents;
}

export function formatCents(cents, { plus = false } = {}) {
  const sign = cents < 0 ? "-" : plus && cents > 0 ? "+" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100).toLocaleString("en-US");
  return `${sign}${whole}.${String(abs % 100).padStart(2, "0")}`;
}

function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export const MAX_ROWS = 500;
export const MAX_DESCRIPTION = 200;

/**
 * Turn CSV text into validated transactions. Needs columns date, description,
 * amount (any order, any case). Negative amounts are money out.
 * Returns { rows, problems } and never throws on a bad row.
 */
export function readTransactions(text) {
  const table = parseCsv(text);
  const problems = [];
  if (table.length === 0) return { rows: [], problems: ["The file is empty."] };

  const header = table[0].map((h) => h.trim().toLowerCase());
  const col = Object.fromEntries(["date", "description", "amount"].map((n) => [n, header.indexOf(n)]));
  const missing = Object.entries(col).filter(([, i]) => i < 0).map(([n]) => n);
  if (missing.length > 0) {
    return {
      rows: [],
      problems: [`Header must have date, description and amount columns (missing: ${missing.join(", ")}).`],
    };
  }

  const rows = [];
  for (let i = 1; i < table.length; i++) {
    const line = i + 1;
    const r = table[i];
    const date = (r[col.date] ?? "").trim();
    const description = (r[col.description] ?? "").trim().replace(/\s+/g, " ");
    const amountText = (r[col.amount] ?? "").trim();
    const cents = parseCents(amountText);
    const bad = [];
    if (!validDate(date)) bad.push(`date "${date}" is not YYYY-MM-DD`);
    if (!description) bad.push("description is empty");
    if (description.length > MAX_DESCRIPTION) bad.push(`description is over ${MAX_DESCRIPTION} characters`);
    if (cents === null) bad.push(`amount "${amountText}" is not a number`);
    else if (cents === 0) bad.push("amount is zero");
    if (bad.length > 0) problems.push(`Line ${line}: ${bad.join("; ")}.`);
    else rows.push({ id: rows.length + 1, line, date, description, cents });
  }

  if (rows.length > MAX_ROWS) {
    return { rows: [], problems: [`Too many rows (${rows.length}). The limit is ${MAX_ROWS}.`] };
  }
  return { rows, problems };
}
