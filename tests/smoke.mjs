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
  [(data.match(/status: "Complete"/g) || []).length === 3, "three artifacts are currently complete"],
  [(data.match(/status: "Idea"/g) || []).length === 2, "two placeholder ideas remain"],
  [
    (data.match(/status: "Complete"[\s\S]*?url: "https:\/\/[^"]+"/g) || []).length === 3,
    "every completed artifact links to its repository",
  ],
  [
    /title: "Explain It Back"[\s\S]*?explain-it-back/.test(data),
    "Artifact 3 card links to the explain-it-back folder",
  ],
  [
    (() => {
      const card = data.split('number: "03"')[1]?.split('number: "04"')[0] ?? "";
      return card.includes('status: "Complete"') && card.includes('reflectionLabel: "What I learned"');
    })(),
    "Artifact 3 is complete and has a finished reflection",
  ],
];

let failed = false;
for (const [passed, message] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${message}`);
  failed ||= !passed;
}

if (failed) process.exit(1);
