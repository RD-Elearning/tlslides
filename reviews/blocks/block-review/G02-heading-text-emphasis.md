# G02 — heading + text + emphasis (12 blocks)

Part of the block UI review: read [README.md](README.md) (checklist §2, rules §3, commands §4) before touching code.

Run: `REVIEW_CATEGORY=<category> node tools/visual/shoot.js block-review --width=1600 --height=900` for each of: `heading`, `text`, `emphasis`. Shots land in `tools/visual/shots/review/<category>/`.

**Status:** ✅ done (12/12: 0 pass unchanged, 12 fixed, 0 open) — but see **Verification caveat** below · **Agent:** G02 review-and-fix agent, 2026-10-05 · **Last commit:** `2a5fa613`

> **Verification caveat.** The dev server on :5433 stopped picking up `packages/tldraw/dist` after
> 16:35:51 UTC (shared issue X1). Everything in the first rebuild (quote glyph + autofit, statement
> highlight, takeaway bar, kicker marker, examples, most sizes) was re-shot in the real app and
> looked at. The second-round changes — **quote-image path mark + min 960x480** and **subtitle
> preferred 960x110** — are verified by unit tests and by rendering the src layout through
> `renderNodeToDom` (SSR) and `renderNodeToSvg` in headless Chromium, not by the app shoot.
> Re-shoot `REVIEW_BLOCKS=tls.c.quote-image,tls.t.subtitle` once the dev server is restarted.

## Blocks

Columns are the §2 checks. Cell values: ⬜ not checked · ✅ pass (as-is) · 🔧 fixed · ❌ broken, not fixed (see Findings) · ⏸ blocked (see Findings) · n/a.

| Block | Category | Scope | Kind | C1 card | C2 drop+inspector | C3 wide | C4 narrow | C5 motion | C6 AI metadata | Status | Commit | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tls.t.title | heading | element | layout | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `2a5fa613` | min 200x40 needed 317 tall → 640x100. Flash when used as a *body* block: X4 |
| tls.t.subtitle | heading | element | layout | 🔧 | 🔧 | ✅ | ✅ | ✅ | 🔧 | 🔧 | `2a5fa613` | 800x80 wrapped + clipped "board"; now 960x110. Card text still tiny: X5 |
| tls.t.kicker | heading | element | layout | ✅ | ✅ | 🔧 | ✅ | ✅ | 🔧 | 🔧 | `7805d506` | marker dot sat on the first letter (marker: true); 400x34 / min 160x34 |
| tls.t.body | text | element | layout | 🔧 | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `5c4f6837` | 2-sentence example; avoid names caption + footnote; min 560x170 |
| tls.t.caption | text | element | layout | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `5c4f6837` | caption vs footnote disambiguated; 640x64 / min 400x64 |
| tls.t.footnote | text | element | layout | 🔧 | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `5c4f6837` | 2-line example; min 480x60. Card still a speck at 1100 wide: X5 |
| tls.t.definition | text | element | layout | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `2a5fa613` | min 280x140 needed 583 tall → 480x400 |
| tls.t.quote | emphasis | element | layout | 🔧 | 🔧 | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `b4481fa0` | clipped glyph, mark touching text, rule over text, attribution outside box; autofit |
| tls.t.takeaway | emphasis | element | layout | ✅ | ✅ | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `5c4f6837` | accent bar flush with bottom / below the tint; avoid → callout; min 480x170 |
| tls.t.statement | emphasis | element | layout | 🔧 | 🔧 | 🔧 | ✅ | ✅ | 🔧 | 🔧 | `29de0427` | highlight landed words to the right of its run; min 400x310 |
| tls.t.callout | emphasis | element | layout | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | `2a5fa613` | min 240x90 needed 341 tall → 480x180 |
| tls.c.quote-image | emphasis | slide | layout | 🔧 | 🔧 | 🔧 | 🔧 | ✅ | 🔧 | 🔧 | `e9a6b498` | tiny '"' text mark → curly path; min 640x360 needed 601 → 960x480 (see caveat) |

## Findings

One entry per problem: block, check id, what was wrong (with the shot file name), what was done, and the test that now covers it. Problems outside this group's files go to **Shared issues raised** below instead.

**Method note.** Besides the shots, every block's `describe.example` was laid out at `size.preferred`,
`size.min`, a full-width (1760) and a half-width (860) box in node, and the minimal height that
fits was searched per width. That found most of the C6 size problems below; every block now has a
spec test "the example fits size.preferred / size.min with nothing escaping it".

