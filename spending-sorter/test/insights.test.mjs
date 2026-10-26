import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { computeFacts, renderInsights } from "../src/insights.mjs";
import {
  DISCLAIMER,
  allowedNumbers,
  buildOutlookMessage,
  getOutlook,
  validateOutlook,
} from "../src/outlook.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const FAKE = join(here, "fake-claude.mjs");
chmodSync(FAKE, 0o755);
const CLI = join(here, "..", "sort.mjs");
const SAMPLE = join(here, "..", "sample", "transactions.csv");

let id = 0;
const item = (date, description, dollars, category, review = "") => ({
  id: ++id,
  line: id + 1,
  date,
  description,
  cents: Math.round(dollars * 100),
  category,
  review,
});

// Two weeks of simple data: 280.00 of everyday spending, 1000.00 rent, 2000.00 pay.
const twoWeeks = () => [
  item("2026-10-01", "PAYROLL", 2000, "Income"),
  item("2026-10-01", "RENT", -1000, "Housing"),
  item("2026-10-03", "GROCER", -150, "Groceries"),
  item("2026-10-08", "CAFE", -50, "Dining"),
  item("2026-10-14", "GROCER", -80, "Groceries"),
  item("2026-10-14", "SAVINGS", -300, "Transfers"),
];

// ---- facts and flags (plain code) -----------------------------------------

test("computeFacts: totals, weekly pace, and transfers excluded from spending", () => {
  const f = computeFacts(twoWeeks());
  assert.equal(f.period.days, 14);
  assert.equal(f.period.weeks, 2);
  assert.equal(f.money_in, 2000);
  assert.equal(f.fixed_bills, 1000);
  assert.equal(f.everyday_spend, 280);
  assert.equal(f.spend, 1280);
  assert.equal(f.net_excluding_transfers, 720);
  assert.equal(f.weekly_everyday_pace, 140);
  assert.deepEqual(f.everyday_by_category.map((c) => [c.category, c.total, c.weekly]), [
    ["Groceries", 230, 115],
    ["Dining", 50, 25],
  ]);
  assert.equal(f.flags.length, 0);
});

test("computeFacts: no weekly pace when the file covers less than a week", () => {
  const f = computeFacts([item("2026-10-01", "CAFE", -5, "Dining"), item("2026-10-03", "CAFE", -6, "Dining")]);
  assert.equal(f.weekly_everyday_pace, null);
  assert.match(renderInsights(f), /less than a week/);
});

test("flag: overspending", () => {
  const f = computeFacts([item("2026-10-01", "PAYROLL", 100, "Income"), item("2026-10-02", "RENT", -300, "Housing")]);
  assert.ok(f.flags.some((x) => x.kind === "overspending" && x.level === "alert"));
});

test("flag: possible duplicate charge within 3 days, but not 10 days apart", () => {
  const near = computeFacts([item("2026-10-01", "GYM", -40, "Health"), item("2026-10-03", "GYM", -40, "Health")]);
  assert.ok(near.flags.some((x) => x.kind === "possible_duplicate"));
  const far = computeFacts([item("2026-10-01", "GYM", -40, "Health"), item("2026-10-11", "GYM", -40, "Health")]);
  assert.ok(!far.flags.some((x) => x.kind === "possible_duplicate"));
  const differentAmount = computeFacts([item("2026-10-01", "GYM", -40, "Health"), item("2026-10-02", "GYM", -41, "Health")]);
  assert.ok(!differentAmount.flags.some((x) => x.kind === "possible_duplicate"));
});

test("flag: fees, large charges (not rent), and unsure labels", () => {
  const f = computeFacts([
    item("2026-10-01", "FEE", -8, "Fees"),
    item("2026-10-02", "CAFE", -5, "Dining"),
    item("2026-10-03", "BIG STORE", -250, "Shopping"),
    item("2026-10-04", "RENT", -1500, "Housing"),
    item("2026-10-05", "ODD", -9, "Other", "model unsure"),
  ]);
  const kinds = f.flags.map((x) => x.kind);
  assert.ok(kinds.includes("fees"));
  assert.ok(kinds.includes("unsure_labels"));
  assert.deepEqual(f.flags.filter((x) => x.kind === "large_charge").map((x) => x.text.includes("BIG STORE")), [true]);
});

// ---- the number check and advice boundary (the model's summary) ----------

const facts = () => computeFacts(twoWeeks());
const ok = (summary, extra = {}) => ({
  headline: "Steady spending",
  summary,
  watch: [{ item: "Groceries are the biggest everyday category." }],
  ...extra,
});

test("validateOutlook accepts numbers that are in the facts, including rounded dollars", () => {
  const a = ok("Over 2 weeks you spent about 280 on everyday things, roughly 140 a week, 230 of it on groceries.");
  assert.equal(validateOutlook(a, facts()).ok, true);
  assert.ok(allowedNumbers(facts()).has("140.00"));
});

