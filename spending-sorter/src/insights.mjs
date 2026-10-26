// Plain-code analysis of the labeled transactions: totals, a weekly pace, and
// rule-based "heads up" flags. No model involved, so every number here can be
// checked by hand.

import { formatCents } from "./csv.mjs";
import { UNSORTED } from "./report.mjs";

const DAY = 86400000;
const dayNum = (s) => Math.floor(Date.parse(`${s}T00:00:00Z`) / DAY);
const dollars = (cents) => Math.round(cents) / 100;

// Bills that arrive monthly, so a "per week" number for them is misleading.
export const FIXED = ["Housing", "Utilities", "Subscriptions"];
const NOT_SPENDING = ["Transfers", "Income", "Refunds"];

function median(nums) {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

export function computeFacts(items) {
  const days = items.map((i) => dayNum(i.date));
  const start = Math.min(...days);
  const end = Math.max(...days);
  const spanDays = end - start + 1;
  const weeks = Math.round((spanDays / 7) * 10) / 10;

  const spending = items.filter((i) => i.cents < 0 && !NOT_SPENDING.includes(i.category));
  const moneyIn = items
    .filter((i) => i.cents > 0 && (i.category === "Income" || i.category === "Refunds"))
    .reduce((s, i) => s + i.cents, 0);
  const spendTotal = -spending.reduce((s, i) => s + i.cents, 0);
  const fixed = -spending.filter((i) => FIXED.includes(i.category)).reduce((s, i) => s + i.cents, 0);
  const everyday = spendTotal - fixed;

  const byCat = new Map();
  for (const i of spending.filter((x) => !FIXED.includes(x.category))) {
    byCat.set(i.category, (byCat.get(i.category) || 0) - i.cents);
  }
  const paceOk = spanDays >= 7;
  const everydayByCategory = [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, cents]) => ({
      category,
      total: dollars(cents),
      weekly: paceOk ? dollars((cents * 7) / spanDays) : null,
    }));

  const flags = [];

  if (spendTotal > moneyIn && moneyIn > 0) {
    flags.push({
      kind: "overspending",
      level: "alert",
      text: `Spending (${formatCents(spendTotal)}) was higher than money in (${formatCents(moneyIn)}) over this period.`,
    });
  }

  // Same description and amount within 3 days: possible double charge.
  const groups = new Map();
  for (const i of spending) {
    const key = `${i.description.toLowerCase()}|${i.cents}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(i);
  }
  for (const list of groups.values()) {
    const sorted = [...list].sort((a, b) => dayNum(a.date) - dayNum(b.date));
    for (let k = 1; k < sorted.length; k++) {
      if (dayNum(sorted[k].date) - dayNum(sorted[k - 1].date) <= 3) {
        flags.push({
          kind: "possible_duplicate",
          level: "alert",
          text: `Possible double charge: ${sorted[k].description} for ${formatCents(-sorted[k].cents)} on ${sorted[k - 1].date} and ${sorted[k].date}.`,
        });
        break;
      }
    }
  }

  const fees = spending.filter((i) => i.category === "Fees");
  if (fees.length > 0) {
    const total = -fees.reduce((s, i) => s + i.cents, 0);
    flags.push({
      kind: "fees",
      level: "notice",
      text: `${fees.length} fee charge${fees.length === 1 ? "" : "s"} totaling ${formatCents(total)}.`,
    });
  }

  const everydayItems = spending.filter((i) => !FIXED.includes(i.category));
  const cutoff = Math.max(10000, 3 * median(everydayItems.map((i) => -i.cents)));
  const large = everydayItems.filter((i) => -i.cents >= cutoff).sort((a, b) => a.cents - b.cents).slice(0, 3);
  for (const i of large) {
    flags.push({
      kind: "large_charge",
      level: "notice",
      text: `Large charge: ${i.description} for ${formatCents(-i.cents)} on ${i.date}.`,
    });
  }

  const unsure = items.filter((i) => i.review).length;
  const unsorted = items.filter((i) => i.category === UNSORTED).length;
  if (unsure > 0) {
    flags.push({
      kind: "unsure_labels",
      level: "notice",
      text: `${unsure} row${unsure === 1 ? " is" : "s are"} marked for review, so category totals may shift${unsorted ? ` (${unsorted} had no label)` : ""}.`,
    });
  }

  return {
    period: { start: items.length ? new Date(start * DAY).toISOString().slice(0, 10) : "", end: new Date(end * DAY).toISOString().slice(0, 10), days: spanDays, weeks },
    money_in: dollars(moneyIn),
    spend: dollars(spendTotal),
    net_excluding_transfers: dollars(moneyIn - spendTotal),
    fixed_bills: dollars(fixed),
    everyday_spend: dollars(everyday),
    weekly_everyday_pace: paceOk ? dollars((everyday * 7) / spanDays) : null,
    everyday_by_category: everydayByCategory,
    flags,
  };
}

const money = (d) => formatCents(Math.round(d * 100));

export function renderInsights(facts) {
  const lines = [];
  if (facts.flags.length > 0) {
    lines.push("Heads up");
    for (const f of facts.flags) lines.push(`  ${f.level === "alert" ? "!" : "-"} ${f.text}`);
    lines.push("");
  }
  lines.push(`Pace (${facts.period.start} to ${facts.period.end}, ${facts.period.weeks} weeks)`);
  lines.push(`  Fixed bills (housing, utilities, subscriptions): ${money(facts.fixed_bills)}`);
  lines.push(`  Everyday spending: ${money(facts.everyday_spend)}`);
  if (facts.weekly_everyday_pace === null) {
    lines.push("  Weekly pace: not shown, the file covers less than a week.");
  } else {
    lines.push(`  A typical week at this pace: about ${money(facts.weekly_everyday_pace)} of everyday spending`);
    for (const c of facts.everyday_by_category.slice(0, 5)) {
      lines.push(`    ${c.category.padEnd(14)}${money(c.weekly).padStart(9)} a week`);
    }
  }
  return lines.join("\n");
}
