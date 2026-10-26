#!/usr/bin/env node
// Explain It Back: explain a concept in your own words, get the gaps pointed
// out, and get one follow-up exercise instead of a pile of answers.
//
//   node explain.mjs "hash maps"            (type your explanation, blank line to finish)
//   node explain.mjs "hash maps" --file my-notes.txt
//   cat my-notes.txt | node explain.mjs "hash maps"
//   node explain.mjs --history
//   node explain.mjs "hash maps" --file my-notes.txt --dry-run   (no model call)

import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { buildUserMessage, checkInputs, SYSTEM_PROMPT } from "./src/prompt.mjs";
import { getFeedback } from "./src/model.mjs";
import { renderFeedback, renderHistory } from "./src/render.mjs";
import { loadSessions, saveSession } from "./src/history.mjs";

const USAGE = `Usage:
  node explain.mjs "<concept>" [--file <path>] [--model <name>] [--no-save] [--dry-run]
  node explain.mjs --history [--limit <n>]

The explanation is read from --file, from piped input, or typed at the prompt
(finish with an empty line).`;

async function readStdin() {
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

async function readTyped() {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  process.stderr.write("Explain it in your own words. Finish with an empty line.\n\n");
  const lines = [];
  for await (const line of rl) {
    if (line.trim() === "" && lines.length > 0) break;
    lines.push(line);
  }
  rl.close();
  return lines.join("\n");
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      allowPositionals: true,
      options: {
        file: { type: "string" },
        model: { type: "string" },
        history: { type: "boolean", default: false },
        limit: { type: "string", default: "10" },
        "no-save": { type: "boolean", default: false },
        "dry-run": { type: "boolean", default: false },
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

  if (values.history) {
    const limit = Math.max(1, Number.parseInt(values.limit, 10) || 10);
    console.log(renderHistory(await loadSessions(), limit));
    return 0;
  }

  const concept = positionals.join(" ");
  if (!concept.trim()) {
    console.error(`Missing concept.\n\n${USAGE}`);
    return 2;
  }

  let explanation;
  if (values.file) {
    try {
      explanation = await readFile(values.file, "utf8");
    } catch (err) {
      console.error(`Could not read ${values.file}: ${err.message}`);
      return 2;
    }
  } else if (!process.stdin.isTTY) {
    explanation = await readStdin();
  } else {
    explanation = await readTyped();
  }

  const inputs = checkInputs(concept, explanation);
  if (!inputs.ok) {
    console.error(inputs.errors.join("\n"));
    return 2;
  }

  const userMessage = buildUserMessage(inputs.concept, inputs.explanation);

  if (values["dry-run"]) {
    console.log("--- system prompt ---\n" + SYSTEM_PROMPT);
    console.log("\n--- message sent to the model ---\n" + userMessage);
    return 0;
  }

  process.stderr.write("Reading your explanation...\n");
  let result;
  try {
    result = await getFeedback(userMessage, { model: values.model });
  } catch (err) {
    console.error(`Could not get feedback: ${err.message}`);
    return 1;
  }

  console.log("\n" + renderFeedback(inputs.concept, result.feedback));

  if (!values["no-save"]) {
    await saveSession({
      at: new Date().toISOString(),
      concept: inputs.concept,
      explanation: inputs.explanation,
      feedback: result.feedback,
      attempts: result.attempts.length,
      cost_usd: result.attempts.reduce((sum, a) => sum + (a.cost || 0), 0),
    });
  }
  return 0;
}

process.exitCode = await main();
