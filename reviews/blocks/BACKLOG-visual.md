# Visual-fidelity backlog — make the blocks render correctly and look finished

**Date:** 2026-09-19 · **Branch:** `plan/block-system` · **Supersedes nothing.**
[BACKLOG-demo.md](BACKLOG-demo.md) (Q0–Q20) is closed. [BACKLOG-enhance.md](BACKLOG-enhance.md)
(R0–R16) stays open; this file **takes priority over R14/R15/R16**, which are explicitly parked.
[BACKLOG.md](BACKLOG.md) stays the long-form epic list.

This slice was written after a browser audit of all seven demo slides (screenshots looked at,
geometry read off `window.tlapp`, per-element `scrollHeight` vs `clientHeight` measured) plus a
source audit of the layout engine, the two renderers and the block library. Every claim below
carries a `file:line` or a measured number. Nothing here is inferred from a green test run —
the suite has been green at 2315 passing tests throughout the entire period these bugs existed.

## 0. The goal this slice is measured against

The product owner's scope, in their words: *the editor stays basic (content editing only); invest
in the **blocks** so an AI can arrange a deck attractively; blocks must look good and resize
like HTML; the demo should have some real colour; one exemplar block per family is enough for
now.* Multi-user editing, export and the AI backend are **out of scope** for this slice.

Therefore the exit condition is a single sentence:

> **Open the demo deck in a browser, step through every slide, and nothing overlaps, nothing
> overflows its box, every family has at least one good-looking block on screen, and it does not
> look like a wireframe.**

---

## 1. Audit findings — what is actually wrong

### 1.1 The measured state

Seven slides, measured on `/view/deck-demo-q3` and `/edit/deck-demo-q3` at 1600×1000:

| Slide | Block-box overlaps | Text parts overflowing their box | Visual verdict |
|---|---|---|---|
| sl_01 cover | **1** (title × subtitle, 27,498 px²) | title 150→337 (2.25×), kicker 33→56 | broken |
| sl_02 section | 0 | yes | rule renders *through* "01" |
| sl_03 two-column | 0 | yes (axis labels) | best slide; monochrome, bottom half empty |
| sl_04 kpi-row | 0 | KPI values 312→445 (1.4×) | **worst** — every number sits on its own label |
| sl_05 quote | **1** (quote × caption, 20,600 px²) | yes | broken |
| sl_06 closing | 0 | title 312→445 | title sits on the body copy |
| sl_07 feature-grid | 0 | title 106→190 | icon names print as the literal words `zap`/`shield`/`globe` |

**47 text parts overflow their assigned box. Zero of them are documented anywhere.** The backlog
currently tracks only the 2 block-box overlaps and calls the rest fine. It is not fine: 5 of 7
slides have blocking legibility defects.

### 1.2 Root cause A — the DOM renderer treats a baseline as a top offset

**This is the single highest-value fix in this document.** It alone explains the 47 overflows and
the visual damage on slides 1, 2, 4, 5, 6 and 7.

`measure.ts:337,345` computes, per visual line:

```ts
const withinLineBaseline = lineHeight * 0.8
baseline: Math.round(i * lineHeight + withinLineBaseline),
```

That is a **baseline** offset — distance from the top of the text box down to the glyph baseline.
`render-svg.ts:257` consumes it correctly: `y="${node.box.y + line.baseline}"`, which is exactly
what SVG `<text y>` means.

`render-dom.tsx:545-552` consumes the same number as a CSS **`top`**:

```tsx
{node.lines.map((line, i) => (
  <div key={i} style={{ position: 'absolute', top: `${line.baseline}px`, whiteSpace: 'pre' }}>
```

The line `<div>` inherits `lineHeight` from its parent (`render-dom.tsx:533`), so line *i* occupies
`[i·lh + 0.8·lh, i·lh + 1.8·lh]`. For an *n*-line text node the rendered extent is
`(n + 0.8)·lh`, while `measure.ts:352` sized the box at `n·lh + 2`.

Consequences, all confirmed against the measurements in §1.1:

- Every text node overflows its box by ~`0.8 · lineHeight`, vertically only (no horizontal
  overflow was measured, because lines are pre-broken and rendered `white-space: pre`).
- The overflow ratio is worse for few-line nodes: a 1-line node renders 1.8× its box, a 2-line
  node 1.4×. The measured ratios (2.25×, 1.7×, 1.4×) match.
- Glyphs sit visually *low* inside their box, so a title with room to spare still paints down onto
  whatever is beneath it. This is why slides 4, 6 and 7 look overlapped even though their
  **block boxes do not overlap at all**.
- The block wrapper in the editor has `overflow: hidden` (`ComponentUtil.tsx:242`), so in `/edit`
  the same bug *clips* text instead of overlapping it — the historical "F2: slide 1 has no title"
  report was this bug, not a separate one.

