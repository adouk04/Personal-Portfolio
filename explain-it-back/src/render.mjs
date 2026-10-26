// Turns a validated feedback object into text for the terminal.

const VERDICT_LABEL = {
  solid: "Solid",
  partial: "Partly there",
  "off-track": "Off track",
};

function wrap(text, indent = "  ", width = 78) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = indent;
  for (const w of words) {
    if (line.trim().length > 0 && line.length + w.length + 1 > width) {
      lines.push(line);
      line = indent;
    }
    line += (line.trim().length > 0 ? " " : "") + w;
  }
  if (line.trim().length > 0) lines.push(line);
  return lines.join("\n");
}

export function renderFeedback(concept, feedback) {
  const out = [];
  out.push(`Concept: ${concept}`);
  out.push(`Verdict: ${VERDICT_LABEL[feedback.verdict]}`);

  if (feedback.strengths.length > 0) {
    out.push("", "What you got right");
    for (const s of feedback.strengths) out.push(wrap(`- ${s}`));
  }

  if (feedback.gaps.length > 0) {
    out.push("", "Gaps");
    feedback.gaps.forEach((g, i) => {
      out.push(wrap(`${i + 1}. ${g.topic}`));
      out.push(wrap(`Where: ${g.evidence}`, "     "));
      out.push(wrap(`Why it matters: ${g.why_it_matters}`, "     "));
    });
  }

  const target =
    feedback.exercise.targets_gap >= 0
      ? ` (targets gap ${feedback.exercise.targets_gap + 1})`
      : "";
  out.push("", `Try this next: ${feedback.exercise.kind}${target}`);
  out.push(wrap(feedback.exercise.prompt));
  return out.join("\n");
}

export function renderHistory(sessions, limit) {
  const recent = sessions.slice(-limit);
  if (recent.length === 0) return "No sessions saved yet.";

  const lines = [`Last ${recent.length} session${recent.length === 1 ? "" : "s"}`];
  for (const s of recent) {
    const date = (s.at || "").slice(0, 10);
    const gapTopics = (s.feedback?.gaps || []).map((g) => g.topic).join("; ");
    lines.push(
      `- ${date}  ${s.concept}  [${s.feedback?.verdict}]${gapTopics ? "  gaps: " + gapTopics : ""}`,
    );
  }

  // Repeated concepts are the useful signal: did the verdict improve?
  const byConcept = new Map();
  for (const s of sessions) {
    const key = (s.concept || "").toLowerCase();
    if (!byConcept.has(key)) byConcept.set(key, []);
    byConcept.get(key).push(s.feedback?.verdict);
  }
  const repeats = [...byConcept.entries()].filter(([, v]) => v.length > 1);
  if (repeats.length > 0) {
    lines.push("", "Concepts you have come back to");
    for (const [concept, verdicts] of repeats) {
      lines.push(`- ${concept}: ${verdicts.join(" -> ")}`);
    }
  }
  return lines.join("\n");
}
