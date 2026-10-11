# Content stress — real content in every design, before any token is spent

**Date:** 2026-10-11 · **Branch:** `plan/block-system`
**Status:** CS0, CS1, CS2 done (2026-10-11). CS3 is spro-side. Open items for the owner: §6 Notes — CS1.
**Asked by:** the spro integration (phase 2 of its slide-engine plan): "pour the golden briefs —
Vietnamese included — with long text and item counts outside the range into the designs, run the
checks, fix what breaks in tlslides".

The dry run (`pipeline/dryRun.ts`) fills each design with its blocks' own example content. A design
that breaks under other text, another language or another item count passes it — and in the AI
pipeline every such break is a repair round the model pays for. This plan measures that before
the backend exists.

---

## 1. What runs

`pipeline/contentStress.ts` (exported from the package root):

| Function | Does |
|---|---|
| `stressSlide(slide, registry, level, lang, { only? })` | rewrites a design's content slot by slot from the block schema, deterministic |
| `runContentStress(cases, registry, levels?)` | every design the picker can offer for each case's roles (style, assets; all looks), at every level |
| `designCapacity(slide, style, registry, lang)` | the longest title (characters) and the most items per top-level list the design takes clean (binary search, ~7 + 4 oracle runs) |
| `soloDeck`, `soloProblems` | one-slide deck in a style; its problems with the S4.1 bar |
| `slideProblems`, `geometryProblems` (`pipeline/quality.ts`) | the S4.1 bar, shared with the dry run (moved out of `dryRun.ts`) |

