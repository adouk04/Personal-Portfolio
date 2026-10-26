// The contract between the model and the rest of the program.
//
// The model is asked to return JSON in this shape. The model is never trusted
// to follow the shape: validateFeedback() checks everything again in plain
// code, so a bad answer is caught here instead of showing up as a confusing
// bug further down.

export const LIMITS = {
  maxStrengths: 2,
  maxGaps: 3,
  maxField: 400,
  exerciseMin: 20,
  exerciseMax: 600,
};

export const VERDICTS = ["solid", "partial", "off-track"];
export const EXERCISE_KINDS = [
  "predict",
  "trace",
  "compare",
  "explain-smaller",
  "counterexample",
];

// Sent to `claude -p --json-schema`. Kept simple on purpose.
export const feedbackJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "strengths", "gaps", "exercise"],
  properties: {
    verdict: { type: "string", enum: VERDICTS },
    strengths: {
      type: "array",
      maxItems: LIMITS.maxStrengths,
      items: { type: "string" },
    },
    gaps: {
      type: "array",
      maxItems: LIMITS.maxGaps,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["topic", "evidence", "why_it_matters"],
        properties: {
          topic: { type: "string" },
          evidence: { type: "string" },
          why_it_matters: { type: "string" },
        },
      },
    },
    exercise: {
      type: "object",
      additionalProperties: false,
      required: ["kind", "prompt", "targets_gap"],
      properties: {
        kind: { type: "string", enum: EXERCISE_KINDS },
        prompt: { type: "string" },
        targets_gap: { type: "integer" },
      },
    },
  },
};

const isText = (v) => typeof v === "string" && v.trim().length > 0;
const clean = (v) => v.trim().replace(/\s+\n/g, "\n");

/**
 * Check a parsed model answer. Returns { ok, errors, value }.
 * `value` is a normalized copy that only contains the fields we know about.
 */
export function validateFeedback(raw) {
  const errors = [];
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: ["answer is not a JSON object"], value: null };
  }

  if (!VERDICTS.includes(raw.verdict)) {
    errors.push(`verdict must be one of ${VERDICTS.join(", ")}`);
  }

  const strengths = Array.isArray(raw.strengths) ? raw.strengths : null;
  if (!strengths) {
    errors.push("strengths must be an array");
  } else {
    if (strengths.length > LIMITS.maxStrengths) {
      errors.push(`at most ${LIMITS.maxStrengths} strengths allowed`);
    }
    strengths.forEach((s, i) => {
      if (!isText(s) || s.length > LIMITS.maxField) {
        errors.push(`strengths[${i}] must be 1-${LIMITS.maxField} characters`);
      }
    });
  }

  const gaps = Array.isArray(raw.gaps) ? raw.gaps : null;
  if (!gaps) {
    errors.push("gaps must be an array");
  } else {
    if (gaps.length > LIMITS.maxGaps) {
      errors.push(`at most ${LIMITS.maxGaps} gaps allowed`);
    }
    gaps.forEach((g, i) => {
      for (const key of ["topic", "evidence", "why_it_matters"]) {
        if (!g || !isText(g[key]) || g[key].length > LIMITS.maxField) {
          errors.push(`gaps[${i}].${key} must be 1-${LIMITS.maxField} characters`);
        }
      }
    });
    if (raw.verdict === "solid" && gaps.length > 0) {
      errors.push('verdict "solid" cannot list gaps');
    }
    if ((raw.verdict === "partial" || raw.verdict === "off-track") && gaps.length === 0) {
      errors.push(`verdict "${raw.verdict}" must list at least one gap`);
    }
  }

  const ex = raw.exercise;
  if (ex === null || typeof ex !== "object" || Array.isArray(ex)) {
    errors.push("exercise must be exactly one object, not a list");
  } else {
    if (!EXERCISE_KINDS.includes(ex.kind)) {
      errors.push(`exercise.kind must be one of ${EXERCISE_KINDS.join(", ")}`);
    }
    if (
      !isText(ex.prompt) ||
      ex.prompt.trim().length < LIMITS.exerciseMin ||
      ex.prompt.length > LIMITS.exerciseMax
    ) {
      errors.push(
        `exercise.prompt must be ${LIMITS.exerciseMin}-${LIMITS.exerciseMax} characters`,
      );
    }
    if (!Number.isInteger(ex.targets_gap)) {
      errors.push("exercise.targets_gap must be an integer");
    } else if (gaps) {
      if (gaps.length === 0 && ex.targets_gap !== -1) {
        errors.push("exercise.targets_gap must be -1 when there are no gaps");
      }
      if (gaps.length > 0 && (ex.targets_gap < 0 || ex.targets_gap >= gaps.length)) {
        errors.push("exercise.targets_gap must point at one of the gaps");
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors, value: null };

  return {
    ok: true,
    errors: [],
    value: {
      verdict: raw.verdict,
      strengths: strengths.map(clean),
      gaps: gaps.map((g) => ({
        topic: clean(g.topic),
        evidence: clean(g.evidence),
        why_it_matters: clean(g.why_it_matters),
      })),
      exercise: {
        kind: ex.kind,
        prompt: clean(ex.prompt),
        targets_gap: ex.targets_gap,
      },
    },
  };
}
