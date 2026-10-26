// The contract between the model and the rest of the program.
//
// The model returns one entry per transaction: an id, a category from a fixed
// list, how sure it is, and a short reason. It never sees or returns amounts.
// Everything it returns is re-checked here in plain code.

export const SPENDING = [
  "Groceries",
  "Dining",
  "Transport",
  "Housing",
  "Utilities",
  "Subscriptions",
  "Shopping",
  "Health",
  "Entertainment",
  "Fees",
  "Other",
];
export const INFLOW = ["Income", "Refunds"];
export const NEUTRAL = ["Transfers"];
export const CATEGORIES = [...SPENDING, ...INFLOW, ...NEUTRAL];
export const CONFIDENCE = ["high", "low"];
export const MAX_REASON = 160;

export const resultsJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["results"],
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "category", "confidence", "reason"],
        properties: {
          id: { type: "integer" },
          category: { type: "string", enum: CATEGORIES },
          confidence: { type: "string", enum: CONFIDENCE },
          reason: { type: "string" },
        },
      },
    },
  },
};

/**
 * Check a model answer against the ids we asked about.
 * Returns { accepted: Map(id -> entry), problems: string[] }.
 * Bad or missing entries are left out so the caller can ask again for just those.
 */
export function validateResults(answer, askedIds) {
  const problems = [];
  const accepted = new Map();
  const asked = new Set(askedIds);

  if (!answer || typeof answer !== "object" || !Array.isArray(answer.results)) {
    return { accepted, problems: ['answer must be an object with a "results" array'] };
  }

  const seen = new Map();
  for (const entry of answer.results) {
    const id = entry && entry.id;
    seen.set(id, (seen.get(id) || 0) + 1);
  }

  for (const entry of answer.results) {
    const id = entry && entry.id;
    if (!Number.isInteger(id) || !asked.has(id)) {
      problems.push(`unknown id ${JSON.stringify(id)}`);
      continue;
    }
    if (seen.get(id) > 1) {
      problems.push(`id ${id} appears more than once`);
      continue;
    }
    if (!CATEGORIES.includes(entry.category)) {
      problems.push(`id ${id}: category ${JSON.stringify(entry.category)} is not in the list`);
      continue;
    }
    if (!CONFIDENCE.includes(entry.confidence)) {
      problems.push(`id ${id}: confidence must be high or low`);
      continue;
    }
    if (typeof entry.reason !== "string" || !entry.reason.trim() || entry.reason.length > MAX_REASON) {
      problems.push(`id ${id}: reason must be 1-${MAX_REASON} characters`);
      continue;
    }
    accepted.set(id, {
      id,
      category: entry.category,
      confidence: entry.confidence,
      reason: entry.reason.trim().replace(/\s+/g, " "),
    });
  }

  for (const id of askedIds) {
    if (!accepted.has(id) && !problems.some((p) => p.includes(`id ${id}`))) {
      problems.push(`id ${id} is missing`);
    }
  }
  return { accepted, problems };
}

/**
 * Rules the model cannot be trusted with, applied in code using the amount.
 * Returns a note when the category does not fit the direction of the money.
 */
export function signProblem(category, cents) {
  if (SPENDING.includes(category) && cents > 0) {
    return `money came in but category is ${category}`;
  }
  if (INFLOW.includes(category) && cents < 0) {
    return `money went out but category is ${category}`;
  }
  return null;
}
