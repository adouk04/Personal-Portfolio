#!/usr/bin/env node
// A stand-in for `claude -p` used by the tests. FAKE_MODE picks the behavior.
// FAKE_STATE is a file used to count calls so a mode can change on call 2.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const mode = process.env.FAKE_MODE || "good";
const stateFile = process.env.FAKE_STATE;

let calls = 0;
if (stateFile) {
  calls = existsSync(stateFile) ? Number(readFileSync(stateFile, "utf8")) : 0;
  calls += 1;
  writeFileSync(stateFile, String(calls));
}

let stdin = "";
for await (const chunk of process.stdin) stdin += chunk;
if (process.env.FAKE_CAPTURE) writeFileSync(process.env.FAKE_CAPTURE, stdin);
if (process.env.FAKE_ARGS) writeFileSync(process.env.FAKE_ARGS, JSON.stringify(process.argv.slice(2)));

const good = {
  verdict: "partial",
  strengths: ["You correctly said a hash function turns a key into an index."],
  gaps: [
    {
      topic: "Collisions",
      evidence: "You said every key gets its own slot.",
      why_it_matters: "Different keys can map to the same index, so lookups need a plan for that.",
    },
  ],
  exercise: {
    kind: "predict",
    prompt: "Two keys hash to the same index in a table of size 8. Describe what happens when you insert both, then look up the second one.",
    targets_gap: 0,
  },
};

const envelope = (answer) =>
  JSON.stringify({ is_error: false, total_cost_usd: 0.01, structured_output: answer });

if (mode === "good") {
  console.log(envelope(good));
} else if (mode === "bad-then-good") {
  console.log(envelope(calls === 1 ? { ...good, exercise: [good.exercise, good.exercise] } : good));
} else if (mode === "always-bad") {
  console.log(envelope({ ...good, verdict: "great" }));
} else if (mode === "not-json") {
  console.log("sorry, I cannot do that");
} else if (mode === "model-error") {
  console.log(JSON.stringify({ is_error: true, result: "rate limited" }));
} else if (mode === "crash") {
  console.error("boom");
  process.exit(3);
} else if (mode === "hang") {
  setTimeout(() => {}, 60_000);
} else if (mode === "result-string") {
  console.log(JSON.stringify({ is_error: false, result: JSON.stringify(good) }));
}