test("validateOutlook rejects a number the model made up or calculated", () => {
  const a = ok("Groceries were 82 percent of your everyday spending over the 2 weeks, about 140 a week.");
  const r = validateOutlook(a, facts());
  assert.equal(r.ok, false);
  assert.match(r.errors.join(" "), /not in the facts: 82/);
});

test("validateOutlook rejects investing and debt talk", () => {
  for (const word of ["invest", "stocks", "a loan", "crypto", "debt"]) {
    const a = ok(`Over 2 weeks you spent 280, and you could put the rest into ${word} for the future ahead.`);
    assert.equal(validateOutlook(a, facts()).ok, false, word);
  }
});

test("validateOutlook rejects bad shapes and lengths", () => {
  const f = facts();
  assert.equal(validateOutlook(null, f).ok, false);
  assert.equal(validateOutlook(ok("too short"), f).ok, false);
  assert.equal(validateOutlook(ok("x".repeat(701)), f).ok, false);
  assert.equal(validateOutlook({ ...ok("Over 2 weeks you spent about 280 on everyday things."), watch: [] }, f).ok, false);
});

test("the model message contains the facts and no raw transaction rows", () => {
  const msg = buildOutlookMessage(facts());
  assert.match(msg, /^<facts>/);
  assert.ok(!msg.includes("PAYROLL"));
  assert.ok(!msg.includes("SAVINGS"));
});

// ---- model step (fake claude) ---------------------------------------------

function useFake(outlookMode, state) {
  process.env.SORTER_CLAUDE_BIN = FAKE;
  process.env.FAKE_OUTLOOK_MODE = outlookMode;
  if (state) process.env.FAKE_STATE = state;
  else delete process.env.FAKE_STATE;
}
const tmp = () => mkdtempSync(join(tmpdir(), "outlook-"));

test("getOutlook returns a validated summary", async () => {
  useFake("good");
  const r = await getOutlook(facts());
  assert.equal(r.attempts.length, 1);
  assert.match(r.outlook.summary, /Over 2 weeks/);
});

test("getOutlook re-asks once when the first answer invents a number", async () => {
  useFake("invented-then-good", join(tmp(), "state"));
  const r = await getOutlook(facts());
  assert.equal(r.attempts.length, 2);
  assert.match(r.attempts[0].errors.join(" "), /not in the facts/);
});

test("getOutlook gives up after two bad answers, and never accepts advice", async () => {
  useFake("always-invented");
  await assert.rejects(getOutlook(facts()), /failed validation twice/);
  useFake("advice");
  await assert.rejects(getOutlook(facts()), /invest/);
});

test("getOutlook surfaces a crashing model", async () => {
  useFake("crash");
  await assert.rejects(getOutlook(facts()), /exited with code 3/);
});

// ---- the CLI --------------------------------------------------------------

function runCli(args, env = {}) {
  const dir = tmp();
  const r = spawnSync("node", [CLI, ...args], {
    encoding: "utf8",
    env: { ...process.env, SORTER_CLAUDE_BIN: FAKE, FAKE_MODE: "good", FAKE_OUTLOOK_MODE: "good", FAKE_STATE: join(dir, "state"), ...env },
  });
  return { ...r, dir, calls: existsSync(join(dir, "state")) ? Number(readFileSync(join(dir, "state"), "utf8")) : 0 };
}

test("CLI: the heads-up and pace sections appear without --outlook, with one model call", () => {
  const r = runCli([SAMPLE, "--out", join(tmp(), "o.csv")]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Heads up/);
  assert.match(r.stdout, /Large charge: COSTCO/);
  assert.match(r.stdout, /A typical week at this pace/);
  assert.ok(!r.stdout.includes(DISCLAIMER));
  assert.equal(r.calls, 1);
});

test("CLI: --outlook adds the summary and the disclaimer, and makes a second call", () => {
  const r = runCli([SAMPLE, "--out", join(tmp(), "o.csv"), "--outlook"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Spending check/);
  assert.match(r.stdout, /Worth keeping an eye on/);
  assert.ok(r.stdout.includes(DISCLAIMER));
  assert.equal(r.calls, 2);
});

test("CLI: if the summary fails, the sorted file is still written and the exit code is 3", () => {
  const out = join(tmp(), "o.csv");
  const r = runCli([SAMPLE, "--out", out, "--outlook"], { FAKE_OUTLOOK_MODE: "always-invented" });
  assert.equal(r.status, 3);
  assert.match(r.stderr, /Could not produce the summary/);
  assert.ok(existsSync(out));
  assert.ok(!r.stdout.includes(DISCLAIMER));
});

test("CLI: --dry-run --outlook explains the second message and calls no model", () => {
  const r = runCli([SAMPLE, "--dry-run", "--outlook"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /second message with category totals/);
  assert.equal(r.calls, 0);
});
