// The only file that talks to a model. It runs Claude Code headless
// (`claude -p`), so it uses the access the course already provides and needs
// no API key.
//
// Everything that comes back is treated as untrusted until validateFeedback()
// has checked it.

import { spawn } from "node:child_process";
import {
  feedbackJsonSchema,
  validateFeedback,
} from "./schema.mjs";
import { SYSTEM_PROMPT, buildRetryMessage } from "./prompt.mjs";

const DEFAULT_TIMEOUT_MS = 120_000;

/** Run `claude -p` once. Resolves with the parsed JSON the CLI prints. */
export function runClaude(userMessage, options = {}) {
  const bin = options.bin || process.env.EXPLAIN_CLAUDE_BIN || "claude";
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  const args = [
    "-p",
    "--output-format",
    "json",
    "--json-schema",
    JSON.stringify(feedbackJsonSchema),
    "--system-prompt",
    SYSTEM_PROMPT,
    // The model gets no tools: it can only read the message and answer.
    "--tools",
    "",
    "--no-session-persistence",
  ];
  if (options.model) args.push("--model", options.model);

  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(new Error(`model call timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(
        err.code === "ENOENT"
          ? new Error(
              `could not find "${bin}". Install Claude Code or set EXPLAIN_CLAUDE_BIN.`,
            )
          : err,
      );
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) {
        return reject(
          new Error(`claude exited with code ${code}: ${stderr.trim().slice(0, 300)}`),
        );
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error("claude did not return JSON output"));
      }
    });

    child.stdin.end(userMessage);
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
      throw new Error("model answer was not valid JSON");
    }
  }
  throw new Error("model returned no answer");
}

/**
 * Ask the model for feedback. If the answer breaks the contract, tell the
 * model what was wrong and try once more. After that, give up loudly.
 */
export async function getFeedback(userMessage, options = {}) {
  const attempts = [];
  let message = userMessage;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const envelope = await runClaude(message, options);
    let verdict;
    try {
      verdict = validateFeedback(extractAnswer(envelope));
    } catch (err) {
      verdict = { ok: false, errors: [err.message], value: null };
    }
    attempts.push({ attempt, cost: envelope.total_cost_usd ?? null, errors: verdict.errors });

    if (verdict.ok) {
      return { feedback: verdict.value, attempts };
    }
    message = buildRetryMessage(userMessage, verdict.errors);
  }

  const last = attempts[attempts.length - 1];
  const err = new Error(
    `model answer failed validation twice: ${last.errors.join("; ")}`,
  );
  err.attempts = attempts;
  throw err;
}