1. **tls.t.quote — C3/C4/C1/C2** (`emphasis/t-quote.wide.png`, `t-quote.card.png`, `t-quote.drop.png`).
   The glyph `path` was drawn at its 100x80 master size inside a box sized `min(15% w, 25% h, 120)`;
   paths are not viewBox-scaled, so the wide region showed only a sliver of the first mark. The
   text started at 0.8 x glyph width while the ink spans 0.92 (mark touching "The"). `markStyle:
   'rule'` drew a horizontal bar over the first text line. At 800x400 the 4-line quote pushed the
   attribution out of the box (card `nodesOutsidePreview: 1`, drop showed no attribution).
   Fix: `scaledGlyphPath()` scales the master into the box, glyph sized from the text, text offset
   from the ink width, vertical rule bar, autofit 5% steps to 0.6. Size 960x400 / min 480x380.
   Tests: `tls-t-quote.spec.ts › RV02 — fits its box` (4 tests).
2. **tls.t.statement — C3/C1/C2** (`emphasis/t-statement.wide.png`, `t-statement.card.png`).
   Highlight/underline rects were offset with `ctx.measureText` (estimate, 1206 units for a prefix
   the browser draws at 918), so the highlight started under "ngine." and ran 250 units past the
   text. Fix: run offsets from the per-glyph table (`tableMetrics`, as `composite/_kit` and
   `chrome/_kit` already do) with a 1.08 bold factor. The existing rect-position test asserted the
   estimate position; it now asserts the table position (intended fix, same tolerance). Test:
   `RV02 — highlight sits on its run` pins the example against browser-measured widths.
3. **tls.t.kicker — C3** (found by reading `layout.ts`; the example has `marker: false`). The
   marker reserved only the `xs` gap (12) while the dot is 0.6 em (13.2): the dot overlapped the
   first letter. Fix: text starts after dot + gap; dot centred on the first line. Verified with an
   SSR render of `marker: true`. Test: `RV02 — marker and box`.
4. **tls.t.takeaway — C3/C4** (`emphasis/t-takeaway.wide.png`: bar touches the card's bottom
   edge). Bar height was `max(content, 40% of box) + pad` from `y = pad`: flush with the bottom and,
   in a 600-tall box, 264 tall inside a 130-tall surface. Fix: bar = content height, equal insets.
   Test: `the accent bar spans the content with equal insets…`.
5. **tls.c.quote-image — C3/C1** (`emphasis/c-quote-image.wide.png`, `.card.png`). The opening
   mark was a `“` text glyph at the quote's own size: a small stray `"` floating 100 units above
   the quote. Fix: the tls.t.quote curly path, 120 wide (quote cap size when the photo is short),
   with the chart-kit path convention (node box = block box at origin) so DOM and SVG agree.
   Tests: `RV02 — big opening mark and an honest min` (3 tests).
6. **tls.t.subtitle — C1/C2** (`heading/t-subtitle.drop.png`, `.card.png`). At the 800x80
   preferred box the estimate wrapped the example to two lines (108 tall) and the second line was
   clipped. Preferred 960x110 (one line), min 560x108. Test: one line at preferred.
