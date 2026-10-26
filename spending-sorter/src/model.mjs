// The only file that talks to a model. It runs Claude Code headless
// (`claude -p`), so it uses the access the course already provides and needs
// no API key.

import { spawn } from "node:child_process";
import { resultsJsonSchema, validateResults } from "./schema.mjs";
import { SYSTEM_PROMPT, buildMessage, buildRetryMessage } from "./prompt.mjs";

const DEFAULT_TIMEOUT_MS = 120_000;
export const BATCH_SIZE = 40;

/** Run `claude -p` once. Rejects if the process cannot run; resolves with parsed CLI JSON. */
export function runClaude(message, options = {}) {
  const bin = options.bin || process.env.SORTER_CLAUDE_BIN || "claude";
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const args = [
    "-p",
    "--output-format",
    "json",
    "--json-schema",
    JSON.stringify(resultsJsonSchema),
    "--system-prompt",
    SYSTEM_PROMPT,
    "--tools", // the model gets no tools: it can only read the message and answer
    "",
    "--no-session-persistence",
  ];
  if (options.model) args.push("--model", options.model);

  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(reject, new Error(`model call timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (err) =>
      finish(
        reject,
        err.code === "ENOENT"
          ? new Error(`could not find "${bin}". Install Claude Code or set SORTER_CLAUDE_BIN.`)
          : err,
      ),
    );
    child.on("close", (code) => {
      if (code !== 0) {
        return finish(reject, new Error(`claude exited with code ${code}: ${stderr.trim().slice(0, 300)}`));
      }
      try {
        finish(resolve, JSON.parse(stdout));
      } catch {
        finish(reject, new Error("claude did not return JSON output"));
      }
    });
    child.stdin.end(message);
  });
}

/** Pull the model's answer out of the CLI envelope. */
export function extractAnswer(envelope) {
  if (envelope && envelope.is_error) {
    throw new Error(`model reported an error: ${String(envelope.result).slice(0, 300)}`);
  }
  if (envelope && envelope.structured_output) return envelope.structured_output;
  if (envelope && typeof envelope.result === "string") {
    try {
      return JSON.parse(envelope.result);
    } catch {
      /* fall through */
    }
  }
  return null;
}

/**
 * Label one batch of rows. Entries that fail validation, or are missing, are
 * asked about once more (only those). Anything still unresolved is returned in
 * `unresolved` so the caller can mark it for review instead of guessing.
 * A process failure (no binary, timeout, crash) is not retried; it throws.
 */
export async function labelBatch(rows, options = {}) {
  const labels = new Map();
  const attempts = [];
  let pending = rows;
  let message = buildMessage(rows);

  for (let attempt = 1; attempt <= 2 && pending.length > 0; attempt++) {
    const envelope = await runClaude(message, options);
    const answer = extractAnswer(envelope);
    const { accepted, problems } = validateResults(
      answer,
      pending.map((r) => r.id),
    );
    for (const [id, entry] of accepted) labels.set(id, entry);
    attempts.push({ attempt, asked: pending.length, accepted: accepted.size, cost: envelope.total_cost_usd ?? null, problems });

    pending = pending.filter((r) => !labels.has(r.id));
    if (pending.length > 0) message = buildRetryMessage(pending, problems);
  }
  return { labels, unresolved: pending, attempts };
}

export function chunk(rows, size = BATCH_SIZE) {
  const out = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}
