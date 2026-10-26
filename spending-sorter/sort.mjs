#!/usr/bin/env node
// Spending Sorter: label a bank export by category. The model only labels
// descriptions. Plain code reads the file, does all the money math, checks the
// labels, and writes the result.
//
//   node sort.mjs sample/transactions.csv
//   node sort.mjs my-export.csv --out sorted.csv
//   node sort.mjs my-export.csv --dry-run     (shows exactly what would be sent; no model call)
//   node sort.mjs my-export.csv --outlook     (adds a plain-English summary; one more model call)

import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { readTransactions } from "./src/csv.mjs";
import { SYSTEM_PROMPT, buildMessage } from "./src/prompt.mjs";
import { chunk, labelBatch } from "./src/model.mjs";
import { computeFacts, renderInsights } from "./src/insights.mjs";
import { getOutlook, renderOutlook } from "./src/outlook.mjs";
import { applyLabels, renderSummary, summarize, toOutputCsv, verifyOutput } from "./src/report.mjs";

const USAGE = `Usage:
  node sort.mjs <transactions.csv> [--out <file.csv>] [--model <name>] [--outlook] [--dry-run]

The CSV needs date (YYYY-MM-DD), description and amount columns. Negative
amounts are money out. Only the descriptions are sent to the model, unless you
add --outlook, which also sends category totals and flags (not raw rows).`;

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      allowPositionals: true,
      options: {
        out: { type: "string" },
        model: { type: "string" },
        "dry-run": { type: "boolean", default: false },
        outlook: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
    });
  } catch (err) {
    console.error(`${err.message}\n\n${USAGE}`);
    return 2;
  }
  const { values, positionals } = parsed;
  if (values.help) {
    console.log(USAGE);
    return 0;
  }
  if (positionals.length !== 1) {
    console.error(`Give exactly one CSV file.\n\n${USAGE}`);
    return 2;
  }
  const inputPath = positionals[0];

  let text;
  try {
    text = await readFile(inputPath, "utf8");
  } catch (err) {
    console.error(`Could not read ${inputPath}: ${err.message}`);
    return 2;
  }

  let { rows, problems } = readTransactions(text);
  if (problems.length > 0) {
    console.error(`Skipped ${problems.length} problem${problems.length === 1 ? "" : "s"} in ${inputPath}:`);
    for (const p of problems) console.error(`  ${p}`);
  }
  if (rows.length === 0) {
    console.error("No usable transactions, nothing to do.");
    return 2;
  }

  if (values["dry-run"]) {
    console.log("--- system prompt ---\n" + SYSTEM_PROMPT);
    console.log(`\n--- what the model would receive (${rows.length} rows; no amounts, no dates) ---`);
    for (const batch of chunk(rows)) console.log(buildMessage(batch) + "\n");
    if (values.outlook) {
      console.log("--outlook would then send a second message with category totals and flags computed from the labeled data (no raw rows).");
    }
    return 0;
  }

  const labels = new Map();
  const unresolved = [];
  let cost = 0;
  const batches = chunk(rows);
  for (const [i, batch] of batches.entries()) {
    process.stderr.write(`Labeling batch ${i + 1} of ${batches.length} (${batch.length} rows)...\n`);
    try {
      const result = await labelBatch(batch, { model: values.model });
      for (const [id, entry] of result.labels) labels.set(id, entry);
      unresolved.push(...result.unresolved);
      cost += result.attempts.reduce((s, a) => s + (a.cost || 0), 0);
    } catch (err) {
      console.error(`Could not reach the model: ${err.message}`);
      return 1;
    }
  }

  const items = applyLabels(rows, labels);
  const summary = summarize(items);
  console.log("\n" + renderSummary(items, summary));
  const facts = computeFacts(items);
  console.log("\n" + renderInsights(facts));

  const outPath = values.out || inputPath.replace(/(\.csv)?$/i, ".sorted.csv");
  const csv = toOutputCsv(items);
  const bad = verifyOutput(csv, items);
  if (bad) {
    console.error(`\nNot writing ${outPath}: ${bad}`);
    return 1;
  }
  await writeFile(outPath, csv, "utf8");
  console.log(`\nWrote ${outPath}${cost ? ` (model cost about $${cost.toFixed(2)})` : ""}`);
  if (unresolved.length > 0) {
    console.log(`${unresolved.length} row(s) got no usable label and are marked ${"Unsorted"}.`);
  }

  if (values.outlook) {
    process.stderr.write("Writing the summary...\n");
    try {
      const { outlook } = await getOutlook(facts, { model: values.model });
      console.log("\n" + renderOutlook(outlook));
    } catch (err) {
      console.error(`\nCould not produce the summary: ${err.message}\nThe sorted file and the numbers above are still good.`);
      return 3;
    }
  }
  return 0;
}

process.exitCode = await main();
