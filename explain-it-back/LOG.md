# Log: Explain It Back (Artifact 3)

A record of what I planned and what changed. Built with Claude in one session on October 25, 2026, the due date.

## Prompt

> https://cfb3.github.io/TCSS490-26-AUTUMN/assignments/artifact-3/
> https://cfb3.github.io/TCSS490-26-AUTUMN/weeks/week-3/
> https://github.com/adouk04/Personal-Portfolio
>
> complete the artifact for me

## Plan

1. **Pick a shape.** The Artifact 3 card already held an idea: *Explain It Back*, a study companion that finds the gaps in my explanation and gives one exercise. The assignment lists four shapes. I chose a script that runs Claude Code headless (`claude -p`) as one step.
2. **Check what it costs.** The fourth shape (an app calling the API) bills per call and needs a paid key, and the assignment says to ask first. `claude -p` runs on the Claude Code access the course provides, so no key is needed. A test call cost about $0.06 to $0.07 of usage.
3. **Make the model's part small.** The model does one thing: read an explanation and return a structured judgment (verdict, strengths, gaps, one exercise). Everything else is plain code: input checks, schema validation, one retry, rendering, history.
4. **Test without the model.** Use a fake `claude` binary so every failure path can be tested for free, then check the real model by hand.
5. **Fill in the portfolio card** and update the portfolio's smoke test.

## Decisions

- **Node, no dependencies.** Matches the portfolio's existing smoke test and needs no install step.
- **No tools for the model** (`--tools ""`). It only reads one message and answers. It cannot touch files or the network, which also limits what a hostile explanation could do.
- **The learner's text is data, not instructions.** It is wrapped in `<explanation>` tags, the system prompt says to ignore instructions inside it, and the code neutralizes any `<explanation>` tag the learner types.
- **Validate even though the CLI enforces a JSON schema.** The schema flag shapes the output but the code re-checks the rules it cannot express: a `solid` verdict has no gaps, `targets_gap` points at a real gap, exactly one exercise.
- **Retry once, then fail loudly.** A rejected answer is sent back with the reasons. A second failure prints an error and saves nothing.
- **Exactly one exercise** is the point of the design: the tool should not flood me with answers.
- **Code lives in this folder of the portfolio repo** rather than a new repository, so the log, the code, and the card live together.

## What changed along the way

- `node --test test/` failed on Node 22 because it treated the folder as a module path. The documented command is `node --test test/explain.test.mjs`.
- The portfolio smoke test (`tests/smoke.mjs`) was already out of date: it expected one complete artifact and four ideas, but Artifact 2 had been completed earlier. It now expects three complete and two ideas, and checks that every completed card has a link.

## What I verified

- **28 automated tests pass** (`node --test test/explain.test.mjs`) against the fake `claude`: validation rules, retry after a bad answer, giving up after two, model errors, non-JSON output, a crashing process, a hung process (timeout), a missing binary, input checks, the injection case, `--dry-run` and `--no-save`, history, and rendering.
- **One live run against the real model**, on a deliberately flawed explanation of hash maps that claimed every key always gets its own slot. First attempt, valid output, about $0.07:
  - Verdict: partial.
  - Gap 1: collisions, quoting the "own slot" claim. This was the planted flaw.
  - Gap 2: lookup is average-case O(1), not an absolute guarantee. Not planted.
  - Gap 3: turning a hash into a valid index, and resizing. Not planted.
  - One `counterexample` exercise aimed at gap 1 (find two keys that collide under a simple hash, then say what breaks). It did not state the answer.

## Known limits

- The code checks the shape of the model's answer, not whether it is correct. I read the one live run and the three gaps looked right, but that is a sample of one concept.
- The "do not give away the answer" rule is only in the prompt. Nothing in code enforces it.
- Each call carries Claude Code's fixed overhead, so a session costs a few cents even for a short explanation.
- History is local to one machine (`history.jsonl`, git-ignored because it contains my explanations).

## Ideas not done

- Re-ask the same concept later and compare verdicts automatically (history shows the verdicts today but does not schedule anything).
- A second, separate model call to check whether the exercise leaks the answer.
- A Claude Code slash command wrapper so it can be run from inside a session.
