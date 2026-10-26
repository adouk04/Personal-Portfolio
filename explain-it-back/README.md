# Explain It Back

A study companion for technical concepts. You explain a concept in your own words. The tool points out where your explanation is wrong, vague, or missing something, then gives you **one** follow-up exercise instead of a pile of answers.

It is Artifact 3 for TCSS 490 ("AI Inside It"): a model does real work every time it runs.

## What the model does, and what the code does

The goal is to keep the model's part small enough that when something goes wrong, you can tell whose fault it was.

| | Model (`claude -p`) | Plain code |
| --- | --- | --- |
| **Before the call** | | Checks the concept and explanation length, wraps the explanation in `<explanation>` tags, and neutralizes any tag the learner types to break out of them. A bad input never costs a model call. |
| **The call** | Reads the explanation, judges it (`solid` / `partial` / `off-track`), names up to 2 strengths and up to 3 gaps with evidence, and writes exactly one exercise. | Runs Claude Code headless with **no tools**, a JSON schema, and a 120 second timeout. |
| **After the call** | | Validates the answer again in code (`src/schema.mjs`): verdict is in the allowed list, at most 3 gaps, text lengths, exactly one exercise object, `targets_gap` points at a real gap, a `solid` verdict has no gaps. On failure it tells the model what was wrong and retries once, then exits with an error. |
| **Output** | | Renders the result, saves the session to `history.jsonl`, and shows trends with `--history`. |

The model never sees the history, never writes files, and has no tools. If the model's answer is rejected twice, nothing is shown and nothing is saved.

What the code **cannot** check: whether the model's judgment is right, and whether the exercise quietly gives the answer away. The prompt forbids it, and the code only enforces shape and size. Read the output with that in mind.

## Run it

Requires Node 18+ and Claude Code (`claude`) signed in. It uses the access you already have for Claude Code; it does not use the paid API. A call costs a few cents of usage.

```bash
# type your explanation, finish with an empty line
node explain.mjs "hash maps"

# from a file, or piped
node explain.mjs "hash maps" --file my-notes.txt
cat my-notes.txt | node explain.mjs "hash maps"

# see exactly what would be sent, without calling the model
node explain.mjs "hash maps" --file my-notes.txt --dry-run

# past sessions, and which concepts you keep coming back to
node explain.mjs --history
```

Options: `--model <name>`, `--no-save`, `--limit <n>` (with `--history`). Set `EXPLAIN_CLAUDE_BIN` to use a different `claude` binary and `EXPLAIN_HISTORY` to move the history file.

## Tests

```bash
node --test test/explain.test.mjs
```

The tests use a fake `claude` (`test/fake-claude.mjs`), so they are free and offline. They cover the validation rules, the retry, timeouts, crashes, non-JSON output, a missing binary, prompt-injection text, and the CLI end to end. They do not test the model's judgment; that was checked by hand (see `LOG.md`).

## Layout

```
explain.mjs        command line entry point
src/prompt.mjs     everything the model is told, plus input checks
src/schema.mjs     the JSON contract and its validator
src/model.mjs      the only file that runs claude; retry logic
src/render.mjs     terminal output
src/history.mjs    local session history (history.jsonl, git-ignored)
test/              tests and the fake claude
LOG.md             plan and changes
```
