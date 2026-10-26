#!/usr/bin/env node
// A stand-in for `claude -p` used by the tests. FAKE_MODE picks the behavior.
// FAKE_STATE is a file used to count calls so a mode can change on call 2.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const mode = process.env.FAKE_MODE || "good";
const stateFile = process.env.FAKE_STATE;
let calls = 1;
if (stateFile) {
  calls = (existsSync(stateFile) ? Number(readFileSync(stateFile, "utf8")) : 0) + 1;
  writeFileSync(stateFile, String(calls));
}

let stdin = "";
for await (const chunk of process.stdin) stdin += chunk;
if (process.env.FAKE_CAPTURE) writeFileSync(process.env.FAKE_CAPTURE, stdin);

const asked = stdin
  .split("\n")
  .filter((l) => l.startsWith('{"id"'))
  .map((l) => JSON.parse(l));

function label(desc) {
  const d = desc.toUpperCase();
  if (d.includes("PAYROLL")) return "Income";
  if (d.includes("RETURN")) return "Refunds";
  if (d.includes("RENT")) return "Housing";
  if (d.includes("TRANSFER") || d.includes("PAYMENT THANK")) return "Transfers";
  if (d.includes("NETFLIX") || d.includes("SPOTIFY")) return "Subscriptions";
  if (d.includes("COFFEE") || d.includes("CHIPOTLE") || d.includes("DOORDASH")) return "Dining";
  if (d.includes("TRADER") || d.includes("SAFEWAY") || d.includes("COSTCO")) return "Groceries";
  return "Other";
}
const entry = (a, extra = {}) => ({
  id: a.id,
  category: label(a.description),
  confidence: a.description.includes("XYZ") ? "low" : "high",
  reason: "keyword in description",
  ...extra,
});
const envelope = (results) =>
  JSON.stringify({ is_error: false, total_cost_usd: 0.01, structured_output: { results } });

if (mode === "good") {
  console.log(envelope(asked.map((a) => entry(a))));
} else if (mode === "drop-then-good") {
  // First call leaves out the last id; the retry only asks about that one.
  console.log(envelope(calls === 1 ? asked.slice(0, -1).map((a) => entry(a)) : asked.map((a) => entry(a))));
} else if (mode === "bad-category") {
  console.log(envelope(asked.map((a, i) => entry(a, i === 0 ? { category: "Gambling" } : {}))));
} else if (mode === "duplicate") {
  console.log(envelope([...asked.map((a) => entry(a)), entry(asked[0])]));
} else if (mode === "extra-id") {
  console.log(envelope([...asked.map((a) => entry(a)), { id: 9999, category: "Other", confidence: "high", reason: "x" }]));
} else if (mode === "all-income") {
  console.log(envelope(asked.map((a) => entry(a, { category: "Income" }))));
} else if (mode === "not-json") {
  console.log("sorry, I cannot do that");
} else if (mode === "model-error") {
  console.log(JSON.stringify({ is_error: true, result: "rate limited" }));
} else if (mode === "crash") {
  console.error("boom");
  process.exit(3);
} else if (mode === "hang") {
  setTimeout(() => {}, 60_000);
} else if (mode === "garbage-answer") {
  console.log(JSON.stringify({ is_error: false, structured_output: { nope: true } }));
}
