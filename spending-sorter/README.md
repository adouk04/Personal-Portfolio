# Spending Sorter

Sorts a bank export into spending categories. A model labels each transaction from its description. Plain code does everything else: reads the file, checks the labels, does all the money math, and writes the result.

It is Artifact 3 for TCSS 490 ("AI Inside It"): a model does real work every time it runs.

## What the model does, and what the code does

The goal is to keep the model's part small enough that when something goes wrong, you can tell whose fault it was.

| | Model (`claude -p`) | Plain code |
| --- | --- | --- |
| **Reading the file** | | Parses the CSV, keeps money as integer cents, and skips bad rows (bad date, empty description, non-numeric or zero amount) with their line numbers. |
| **What the model sees** | Only an id and a description for each row. **Never amounts or dates.** | Builds that message. Descriptions are treated as data, and any `<transactions>` tag inside one is neutralized. |
| **The call** | Picks one category per id from a fixed list, says `high` or `low` confidence, and gives a one-line reason. | Runs Claude Code headless with **no tools**, a JSON schema, and a 120 second timeout, 40 rows per call. |
| **After the call** | | Checks every entry: known id, no duplicates, category is in the list, confidence is high or low, reason is present. Asks again for only the bad or missing ids, once. Anything still unresolved is written as `Unsorted` and flagged, never guessed. |
| **Rules the model is not trusted with** | | A spending category on money that came in, or `Income`/`Refunds` on money that went out, is flagged for review using the real amount. |
| **Totals** | | Computed from the original cents. A wrong label can move a row between categories but cannot change the file total. The output file is re-read and checked for the same row count and total before it is kept. |

What the code **cannot** check: whether a label is *right*. "COSTCO" as Groceries is a judgment. The model's `low` confidence is the signal for the ones it is unsure about, and those show up under "Needs review." Everything marked `high` is trusted more than it has earned, so skim the output file.

## Privacy

The transaction descriptions in your file are sent to Claude. Amounts and dates are not. If a description contains something private (a name, an account number), remove it first. `--dry-run` shows exactly what would be sent.

## Run it

Needs Node 18+ and Claude Code (`claude`) signed in. It uses the access you already have for Claude Code; it does not use the paid API. A run costs a few cents of usage.

```bash
node sort.mjs sample/transactions.csv                  # writes sample/transactions.sorted.csv
node sort.mjs my-export.csv --out sorted.csv
node sort.mjs my-export.csv --dry-run                  # shows what would be sent; no model call
```

The CSV needs `date` (YYYY-MM-DD), `description`, and `amount` columns. Negative amounts are money out. Other columns are ignored. Options: `--out`, `--model`. Set `SORTER_CLAUDE_BIN` to use a different `claude` binary.

The output file has `date, description, amount, category, confidence, needs_review, reason`.

`sample/transactions.csv` is made-up data with some deliberately tricky rows: a refund, a transfer, an unfamiliar merchant, a text-message-style Venmo payment, two malformed rows, and a description that tries to give the model instructions.

## Tests

```bash
node --test test/sorter.test.mjs
```

29 tests use a fake `claude` (`test/fake-claude.mjs`), so they are free and offline. They cover money math, CSV edge cases, each validation rule, re-asking for only the missing ids, unresolved rows, a model that labels everything `Income`, timeouts, crashes, non-JSON output, a missing binary, the injection row, and the CLI end to end. They do not test the model's judgment; that was checked by hand (see `LOG.md`).

## Layout

```
sort.mjs           command line entry point
src/csv.mjs        CSV parsing, cents math, row validation
src/schema.mjs     category list, JSON contract, validator, sign rules
src/prompt.mjs     everything the model is told
src/model.mjs      the only file that runs claude; re-ask logic
src/report.mjs     labels + totals + output file + verification
sample/            made-up transactions
test/              tests and the fake claude
LOG.md             plan and changes
```
