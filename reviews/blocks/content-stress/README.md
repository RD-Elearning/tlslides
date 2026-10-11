# Content stress — real content in every design, before any token is spent

**Date:** 2026-10-11 · **Branch:** `plan/block-system`
**Status:** CS0 done (harness, capacity, ratchet). CS1–CS3 open, see §4.
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
| CS1 | fix groups A, B, C (+ C' if the oracle is wrong, D after the owner's call); lower the ratchet | `same` ≤ 7 (group E only); screenshots of each fixed design opened and looked at |
| CS2 | `tls.t.title` guidance: one line, ≤ ~40 characters on content/data/process/comparison/closing slides, ≤ ~70 on covers, sections may run longer; digest snapshots updated | `words` level for `tls.t.title` measured again with the new numbers, < 10 % break |
| CS3 | spro: `/designs` returns `designCapacity`; fill prompt carries it (spro phase 4) | spro side |

## 5. Progress

| Date | Phase | Result | Next |
|---|---|---|---|
| 2026-10-11 | CS0 | 841 runs, `same` 28 / `items` 125 / `words` 461; title capacity p10 41, median 52; ratchet in `content-stress.spec.ts` | CS1 group A |

## 6. Notes — CS0

- Not built: nested pattern lists (children of containers) are not counted in `designCapacity`
  (only top-level region blocks' list slots); `blocks`-kind slots are filled but not resized.
- `min` failures are mostly `quality/thin-region` — a design for 3–8 items with 2 looks unfinished.
  The picker does not know the item count; S3 (fill) does. Worth a count-aware filter later.
- Text is cut at `maxChars` where a slot has one; very few slots do (most limits live in prose
  guidance), which is why the harness parses `A–B items` / `A–B words`.