Levels: `same` (target language at the example's length, counts unchanged — must be clean),
`min` / `items` (lists at the low / high end of the guidance's `A–B items`, else the schema range),
`words` (text slots whose guidance — or their list's — says `A–B words` at `B` words), `over`
(items + 2, words × 1.6). A string without two letters in a row (`02`, `Q3`) is left alone.
Corpora: one lecture paragraph in Vietnamese (every tone mark, ư ơ đ) and one in English
(`STRESS_TEXT`).

CLI: `node tools/layout-report/stress-run.js [--brief ids] [--level l,..] [--capacity] [--json f]`
over `__fixtures__/golden-briefs.json`. Spec: `content-stress.spec.ts` (generator, capacity, and a
ratchet on the golden-brief run at `same`).

## 2. Results (CS0, 2026-10-11, commit of this file)

10 golden briefs → 841 (style, language, design) runs, 39 s; no engine exception.

| Level | Not clean | Main codes |
|---|---|---|
| `same` | **28** | layout/misaligned 8, quality/sparse 7, accent/overuse 6, contrast/low 5, layout/narrow-child 2 |
| `min` | 66 | quality/thin-region 33, quality/sparse 11 (+ the `same` ones) |
| `items` | 125 | slide/overflow 27, capacity/exceeded 26, region/overflow 18, text overflow/collision 16 |
| `words` | 461 | quality/small-type 359, region/overflow 344, content/overflow 154 |
| `over` | 645 | expected: the oracle reports, it does not pass |

**Finding 1 — the title guidance is the largest gap.** Stretching one block type at a time to its
guidance maximum (`words`, `only`), `tls.t.title` breaks 377 of 618 designs; no other block type
breaks more than a handful. Its guidance says "1–12 words"; a content slide holds one line at full
size. Title capacity (`designCapacity`, characters, 596 designs): min 5, p10 41, p25 41, median 52,
max 120. Per role (median): content 51, data 58, process 49, comparison 49, closing 51, cover 81,
section 120. Past it the title autofits below 0.9 × the deck's title size (`quality/small-type`) or
overflows its region.

**Finding 2 — list ranges are per block, capacity is per design.** 80 of 417 top-level lists hold
fewer items than their range's top (`process-steps`: schema 1–12, holds 4 in corporate). The fill
stage needs the design's number, not the block's.

**Finding 3 — 28 designs break with real-length content** (`same`):

| Group | Designs (style/lang) | Seen in the render | Verdict |
|---|---|---|---|
| A | `agenda-split-rail/base`, `/chevron` (memphis/en) | the lead title breaks **inside a word** ("Hypothe / sis") in the 640-unit lead column at memphis's display size | real, CS1 |
| B | `content-hub/base`, `/outline` (8 style/lang pairs) | the five shape labels autofit independently: one-word labels large, two-word labels small; tops drift 10 units | real, CS1 |
| C | `cover-split-image` (memphis), `closing-centered/big-type` (memphis), `cover-kinetic/start` (glass): 4.0–4.2 : 1 | ink just under 4.5 : 1 on the style's accent fields | real, CS1 |
| C' | `comparison-matrix/base`, `/lines` (glass): axis label 1.3 : 1 | the label reads fine on the dark mesh in the PNG; the oracle samples a light gradient stop as its background | check the oracle's background sampling, CS1 |
| D | `agenda-flow`, `agenda-marker-cards`, `content-icon-cards`, `process-marker-flow/four` (editorial) | title rule + four numbered markers = 5 accent uses, editorial allows 4 — content-independent, every editorial deck | decide: count a peer series once, or neutral markers in editorial, CS1 |
| E | `section-divider/minimal`, `section-title/base`, `cover-facts/plain` | a short title leaves 9–30 % fill; minimal by intent | gate works as designed (the picker moves on in code, no model call); no change |

### 2.1 After CS1 + CS2

| Level | CS0 | CS1 + CS2 |
|---|---|---|
| `same` | 28 | **18** — sparse dividers 9 (group E, by design), editorial accent 6 (group D, owner), glass contrast 3 (C', owner) |
| `words` | 461 | **28** — the title's new character budget is a promise the designs keep; the rest are the `same` 18 plus 10 single slots at their word maximum |

## 3. Decisions

1. **The bar is S4.1's** (`slideProblems`): oracle errors and warnings outside the design checks,
   plus the quality gate. Same as the dry run's repair loop.
2. **Capacity is measured, not estimated.** `designCapacity` runs the oracle; the backend gives the
   fill stage the numbers for the design it picked (spro: `POST /designs` with `capacity: true`).
3. **Guidance follows the measurement.** `tls.t.title`'s "1–12 words" becomes a character budget
   by role (CS2) — Vietnamese syllables make word counts meaningless across languages.

## 4. Phases

| Phase | Work | Done when |
|---|---|---|
| CS0 | harness, capacity, CLI, spec ratchet (`same` ≤ 28) | done 2026-10-11 |
| CS1 | fix groups A, B, C; lower the ratchet | done 2026-10-11: `same` 28 → 18 (A: `agenda-split-rail` title `size: fit`; B: peer shapes share one label step — `peerShapeSteps`, grid/row pass `peerStep` through `layoutChild`, hub at `lg`; C: memphis `textMuted` #433D3A). C' and D are open (§6) |
| CS2 | `tls.t.title` guidance as a character budget | done 2026-10-11: "at most 40 characters (60 on a cover or section)"; `words` 461 → 28; digest snapshot updated (one line), the 12k detail budget held |
| CS3 | spro: `/designs` returns `designCapacity`; fill prompt carries it (spro phase 4) | spro side |

## 5. Progress

| Date | Phase | Result | Next |
|---|---|---|---|
| 2026-10-11 | CS0 | 841 runs, `same` 28 / `items` 125 / `words` 461; title capacity p10 41, median 52; ratchet in `content-stress.spec.ts` | CS1 group A |
| 2026-10-11 | CS1 + CS2 | `same` 18, `words` 28; ratchet lowered to 18; specs: content-stress, tls-m-shape (peer step), layout library, patterns, composition, dry-run, styles, digest, title — green; tsc production 0 | owner: §6 open items; spro: CS3 |

## 6. Notes — CS0

- Not built: nested pattern lists (children of containers) are not counted in `designCapacity`
  (only top-level region blocks' list slots); `blocks`-kind slots are filled but not resized.
- `min` failures are mostly `quality/thin-region` — a design for 3–8 items with 2 looks unfinished.
  The picker does not know the item count; S3 (fill) does. Worth a count-aware filter later.
- Text is cut at `maxChars` where a slot has one; very few slots do (most limits live in prose
  guidance), which is why the harness parses `A–B items` / `A–B words`.

## 6. Notes — CS1 / CS2

- **A, `agenda-split-rail`.** Not memphis only: every style broke the lead title inside a word in
  English ("Hypothe / sis", 8 of 20 style × language pairs). `size: fit` steps down instead; a long
  single word then leaves the slide sparse (6 of 20) — the gate's honest verdict, the picker moves on.
- **B, peer label step.** `tls.m.shape` chose its label step alone, so peers came out in up to three
  type sizes. New: `peerShapeSteps(children, boxes, ctx)` (tls-m-shape/layout.ts) groups shapes of
  one kind and size, takes the lowest step any needs, and `tls.l.grid` / `tls.l.row` pass it as
  `layoutChild(…, { peerStep })` (additive option, `contextPeerStep(ctx)`, carried through
  `withBox` like CMP4's tracks). The hub moved to `lg` circles so the shared step stays readable.
  Covers any row/grid of shapes; shapes nested in stacks (agenda-flow/shapes) are not peers here.
- **C, memphis.** `textMuted` #4A4440 → #433D3A (the oracle's own fix), for footer/meta text over the
  masters' pink half-disc.
- **Open — text over master motifs (C, C').** The ink guard solves a block's ink against its own
  paint and the slide background, not the style master's motifs. Text placed over a motif fails the
  report: memphis' half-disc (fixed by the palette, borderline), glass' cyan orb under a closing's
  contacts and a cover's text (1.2:1), glass `cover-kinetic` kicker 4.2:1, glass `comparison-matrix`
  axis labels 1.3:1 against a light mesh stop (reads fine in the render — the sample point may be
  the issue). Options: keep motifs out of the footer band, or let the guard see master paint.
- **Open — editorial accent budget (D).** Title rule + four numbered markers = 5 accent uses,
  editorial allows 4; every editorial deck with these four designs fails, whatever the content.
  Options: count a peer series (same block type, same role in peers) as one use, or neutral markers
  in editorial.
- **Not done:** no `tools/visual/scenarios` scenario: the designs were looked at as resvg renders of
  the export SVG (spro slide-engine), not in the browser editor.