7. **AI metadata (C6) — caption vs footnote vs body.** Caption's example was "Source: internal Q3
   financials" and body's `avoid` sent source lines to caption, while footnote's `when` claims data
   sources. Caption now describes a figure (example "Figure 2 — Store traffic peaks on Saturday
   afternoons"; `avoid` → tls.t.footnote for citations); body's `avoid` names both; takeaway's
   `avoid` sends tips/warnings to tls.t.callout. Body example is now two sentences, footnote's two
   lines (both were a single short line in a large card). Digest snapshot regenerated for these
   only.
8. **Dishonest `size.min` (C6/C4) — all 11 element blocks.** Every min was far below what the
   example needs (title 200x40 → 317 tall, definition 280x140 → 583, quote 300x200 → 1337,
   callout 240x90 → 341, statement 320x140 → 416…). New mins are the smallest box (at a sensible
   column width) where the example fits; caption's preferred grew to 640x64 and kicker's to 400x34
   so `min <= preferred` holds. Commits `2a5fa613`, `5c4f6837`, plus the per-block ones.

Checked and passing as-is: drag-drop adds exactly one shape at the drop point with no page error
for all 12; inspectors show sensible fields (definition's Elements toggles, footnote's list,
quote-image's photo/alt/quote/name/role); no report escapes/overflow/stuck parts; every chain
completes (`2/2` wide, `1/1` narrow); quote's `quote-in` chain shows mark → text → attribution in
the mid frames (`custom/t-quote.wide.mid-500.png`).

## Shared issues raised

Problems whose fix lies outside this group's files (README §3 rule 1). The controller copies them into README §5.

| # | Area (suspected file) | Symptom | Shot / evidence |
|---|---|---|---|
| X1 | dev server (`examples/nextjs-sample`, `next dev -p 5433`) | **Stopped recompiling `packages/tldraw/dist` after 16:35:51 UTC.** `.next/static/chunks/_app-pages-browser_components_*.js` stay at 16:35:50 through two later builds and a `touch` of `dist/index.{js,mjs}`; the app keeps serving the old bundle (drop size of tls.t.subtitle stays 1200x110 although dist has 960x110). Every agent's re-shoots after that time are stale. Needs a dev-server restart by whoever owns it. | `custom/report.json` (`drop.shape.size`), `.next/static/chunks` mtimes |
| X2 | `blocks/parity-harness.ts` / `parity-worker.ts` | The standard-suite test "DOM and SVG agree at medium size (parity probe)" hangs (>150 s, even for untouched tls.t.callout); killing jest leaves an orphaned `parity-worker.ts` + chrome-headless-shell. G02 ran its specs with `-t '^(?!.*parity).*$'`. | `jest src/blocks/library/text/tls-t-callout -t parity` |
| X3 | `blocks/render-svg.ts` (`case 'path'`) | render-svg emits `<path d>` untranslated by `node.box.x/y`; render-dom draws it in an `<svg>` positioned at the box with `viewBox 0 0 w h` (box-local `d`). A path node with a non-zero box lands in different places in DOM vs SVG export (tls.t.quote's glyph goes to the block's top-left corner in SVG). Charts dodge it by using a full box at the origin. | SSR vs SVG render of `tls.t.quote` at 480x380 |
| X4 | motion build steps (`motion/` or DeckViewer build-step pre-hide) | **Flash of final content**: tls.t.title placed as the *second* block of an expressive slide is fully visible from 0 to ~400 ms, then disappears and plays its `words-in` step. tls.t.body / tls.t.statement in the same position are correctly hidden. Low impact (a second title block is unusual) but it is a real flash. | `custom/t-title.wide.mid-120.png` (block solid) vs `custom/t-title.wide.mid-600.png` (block blurred in) |
| X5 | `components/BlockInserter/BlockPreview.tsx` | Cards scale the block from its `size.preferred` box, so wide blocks with small type are illegible specks: footnote (1100 wide, 18 px → ~3 px), subtitle, kicker, caption. Scaling to the laid-out content bbox would fix all of them. | `text/t-footnote.card.png`, `heading/t-subtitle.card.png`, `heading/t-kicker.card.png` |
| X6 | `blocks/layout/measure.ts` `estimateMetrics` (and `text/_engine/text-place.ts`, shared with G03) | The default measurer runs 15–30 % wide on Inter (prefix measured 1206 vs 918 drawn). Text wraps far earlier than needed in the editor/card (statement wraps after "is" in a 1200 box), and `placeText` centring is off-centre by half the error. `tableMetrics` is within ~3 %. G02 only switched its own highlight offsets. | `emphasis/t-statement.drop-canvas.png`, `heading/t-subtitle.drop.png` (pre-fix) |
| X7 | `tools/visual/scenarios/block-review.js` (present pass) | For every block after the first in a category, `<slug>.present.png` shows the normal editor (toolbar, no "Build n/n" bar): presentation mode is toggled off/on out of step with `changePage`. | `emphasis/t-callout.present.png`, `text/t-definition.present.png` |
| X8 | `tools/visual/scenarios/block-review.js` (`REVIEW_MID` default) | Subtle entrances finish before 350 ms, so every `narrow.mid-350/900` frame equals the settled frame and shows nothing about motion. `REVIEW_MID=40,120,220` catches them. | `*/*.narrow.mid-350.png` (pixel-identical to `*.narrow.png`) |
| X9 | slide layouts / harness (`blank` layout for slide-scope blocks) | tls.c.quote-image describes itself as a *full-bleed* photo, but in the `blank` layout it gets the content margins (80 px all round), so it is never full bleed. Either the harness/planner should use a bleed region for slide-scope photo blocks, or the description should drop "full-bleed". Not changed: the fix belongs to whoever owns slide layouts. | `emphasis/c-quote-image.wide.png` |

## Session log

| Date | Agent | Moved | Notes for next session |
|---|---|---|---|
| 2026-10-05 | G02 agent | 12/12 reviewed, 12 🔧 (commits `b4481fa0` `e9a6b498` `29de0427` `7805d506` `5c4f6837` `2a5fa613`), 9 shared issues | Restart the dev server (X1), then re-shoot `REVIEW_BLOCKS=tls.c.quote-image,tls.t.subtitle REVIEW_CATEGORY=` and look at the card/drop/wide/narrow PNGs. Run the parity probes once X2 is fixed (quote-image, statement, callout, footnote, definition use the standard suite). |
