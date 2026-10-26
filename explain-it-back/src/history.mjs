// Plain-code bookkeeping: a local record of past sessions so the learner can
// see which concepts keep showing the same gaps. No model involved.

import { appendFile, readFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export function historyPath() {
  return process.env.EXPLAIN_HISTORY || join(here, "..", "history.jsonl");
}

export async function saveSession(entry) {
  const file = historyPath();
  await mkdir(dirname(file), { recursive: true });
  await appendFile(file, JSON.stringify(entry) + "\n", "utf8");
}

export async function loadSessions() {
  let text;
  try {
    text = await readFile(historyPath(), "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
  const sessions = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      sessions.push(JSON.parse(line));
    } catch {
      // A damaged line should not hide the rest of the history.
    }
  }
  return sessions;
}
