# GameTime — Smoke Tests

A **lightweight regression safety net**, built specifically to de-risk the
planned split of `app.js` into per-sport modules. This is not exhaustive
coverage of every mode or edge case — it's a small set of checks that would
catch the scariest failure mode of a mechanical refactor: something getting
silently disconnected (a wrong ID, a missing wire-up, a copy-paste slip).

## Setup

This folder expects to live in a `tests/` subfolder alongside your real
`index.html` and `app.js` at the repo root:

```
fantasy-checker/
  index.html
  app.js
  style.css
  tests/
    harness.js
    gametime.test.js
    package.json   <- this folder
```

Install once:
```bash
cd tests
npm install
```

## Running

```bash
npm test
```

Runs entirely offline — no network calls, no real browser. It loads your
actual `index.html` + `app.js` into a simulated DOM (via jsdom) and drives
it exactly like a person would: filling in inputs, clicking buttons, reading
the results back out.

## What's covered (and what isn't)

**Covered:**
- Structural check — every card header and mode-toggle radio still exists
- Manual mode FS calculation, one real test per sport: Basketball, NFL
  Offensive, MMA, Boxing, MLB Hitter
- Save-to-History wiring — clicking Save actually writes a correct entry
  to `localStorage`
- The NFL per-quarter play-by-play parser's pure logic (extracted directly
  from the real `app.js` source, not a parallel reimplementation — so this
  test guards the shipped code, not a copy of it)

**Deliberately not covered yet** (kept out to keep this "lightweight"):
- ESPN/MLB API drill-down modes (Player Search, Name Search) — these need
  real network calls, which would make the suite slow and flaky
- PDF Gamebook Upload flows — file upload + `pdf.js` parsing isn't easily
  jsdom-testable without a lot more harness work
- MLB Pitcher and Tennis Manual modes — structural presence is checked, but
  exact-value FS checks weren't added yet (their formulas involve more
  state — win/QS toggles, set-score grids — that wasn't worth reverse-
  engineering for a first pass)

## How to use this during the module split

1. Run `npm test` now, before touching anything — confirm all green.
2. Do the split.
3. Run `npm test` again. If anything goes red, that's a real regression to
   fix before shipping — the test output will tell you exactly which
   element ID or computed value broke.
4. Consider adding more tests as you go — especially for whichever sport
   you split first, since that's the one under the most risk of a slip.

## A note on the extraction-based test

The NFL quarter-parser test (`loadQuarterParser` in `gametime.test.js`) pulls
the actual function text out of `app.js` via regex and evaluates it directly,
rather than driving it through the DOM. This is intentionally fragile in one
specific way: **if you rename `fballoGbParsePlayByPlayQuarter` during the
module split, this test will fail with a clear "could not extract function"
error** rather than silently testing nothing. That's by design — update the
function name in the test alongside the rename, and it'll keep guarding the
real code once you've moved it into its own module.