This divergence is **already written down as an accepted scope cut** in `BACKLOG-demo.md:541-543`
("DOM text sits roughly 0.8× lineHeight lower than SVG text"). It was never a cosmetic parity
nit; it is the deck's worst rendering bug and it must stop being a scope cut.

### 1.3 Root cause B — region boxes are frozen before any block is measured

`slide-compiler.ts:102` calls `layout.compile(frame, tokens)` to fix **every region's box up
front**, then `slide-compiler.ts:151-236` measures each block and stacks it inside its region.
The measurement is correct and intrinsic; the regions it must fit into were guessed.

The guesses are hardcoded line counts:

```ts
// slide-layouts.ts:51-63 (layoutTitle)
const titleH = tokens.type.title.size + tokens.space.lg        // assumes ONE line
const subtitleH = tokens.type.subheading.size + tokens.space.sm
subtitle: { x: ca.x, y: startY + titleH + g, ... }             // y baked in

// slide-layouts.ts:296-311 (layoutQuote)
const quoteH = tokens.type.lead.size * 3 + tokens.space.lg     // "room for ~3 lines"
```

sl_01's title region holds kicker + title, and the title overrides `props.size: "display"`
(larger than `tokens.type.title`), so the real content is 150 units tall against a guess that put
the subtitle's `y` at 598 — 31 units before the title ends. sl_05's quote measured 392 against a
3-line guess, so the attribution starts 204 units early.

This is systemic to `title`, `section` and `quote` layouts, not two unlucky slides.

### 1.4 Root cause C — containers divide space, they do not distribute it

There is **no flex/grid solver anywhere in this codebase**. Every container block divides its box
by plain arithmetic and gives each child an identical share:

- `tls-l-row/layout.ts:20-21` — `childWidth = (W − totalGap) / n`
- `tls-l-stack/layout.ts:20-21` — `childHeight = (H − totalGap) / n`
- `tls-l-grid/layout.ts:21-24` — uniform `cellW`/`cellH`; children past `cols*rows` are dropped

None of the three asks a child how big it wants to be. There is no min-content, no max-content,
no `flex-grow`, no wrapping, no aspect-preserving reflow. The DOM renderer then positions every
node `position: absolute` from a box that was already final (`render-dom.tsx:96-104`), so nothing
can flex at render time either.

The one place content-driven sizing exists is the slide compiler (§1.3), one level *above* the
containers. Inside a container, a two-word label and a five-line paragraph get the same height.

### 1.5 Root cause D — text metrics are invented

`measure.ts:680-685`, the only TODO in the entire `blocks/` tree:

```
/** Inter — the neutral theme font for tlslides. Per-glyph advance widths
 *  hand-authored from visual inspection of Inter Regular at display sizes.
 *  These are estimates, not measurements extracted from the actual font file.
 *  TODO: replace with a real per-glyph table generated from the font binary
 */
```

A prior review established that the script this comment's predecessor claimed to have used
**does not exist in the repo**, and that the Next.js sample **never loads Inter at all** — so
Chromium falls back to DejaVu Sans, which is markedly wider than the table assumes
(`BACKLOG-enhance.md:730-743`).

Severity note, because this changes the work order: this bug corrupts the *line count* (text wraps
where the estimate said it would not), which is a real defect — but it is **not** what produces
the 47 overflows. Fix C-before-D order accordingly: root cause A first, since A is wrong even
when the metrics are perfect.

### 1.6 Root cause E — no icon system

`tls.m.icon` does not exist. `LayoutNode` has an `icon` kind and `render-dom.tsx` renders it as an
inline `<svg><path>`, but nothing in the library emits one and there is no icon set to draw from.
`tls.c.feature-grid`'s html template therefore prints its `icon` prop as a text label — which is
what "zap", "shield" and "globe" are on slide 7.

### 1.7 The catalog gap

`03-block-catalog.md` specifies **170 blocks across 8 families**. The library has **35**
(`library/index.ts:25-31`):

| Family | prefix | specified | implemented | implemented types |
|---|---|---|---|---|
| Layout & container | `l` | 14 | **14** | full set |
| Text & typographic | `t` | 24 | **9** | title, subtitle, kicker, body, bullets, caption, hero-number, quote, takeaway |
| Data & chart | `d` | 32 | **1** | bar |
| Diagram & relationship | `g` | 30 | **0** | — |
| Media & icon | `m` | 24 | **1** | image |
| Composite slide | `c` | 20 | **10** | hero, kpi-tile, kpi-row, image-text, comparison, agenda, steps, feature-grid, testimonial, big-stat |
| Chrome & master | `x` | 14 | **0** | — |
| Live / interactive | `v` | 12 | **0** | — |

Four families have no block at all. The product owner asked for **one exemplar per family** — that
is 4 new blocks minimum (`g`, `m`-icon, `x`, `v`) plus a second chart so `d` is not a single bar.

### 1.8 Non-visual debt found during the audit

Recorded so it is not rediscovered, and scheduled where cheap:

- **`packages/core`'s entire test suite is dead.** Its `package.json` jest transform options omit
  `module: "commonjs"` (which `packages/tldraw`'s config has), so `@swc-node/jest` emits ESM that
  Jest 27's CJS runtime cannot execute; all 18 suites fail with
  `SyntaxError: Cannot use import statement outside a module`, on every invocation. Pre-existing.
- **`parity-3way.spec.ts` leaks child processes.** It forks `parity-worker.ts` (Playwright-driven)
  and `shutdownWorker()` does not reliably kill it; jest prints *"A worker process has failed to
  exit gracefully"* on every run. Up to **30 orphaned workers** (~100 MB RSS each) were found
  accumulated on this box, which has **5.8 GB RAM total**. See §2.4 — this is the OOM risk.
- **Root `yarn build` cannot succeed here.** `tldraw-vscode#build` needs registry access
  (`Couldn't find package "@tlslides/tldraw@workspace:*"`). Use `yarn build:packages`.
- **`eslint` is not clean and never was:** `packages/tldraw` reports **1015 problems (20 errors,
  995 warnings)**. A "leave eslint clean" gate is unmeetable; §2.3 sets a ratchet instead.
- **`tsc` reports 291 errors, all of them in `*.spec.ts(x)`; production `src/` is clean.** Same
  treatment: ratchet, not zero.

---

## 2. Working rules for implementing agents

**Read this section before writing any code. It is binding.**

### 2.1 Governing design rules still apply

From [README.md](README.md), unchanged and not up for relitigation:

1. **One layout, two renderers, proven equal.** A Tier-A block is authored once as a pure
   `layout()`; DOM and SVG both consume its output. Parity is enforced by a test, not by eye.
2. **The document stores a spec, never React and never pixels.** A persisted block is
   `{ componentId, props }` plain JSON.
3. **Colors are roles, not hex.** A block asks for `accent`/`surface`/`onSurface`; the theme
   answers. An html block reads CSS custom properties (`--tls-accent`, …) — a hardcoded hex in a
   template fails review.
4. **Additive schema only.** Every new persisted field is optional. `TldrawApp.version` stays at
   16 and `migrate.ts` gains nothing. If you think you need a migration, stop and ask.
5. **Motion is tokenized and off by default.** `prefers-reduced-motion` is honoured.
6. **No new runtime dependency in `packages/` without a named reason** approved in advance.
7. **Screenshot everything.** Every phase here ships a `tools/visual/scenarios/*.js` scenario and
   **the screenshot is opened and looked at** before the phase is called done.
8. **Report what you did not build.** Each phase writes a notes section naming its scope cuts.

### 2.2 Test policy — this is the part to get right

**While implementing a phase, run only the tests that phase touches.** The full suite is 167
suites / 2392 tests and, on a polluted box, has been measured taking **4m29s instead of 14s**
purely from memory contention. Do not run it per-edit.

Targeted run (from **inside** `packages/tldraw` — running jest from the repo root picks up a
config with no TypeScript transform and dies with a babel `SyntaxError`):

```bash
cd /home/bachx/workspace/vinhuni/tlslides/packages/tldraw
../../node_modules/.bin/jest src/blocks/layout/measure.spec.ts
../../node_modules/.bin/jest src/blocks/ -t 'baseline'      # by name
```

**Full suite runs only twice:** once at the end of Phase 6 (catalog complete) and once in Phase 8
(final review). Both with the OOM guard in §2.4.

### 2.3 Quality gates — ratchets, not absolutes

The repo is not clean today. Do not chase zero; **do not make it worse**, and record the number.

| Gate | Command (verified) | Baseline 2026-09-19 | Rule |
|---|---|---|---|
| tests | `cd packages/tldraw && ../../node_modules/.bin/jest` | 167 suites, 2315 pass / 77 todo, ~14s clean | must not drop; no todo may be touched |
| typecheck | `cd packages/tldraw && node_modules/.bin/tsc --noEmit --emitDeclarationOnly false` | 291 errors, **all in `*.spec.*`**, 0 in production `src/` | production `src/` stays at **0**; spec-file count must not rise |
| lint | `cd packages/tldraw && node_modules/.bin/eslint src/ --ext .ts,.tsx` | 1015 problems (**20 errors**, 995 warnings), ~5.6s | error count must not rise above **20**; prefer to lower it |
| build | `cd <repo root> && node_modules/.bin/turbo run build:packages --log-order=stream` | exit 0, 9/9, ~13s | must stay exit 0. **Never** use root `yarn build`. |

`tsc` gotchas, already paid for: `--noEmit` alone fails with `TS5053` because the tsconfig sets
`emitDeclarationOnly`; `npx tsc` resolves a broken pnpm path. Use the exact command in the table.

### 2.4 OOM guard — mandatory

This box has **5.8 GB RAM** and the suite leaks Playwright workers (§1.8).

```bash
# BEFORE any full-suite run:
pkill -9 -f "blocks/parity-worker.ts" || true
free -m

# Full suite, with heap visibility:
cd /home/bachx/workspace/vinhuni/tlslides/packages/tldraw
../../node_modules/.bin/jest --logHeapUsage

# AFTER every full-suite run, ALWAYS:
pkill -9 -f "blocks/parity-worker.ts" || true
```

- **Never run the full suite in two agents at once.** If you are a subagent and another full run
  may be live, ask before starting one.
- If a run exceeds ~3 minutes, it is thrashing, not working: kill it, `pkill` the workers, retry.
- Do not add `--maxWorkers=N` as a first response — on a clean box the default is fine and fast;
  the flag masked a leak rather than fixing it during the audit.

### 2.5 Visual verification is not optional

Harness contract (`tools/visual/shoot.js`), verified:

- Scenario file: `tools/visual/scenarios/<name>.js`, CommonJS, exporting
  `{ base?, route?, waitFor?, known?, async run(page) }`. `run` receives a Playwright `page`; its
  return value becomes the `notes` field of the JSON result. `known` is an array of `RegExp` for
  tolerated console errors. Default `waitFor` is `#canvas`.
- Run: `node tools/visual/shoot.js <name>` **from the repo root**. Screenshots land in
  `tools/visual/shots/<name>.png`. Non-zero exit on unexpected page/console errors.
- A dev server must already be running at the scenario's `base`:
  `cd examples/nextjs-sample && npx next dev -p 5433`. The app global is **`window.tlapp`**
  (not `window.tldrawApp` — that name appears only in dead code).
- **Known race:** `next dev` crashes outright if `packages/tldraw/dist/index.mjs` is being
  rewritten. Always finish `build:packages`, confirm the port with `ss -ltnp | grep 5433`, then
  start the server.
- **After running a scenario, open the PNG with the Read tool and describe what you see.** A
  scenario that exits 0 while the slide looks broken is the exact failure mode this repo has hit
  in six separate phases.

### 2.6 Definition of done, per phase

A phase is done when **all** hold, and the phase's notes section says so explicitly:

1. Its own new tests pass, and the targeted existing tests it touches pass.
2. Gates in §2.3 respected (ratchets not worsened).
3. Its visual scenario runs at exit 0 **and its screenshot has been looked at and described**.
4. Its notes section names every scope cut, in the format used by
   [BACKLOG-enhance.md](BACKLOG-enhance.md)'s "Still open, named" lists.
5. No `TldrawApp.version` bump, no new `packages/` runtime dependency, layout code stays DOM-free.

**Do not mark a task ✅ that you did not verify in a browser.** Three separate tasks in this
repo's history were committed as "done" while being dead code that never mounted.

---

## 3. Phases

**Status legend:** ⬜ not started · 🔄 in progress · ✅ done · ⛔ blocked
**Size:** XS < ½ day · S ≈ 1 day · M ≈ 2–3 days

Phases are ordered by dependency. **Phase 1 must land before anything else** — every later
phase's screenshots are unreadable until it does.

---

### Phase 1 — Fix the text vertical-position bug ⬜ · S

Closes root cause A (§1.2). Highest value per line changed in this entire document.

#### V1.1 Give `TextLine` an explicit top offset ⬜ XS

**Problem.** `TextLine.baseline` is a baseline, and two consumers disagree about what it means.
Rather than have the DOM renderer re-derive a top from a baseline (fragile — it would need the
ascent ratio, which lives in `measure.ts`), make the measurement emit both.

**Direction.**
- In `types.ts`, add an **optional** field to `TextLine`: `top?: number` — "distance from the top
  of the text box to the top of this line's line box, in slide units." Optional keeps rule 4
  (additive schema only); a persisted old value simply lacks it.
- In `measure.ts`, in **every** path that builds `TextLine[]` — `estimateMetrics`, `canvasMetrics`
  and `tableMetrics` (all three, they must not diverge) — set `top: Math.round(i * lineHeight)`
  alongside the existing `baseline`.
- Document both fields at the `TextLine` declaration with one sentence each, naming which renderer
  consumes which. The current comment at `measure.ts:335-336` ("so the renderer can position each
  line with `y = line.baseline` directly") is the sentence that caused this bug — replace it.

**Expected output.** `measure.ts` unit tests assert, for a 3-line node at `lineHeight = 40`:
`tops = [0, 40, 80]` and `baselines = [32, 72, 112]`, and that `top[i] + lineHeight === top[i+1]`.

#### V1.2 Make the DOM renderer use `top` ⬜ XS

**Direction.** `render-dom.tsx:550`: `top: ${line.baseline}px` → `top: ${line.top ?? line.baseline - node.style.size * 0.8}px`.
The fallback exists only for a `TextLine` produced by code not yet updated; once V1.1 lands,
every in-repo producer sets `top`, so add a test that the fallback is unreachable from library
blocks.

Leave `render-svg.ts:257` **untouched** — it is correct and stays on `baseline`.

**Expected output.** A jsdom test rendering a 2-line `tls.t.title` asserts each line `<div>`'s
`style.top` equals `i * lineHeight`, not `i * lineHeight + 0.8 * lineHeight`.

#### V1.3 Tighten parity so this cannot regress ⬜ S

**Problem.** `parity-3way` compares DOM against SVG geometry but has an accepted 0.8×lineHeight
tolerance for text (`BACKLOG-demo.md:541-543`) — the exact size of this bug. It also checks
geometry for only 3 of 8 node kinds (`rect`/`image`/`host`); `text`, `group`, `line` and `path`
have **no geometry assertion at all**.

**Direction.**
- Remove the text tolerance. DOM and SVG text must now agree on the box.
- Add a geometry assertion for the `text` kind at minimum. `group`/`line`/`path` are a named
  scope cut if they prove expensive — say so in the notes, do not silently skip.
- Add a **new, separate** invariant test (not parity — parity compares the two renderers against
  each other and passes when both are wrong): for every block in the library, rendered in jsdom at
  its `size.preferred`, assert every `[data-part]`'s `scrollHeight <= clientHeight + 2`. This is
  the test that would have caught the 47 overflows.

**Expected output.** The new invariant test **fails** on the code before V1.1/V1.2 and passes
after. Demonstrate this in the notes by reporting both runs.

#### V1.4 Visual proof ⬜ XS

Create `tools/visual/scenarios/text-fit.js`: walk all 7 demo slides, and for every `[data-part]`
report `clientHeight`, `scrollHeight` and the ratio; fail the run if any ratio exceeds 1.02.
Screenshot each slide.

**Expected output.** Scenario exits 0. **The seven screenshots are opened and described.** The
notes report the before/after overflow count — it must go from 47 to 0.

> **Note (Phase 1).** *To be filled by the implementing agent: what shipped, what was cut, the
> before/after overflow counts, and the gate numbers from §2.3.*

---

### Phase 2 — Regions that flow to their content ⬜ · M

Closes root cause B (§1.3). This is the slide-level half of "resizes like HTML".

#### V2.1 Two-pass region resolution ⬜ M

**Problem.** `slide-compiler.ts:102` freezes all region boxes via `layout.compile(frame, tokens)`
before a single block is measured; `slide-layouts.ts:51-63,296-311` fills those boxes with
hardcoded line-count guesses.

**Direction.** Make region layout two-pass, without changing the `SlideLayout` public shape more
than additively:

1. **Pass 1 (unchanged):** `layout.compile(frame, tokens)` produces the current boxes. Treat the
   result as *hints*: x, width and stacking order are authoritative; **height and y are
   provisional** for regions in a vertical run.
2. **Measure:** the compiler already calls `def.layout()` per block (`slide-compiler.ts:151-189`).
   Sum each region's measured content height + gaps to get the region's *natural* height.
3. **Pass 2 (new):** for each vertical run of regions, re-flow `y` sequentially from the run's
   start using natural heights, then distribute any leftover per the run's alignment
   (`regionAlign`, which already exists on `SlideLayout`). If natural heights **exceed** the
   frame, shrink proportionally down to each region's declared minimum, then emit
   `region/overflow` — **do not clamp a box** (a clamped box is what the editor's
   `overflow: hidden` clips against, which produced the historical "missing title" report).

**Constraint — do not break the round trip.** `shapeMatchesRegion`'s `bottomOk` check rejects an
over-tall block back into `free[]`. Loosen or drop `bottomOk` and prove it with the existing
round-trip specs (`demo-deck-roundtrip.spec.ts`, `slide-decompiler.spec.ts`).

**Expected output.**
- `slide-compiler.spec.ts` gains a case: a `title` layout whose title wraps to 2 lines pushes the
  subtitle region down, and the two boxes do not intersect.
- `slide-layouts.spec.ts` gains a case per re-flowed template (`title`, `section`, `quote`).
- Existing round-trip specs still pass unchanged.

#### V2.2 Delete the hardcoded line-count guesses ⬜ S

Once V2.1 re-flows, `titleH = tokens.type.title.size + tokens.space.lg` and
`quoteH = tokens.type.lead.size * 3 + tokens.space.lg` should become *minimums*, not predictions.
Rename them so the next reader cannot mistake a floor for a measurement, and comment why.

#### V2.3 Slide-level collision gate ⬜ S

`library/composite-geometry.spec.ts` already asserts no text-leaf overlap **within one block's
tree**. Nothing asserts it **across blocks on a slide** — that is the gap the two documented
overlaps lived in.

**Direction.** New spec: compile every slide of `__fixtures__/demo-deck.json` **and** of
`examples/nextjs-sample/data/decks/deck-demo-q3.json`, walk each compiled shape into absolute
slide coordinates, and assert zero intersection between any two text-bearing leaves from
different blocks.

**Note for the implementing agent:** these are *two different decks* that coincidentally share
slide ids. The one the app actually serves is the `examples/nextjs-sample` file
(`app/api/decks/[deckId]/route.ts` reads it). Test both; they must both be clean.

**Expected output.** The spec fails on today's code (2 overlaps) and passes after V2.1.

#### V2.4 Visual proof ⬜ XS

Promote the audit scenario to a permanent gate: `tools/visual/scenarios/overlap-audit.js` already
exists from the audit — clean it up, make it fail on any block-box intersection or any
`scrollHeight/clientHeight > 1.02`, and keep it.

> **Note (Phase 2).** *To be filled by the implementing agent.*

---

### Phase 3 — Real font metrics ⬜ · M

Closes root cause D (§1.5). Do this **after** Phase 1, per §1.5's severity note.

#### V3.1 Ship the font the metrics describe ⬜ S

**Problem.** Layout measures with an "Inter" table; the browser renders DejaVu Sans because
nothing loads Inter (`examples/nextjs-sample/app/layout.tsx` is bare).

**Direction.** Self-host the font files (no CDN — the demo must work offline and a CDN is an
outbound dependency nobody approved). Load it in **all three paths**: the Next.js sample, the
editor package's own styles, and the Node/export path's metrics provider. Set
`DeckTheme.fonts.headingFamily`/`bodyFamily` so the resolved `family` string is the family that is
actually loaded.

**Watch-out, quoted from the earlier review because it is the trap here:** *"The metrics provider
must be the same in all three places or the fix moves the bug."*

#### V3.2 Generate the metrics table from the font binary ⬜ M

**Direction.** Write the extraction script the TODO at `measure.ts:680-685` asks for, and
**commit the script**, not just its output. Put it at `tools/fonts/gen-metrics.js`. It reads the
shipped font file, emits the per-glyph advance-width table as a generated `.ts` file with a header
naming the script, the font file and its version. Replace the hand-authored table.

Delete the false provenance comment. If a glyph is missing from the font, the generated table must
say so rather than silently falling back.

#### V3.3 Prove the metrics against the browser ⬜ S

**Direction.** New visual scenario `tools/visual/scenarios/metrics-check.js`: for ~40 strings
spanning Latin, digits, punctuation and CJK at 4 sizes, compare `measure.ts`'s predicted width and
line count against the browser's real `getBoundingClientRect()` / `Range` measurement. Fail if
predicted width is off by more than 2%, or if the predicted line count ever differs.

**Expected output.** Report the worst-case error in the notes. If CJK cannot hit 2%, say so and
name the tolerance you did ship — do not quietly widen the threshold.

> **Note (Phase 3).** *To be filled by the implementing agent.*

---

### Phase 4 — Containers that distribute, not divide ⬜ · M

Closes root cause C (§1.4). This is the block-level half of "resizes like HTML", and it is what
lets an AI drop N children into a container and get a sensible result.

#### V4.1 Intrinsic size reporting ⬜ M

**Direction.** Add an optional `intrinsicSize?(props, ctx): Size` to `BlockDefinition`
(additive — rule 4). Where a block does not implement it, the container falls back to calling
`def.layout()` once against a probe box and reading `node.box`, which is exactly what
`slide-compiler.ts:151-189` already does — **factor that logic out of the compiler into a shared
helper** so there is one implementation, not two.

Guard the cost: memoise per `(type, props-hash, box)` within a single compile pass, and keep the
existing `MAX_DEPTH = 4` recursion cap (`layout-child.ts:136,250`).

#### V4.2 Flex-like sizing on `stack`, `row`, `grid` ⬜ M

**Direction.** Give each of the three containers an optional per-child sizing mode in its schema,
defaulting to today's behaviour so no existing deck changes:

- `'fill'` (default, = today) — equal share of the container's box.
- `'auto'` — take the child's intrinsic size; do not stretch it.
- a number — a `flex-grow`-style weight over the space left after all `'auto'` children.

Algorithm, stated once so all three containers implement it identically: measure every `'auto'`
child; subtract their sizes and all gaps from the container's main axis; distribute the remainder
across `'fill'`/weighted children in proportion to their weight; if `'auto'` children alone
overflow, shrink them proportionally to their minimum and emit a capacity finding.

`tls.l.grid` additionally must stop **silently dropping** children past `cols*rows`
(`tls-l-grid/layout.ts:21-24`) — either grow the row count or emit an overflow finding. Silent
truncation violates the stated remedy order (*reflow → shrink → paginate → truncate*, truncation
never silent).

**Expected output.** Per container, a spec proving: all-`fill` matches today's geometry exactly
(regression guard); one `'auto'` child beside one `'fill'` child gives the auto child its
intrinsic size; weights split the remainder correctly; overflow shrinks rather than clips.

#### V4.3 Visual proof ⬜ XS

`tools/visual/scenarios/container-flex.js`: a synthetic slide with a stack containing a 1-line
label and a 6-line paragraph, in both `fill` and `auto` modes, screenshotted side by side.

> **Note (Phase 4).** *To be filled by the implementing agent.*

---

### Phase 5 — Icons ⬜ · S

Closes root cause E (§1.6) and makes slide 7 stop printing the word "zap".

#### V5.1 A small, vendored icon set ⬜ S

**Direction.** Vendor a small set of outline SVG **path data** (not an npm dependency — rule 6)
into `packages/tldraw/src/blocks/icons/`, as a plain `Record<string, string>` of name → path `d`,
on a normalised 24×24 viewBox. **~24 icons is enough** for a demo; pick the ones the catalog and
the existing demo actually reference (`zap`, `shield`, `globe`, `check`, `arrow-right`, `trending-up`,
`trending-down`, `users`, `clock`, `alert`, …). Record the source and its licence in a header.

Add a lookup that returns `undefined` for an unknown name, and make unknown names a **lint
finding**, never a silently-rendered text label.

#### V5.2 `tls.m.icon` and `tls.m.icon-label` ⬜ S

The `m` family's exemplar blocks. `tls.m.icon` emits a `k: 'icon'` node (the kind both renderers
already support). `tls.m.icon-label` is icon + label, the composable unit `feature-grid` needs.
Both Tier A, colours via `ColorRole` only.

#### V5.3 Fix `tls.c.feature-grid` ⬜ XS

Make its html template resolve the icon name through V5.1 and inline the SVG, rather than printing
the name. Its `poster()` must draw the same icons so the SVG export matches.

**Expected output.** Slide 7's screenshot shows three real icons and no stray words. Look at it.

> **Note (Phase 5).** *To be filled by the implementing agent.*

---

### Phase 6 — One exemplar block per empty family ⬜ · M

The product owner's explicit ask. Quality over count: **one block done well per family beats five
rushed**. Each new block gets `describe: { when, avoid, example }` filled in — that field is what
the AI reads, and it is the whole point of this slice.

#### V6.1 `tls.g.steps` — diagram family exemplar ⬜ S

A horizontal numbered process: N steps, each a number badge + title + optional description, with
connectors between. Tier A, pure `layout()`. Must handle 2–6 steps and reflow to two rows past 4.

(`tls.c.steps` already exists as a *composite* — V6.1 is the reusable `g`-family primitive it and
future diagrams should compose from. If it is cleaner to extract the primitive out of
`tls.c.steps` and have the composite delegate, do that and say so.)

#### V6.2 `tls.d.donut` — second chart, so `d` is not one bar ⬜ S

Donut/ring with a centre value and a legend. Uses the categorical ramp from `DeckTokens`
(`tokens.ts`), never literal hex. Max 6 slices, per the design language's "6 hues max" rule;
beyond 6, group into "Other" and say so in the lint finding.

#### V6.3 `tls.x.footer` + `tls.x.page-number` — chrome family exemplars ⬜ S

Deck chrome that a master applies to every slide: a footer band (left text / right page number)
and a standalone page number. Both must be `editorOnly: false` and must render in export.
These are the blocks that make the demo stop looking like a wireframe at the bottom edge.

#### V6.4 `tls.v.counter` — live family exemplar ⬜ S

Tier **B**, `kind: 'html'`. A number that counts up on reveal (the `animate()` hook, honouring
`prefers-reduced-motion`). **Its `poster()` must draw the final value** — that is the Tier-B parity
obligation and the reason this family exists as a separate tier.

Scope-cut candidate: if Phase 6 runs long, **cut V6.4 first** and name it. The `v` family is the
least load-bearing for an AI composing a static deck.

#### V6.5 Catalog conformance spec ⬜ XS

One spec asserting, for every registered block: `describe` is present and its `example` passes
`validateDeckSpec`; `size.min <= size.preferred`; Tier B implies `poster` exists; the capability
digest renders it without throwing. This is cheap and it is the guard that keeps the catalog
usable by the AI as it grows past 35 blocks.

> **Note (Phase 6).** *To be filled by the implementing agent. This is the first of the two points
> where the FULL suite runs — see §2.2 and the OOM guard in §2.4.*

---

### Phase 7 — A demo that looks finished ⬜ · M

Everything above is correctness. This phase is the one the product owner will actually look at.

#### V7.1 A real theme ⬜ S

The demo currently renders near-monochrome: black text, white surface, grey chart bars. The theme
machinery is already there and unused — five built-in themes exist in
`deck-theme.ts:100+` (Midnight, Ivory Editorial, Coral Pop, Forest, Mono Grid), the categorical
ramp exists in `tokens.ts`, and the contrast solver (`resolveColor`, `tokens.ts:255-279`) already
solves text colour against the *actual* surface luminance.

**Direction.** Pick or author **one** theme for the demo with a genuine accent and a usable
categorical ramp, and make every demo slide use roles so the theme actually shows: chart series on
the ramp (not grey), the section divider and KPI deltas on `accent`, one gradient surface on the
cover via `BlockStyleSpec.surface` (R4 already made that field carry a `Paint`).

Respect the design language: **60-30-10** (dominant surface ≈60%, support ≈30%, accent ≈10%), and
**≤2 accent-painted parts per block**. The accent goes on the one number that matters, not on
everything.

#### V7.2 Rebuild the demo deck ⬜ M

Rewrite `examples/nextjs-sample/data/decks/deck-demo-q3.json` so it shows the catalog off:
one slide per family, using the new blocks from Phases 5 and 6, with `tls.x.footer` applied via
the master. Keep it to ~8 slides — it is a demo, not a soak test.

Keep `packages/tldraw/src/blocks/__fixtures__/demo-deck.json` in sync, or delete one of the two
and point both consumers at the survivor. **Two decks with the same slide ids and different
contents is a trap** that already cost this audit time; resolve it, do not preserve it.

#### V7.3 Balance pass ⬜ S

With Phases 1–4 landed the text will finally sit where the layout thinks it does — at which point
the remaining complaint is composition: slides 3, 6 and 7 leave 40–60% of the frame empty because
content hugs the top. Use the region alignment that Phase 2 wires up (`regionAlign: 'center'`) and
the `safe-area` guide to make each slide read as deliberate.

**This is a judgement task, not a mechanical one.** Screenshot, look, adjust, screenshot again.
Put the before/after pair in the notes.

#### V7.4 Final visual scenario ⬜ XS

`tools/visual/scenarios/demo-deck-v2.js`: step every slide and every build step, screenshot each,
assert zero console errors, zero overlaps, zero overflow. **Open every screenshot.**

> **Note (Phase 7).** *To be filled by the implementing agent.*

---

### Phase 8 — Review gate ⬜ · S

Run only when Phases 1–7 report done. This is the phase where the full sweep happens.

#### V8.1 Full verification sweep ⬜ S

In this order, with the §2.4 OOM guard around the test run:

1. `pkill -9 -f "blocks/parity-worker.ts" || true` then `free -m`
2. `node_modules/.bin/turbo run build:packages --log-order=stream` (repo root)
3. `cd packages/tldraw && ../../node_modules/.bin/jest --logHeapUsage`
4. `pkill -9 -f "blocks/parity-worker.ts" || true`
5. `node_modules/.bin/tsc --noEmit --emitDeclarationOnly false`
6. `node_modules/.bin/eslint src/ --ext .ts,.tsx`
7. Every scenario in `tools/visual/scenarios/` that this slice added or touched.

Report every number against the §2.3 baseline table. A ratchet that moved the wrong way is a
finding, not a rounding error.

#### V8.2 Fix `packages/core`'s jest config ⬜ XS

Add `module: "commonjs"` to `packages/core`'s `package.json` jest transform options, matching
`packages/tldraw`'s. This revives 18 dead test suites (§1.8). Cheap, and it means the next agent's
"tests are green" actually covers `core`.

#### V8.3 Fix the `parity-worker` leak ⬜ S

`shutdownWorker()` in `parity-harness.ts` does not reliably kill the forked
`parity-worker.ts`. Make teardown deterministic (await the child's exit, `SIGKILL` on timeout).
This is the OOM risk in §1.8; with it fixed, §2.4's `pkill` ritual becomes a belt-and-braces step
rather than a requirement.

#### V8.4 Write the notes ⬜ XS

Fill in every phase's note section. State plainly what was cut. Update the status legend on every
task. Update [README.md](README.md)'s phase table and
[BACKLOG-enhance.md](BACKLOG-enhance.md)'s status lines where this slice changed them.

> **Note (Phase 8).** *To be filled by the implementing agent.*

---

## 4. Explicitly out of scope for this slice

Named so nobody drifts into them, and so nobody later claims they were forgotten:

- **R14 headless export rendering blocks** — parked. Phase 1 and 3 make it *possible* to do
  correctly later; doing it now would bake in the baseline bug.
- **R15 slide transitions** — parked.
- **R16 FastAPI backend contract** — parked. The AI pipeline remains deferred per
  [reviews/README.md](../README.md)'s Current scope decision.
- **Multi-user / collaborative editing** — not started, not planned in this slice.
- **The remaining ~135 catalog blocks** — Phase 6 ships one exemplar per empty family to prove the
  patterns. Volume comes after the patterns are proven by screenshots.
- **Editor authoring UX** — R11/R12/R13's open items (Tab-to-next-field, rich-text run
  preservation, gradient editor UI, undo coalescing, SVG thumbnails in the inserter, region-fit
  insertion) stay open and stay **low priority**. The editor is a content-editing surface; it is
  not becoming a design tool in this slice.
- **`packages/core`'s 4 spec-file type errors** — left; V8.2 only revives the suite.
