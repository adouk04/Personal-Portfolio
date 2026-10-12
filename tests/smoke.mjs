import { readFile } from "node:fs/promises";

const [html, css, data] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8"),
  readFile(new URL("../site-data.js", import.meta.url), "utf8"),
]);

const checks = [
  [html.includes('id="artifact-list"'), "artifact list mount exists"],
  [html.includes('id="artifact-template"'), "artifact template exists"],
  [html.includes('class="skip-link"'), "skip link exists"],
  [css.includes("prefers-reduced-motion"), "reduced-motion styles exist"],
  [(data.match(/number: "0[1-5]"/g) || []).length === 5, "exactly five artifact records exist"],
  [(data.match(/status: "Complete"/g) || []).length === 1, "one artifact is currently complete"],
  [(data.match(/status: "Idea"/g) || []).length === 4, "four placeholder ideas exist"],
];

let failed = false;
for (const [passed, message] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${message}`);
  failed ||= !passed;
}

if (failed) process.exit(1);
