// Plain-code results: merge labels with the original rows, apply the rules the
// model is not trusted with, compute every total from the original cents, and
// write the output file.

import { formatCents, parseCsv, parseCents, toCsv } from "./csv.mjs";
import { signProblem } from "./schema.mjs";

export const UNSORTED = "Unsorted";

/** Combine rows and labels. Every input row appears exactly once in the output. */
export function applyLabels(rows, labels) {
  return rows.map((r) => {
    const label = labels.get(r.id);
    if (!label) {
      return { ...r, category: UNSORTED, confidence: "low", reason: "model gave no usable label", review: "no label" };
    }
    const sign = signProblem(label.category, r.cents);
    const reasons = [];
    if (label.confidence === "low") reasons.push("model unsure");
    if (sign) reasons.push(sign);
    return {
      ...r,
      category: label.category,
      confidence: label.confidence,
      reason: label.reason,
      review: reasons.join("; "),
    };
  });
}

export function summarize(items) {
  const byCategory = new Map();
  for (const it of items) {
    const cur = byCategory.get(it.category) || { count: 0, cents: 0 };
    cur.count += 1;
    cur.cents += it.cents;
    byCategory.set(it.category, cur);
  }
  const inCents = items.filter((i) => i.cents > 0).reduce((s, i) => s + i.cents, 0);
  const outCents = items.filter((i) => i.cents < 0).reduce((s, i) => s + i.cents, 0);
  const categorySum = [...byCategory.values()].reduce((s, c) => s + c.cents, 0);
  const inputSum = items.reduce((s, i) => s + i.cents, 0);
  return {
    byCategory,
    inCents,
    outCents,
    net: inputSum,
    reconciles: categorySum === inputSum,
    review: items.filter((i) => i.review),
  };
}

export function renderSummary(items, summary) {
  const pad = (s, n) => String(s).padEnd(n);
  const padL = (s, n) => String(s).padStart(n);
  const lines = [`${items.length} transactions`, ""];
  const cats = [...summary.byCategory.entries()].sort((a, b) => Math.abs(b[1].cents) - Math.abs(a[1].cents));
  lines.push(`${pad("Category", 16)}${padL("Count", 6)}${padL("Total", 13)}`);
  for (const [name, c] of cats) {
    lines.push(`${pad(name, 16)}${padL(c.count, 6)}${padL(formatCents(c.cents), 13)}`);
  }
  lines.push(
    "",
    `Money in   ${padL(formatCents(summary.inCents, { plus: true }), 12)}`,
    `Money out  ${padL(formatCents(summary.outCents), 12)}`,
    `Net (all rows, incl. transfers) ${padL(formatCents(summary.net, { plus: true }), 10)}`,
    "",
    summary.reconciles
      ? "Check: category totals add up to the file total."
      : "WARNING: category totals do not add up to the file total.",
  );
  if (summary.review.length > 0) {
    lines.push("", `Needs review (${summary.review.length})`);
    for (const r of summary.review) {
      lines.push(`  line ${r.line}  ${r.date}  ${formatCents(r.cents)}  ${r.description}`);
      lines.push(`      ${r.category} - ${r.review}`);
    }
  }
  return lines.join("\n");
}

export function toOutputCsv(items) {
  const header = ["date", "description", "amount", "category", "confidence", "needs_review", "reason"];
  const rows = items.map((i) => [
    i.date,
    i.description,
    formatCents(i.cents).replace(/,/g, ""),
    i.category,
    i.confidence,
    i.review,
    i.reason,
  ]);
  return toCsv([header, ...rows]);
}

/** Re-read the file we wrote and confirm nothing was lost or changed in the money. */
export function verifyOutput(csvText, items) {
  const table = parseCsv(csvText).slice(1);
  if (table.length !== items.length) {
    return `output has ${table.length} rows but input had ${items.length}`;
  }
  const outSum = table.reduce((s, r) => s + (parseCents(r[2]) ?? NaN), 0);
  const inSum = items.reduce((s, i) => s + i.cents, 0);
  if (outSum !== inSum) return `output total ${outSum} does not match input total ${inSum}`;
  return null;
}
