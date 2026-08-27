# 6. Feature Backlog, Completeness Check & Risks

This is the actionable output of the review. Section 6.2 is the systematic "did we miss
anything?" sweep you asked for — it walks every category of a Canva-style product, not just the
areas already discussed.

**Effort scale:** XS < 1 day · S ≈ 1–3 days · M ≈ 1–2 weeks · L ≈ 3–6 weeks · XL > 6 weeks
(single engineer, excluding design and QA).

---

## 6.1 The critical path

Six items, in dependency order. Everything else waits on these.

### F-01 — Slide frame / artboard · **L** · ⚠️ blocks almost everything

Add a fixed slide rectangle (16:9 / 4:3 / custom) to the data model.

**Why first:** with no frame there is no coordinate space. Templates cannot define positions, AI
cannot lay out content, thumbnails show arbitrary framing (`Deck.tsx:38-51` scales the author's
live camera), export sizes every slide to its own content bounds
(`TldrawApp.ts:3608-3619`), and present mode never auto-fits.

**Scope:**
- Add `size: number[]` (or `frame`) to `TDPage`, and a document-level default on `TDDocument`.
- Render the frame boundary + out-of-frame dimming on the canvas.
- Clamp/guide shape placement; add frame-relative snapping.
- Rewrite `Deck` thumbnails to frame the slide rectangle, not the camera.
- Make `zoomToFit` frame-aware; auto-fit on `changePage`.
- Make export use frame dimensions.
- Migration: bump `TldrawApp.version` (currently `15.3`, `TldrawApp.ts:3716`) and add a
  `version < N` block in `state/data/migrate.ts` defaulting existing pages to 16:9.

### F-02 — Custom component blocks · **M** · ⚠️ unlocks the most

`ComponentShape` + a `components` registry prop on `<Tldraw>`. Full design in
[04-custom-component-blocks.md](04-custom-component-blocks.md).

**Why second:** it converts a large amount of risky canvas-engine work into ordinary Next.js
component work — rich text, charts, tables, branded elements, KPI tiles. It is the cheapest route
to most of the "Canva-like" surface area.

### F-03 — Rich text via a component block · **M** · depends on F-02

Ship a text block backed by an off-the-shelf editor (Lexical / TipTap / Slate) instead of
rewriting `TextShape`. Solves bold/italic/underline, bullet and numbered lists, wrapping,
auto-fit, line height, and letter spacing in one move.

Today `TextShape` is `{ text: string }` in a `<textarea>` with `white-space: pre`
(`types.ts:378-381`, `getTextSize.ts:6-70`) — no wrapping, no formatting. Rewriting that model
properly is **XL**; this is **M**.

### F-04 — `insertContent()` public API · **S**

Lift the id-remapping core out of `TldrawApp.paste` (`:1805-1877`, currently a local closure) into
a public method. Pure refactor of working code. Prerequisite for templates.

### F-05 — Template system · **L** · depends on F-01, F-04

Template JSON format with named **slots**, a picker UI, and apply-to-slide semantics. Design in
[05-ai-templates-animation.md](05-ai-templates-animation.md#52-pillar-2--element-templates).

### F-06 — Animation model + player · **L** · depends on F-01

Optional `animation` field on shapes (no migration needed), an editor panel, and a playback engine
wired into presentation-mode advance. Must use transient state — presentation mode sets
`readOnly = true` and `cleanup` reverts page mutations (`TldrawApp.ts:486-488, 988`).

---

## 6.2 Completeness sweep

A category-by-category audit. **Bold** rows were not covered elsewhere in this review — these are
the "did we miss anything?" findings.

### A. Canvas & editing fundamentals

| Feature | Status | Action | Effort |
|---|---|---|---|
| Pan / zoom / select / transform | ✅ | — | — |
| Snapping, snap lines, grid | ✅ | — | — |
| Group / ungroup, lock, hide | ✅ | — | — |
| Align / distribute / stretch | ✅ | — | — |
| Z-order methods | ✅ | — | — |
| Undo / redo | ✅ | — | — |
| Copy / paste with id remap | ✅ | — | — |
| **Layers panel** | ❌ | Methods exist (`:2768-2795`); no UI. Slide work is layer-heavy — build one. | M |
| **Rulers & user guides** | ❌ | Standard in design tools. | M |
| **Numeric position/size inspector** | ❌ | No X/Y/W/H/rotation input fields. Essential for precise slide work. | S |
| **Copy/paste style ("format painter")** | ❌ | `app.style()` exists; needs a pick-up/apply UI. | S |
| **Multi-select style editing** | ✅ | `StyleMenu.tsx:120-138` already merges common styles. | — |
| **Duplicate-with-offset / smart duplicate** | ⚠️ | `duplicate()` exists (`:2823`); no repeat-transform. | S |

### B. Slide & deck management

| Feature | Status | Action | Effort |
|---|---|---|---|
| Create / duplicate / delete / rename | ✅ | — | — |
| Next / prev navigation | ✅ | — | — |
| **Reorder slides** | ❌ | **No command, no UI.** `childIndex` is only written by `createPage.ts:18`. Add `movePage` + drag-and-drop in `Deck.tsx`. | M |
| **Rename from the deck panel** | ❌ | `renamePage` exists but is only reachable from the legacy page dropdown (`PageOptionsDialog.tsx:66`). | XS |
| **Slide thumbnails that scale** | ⚠️ | Currently a live `<Renderer>` per slide, uncached, unvirtualized (`Deck.tsx:64-73`). Will not survive a 60-slide deck. Rasterize + cache, or virtualize. | M |
| **Speaker notes** | ❌ | No per-slide metadata field. Needed for a presentation product. | M |
| **Sections / slide grouping** | ❌ | | M |
| **Slide-level background (color/image)** | ❌ | No page background concept at all. Very visible gap for Canva-likeness. | M |
| **Skip/hide slide in presentation** | ❌ | | S |

### C. Text & typography

| Feature | Status | Action | Effort |
|---|---|---|---|
| Plain text shapes | ✅ | — | — |
| **Bold / italic / underline** | ❌ | → F-03 | — |
| **Bullet & numbered lists** | ❌ | → F-03. Critical for slides. | — |
| **Text wrapping** | ❌ | `white-space: pre` — text never wraps (`getTextSize.ts`). → F-03 | — |
| **Auto-fit / shrink-to-fit** | ❌ | → F-03 | — |
| **Line height / letter spacing** | ❌ | `LETTER_SPACING` is a global constant, not per-shape. | S–M |
| **Text on a path, vertical text** | ❌ | Low priority. | L |
| **Font size as a number** | ❌ | Only 3 `SizeStyle` values → 28/48/96px (`shape-styles.ts:79-84`). `FontSize` enum is declared but dead (**B-11**). | M |
| **Custom / brand fonts** | ❌ | 4 hardcoded Google Fonts, loaded from **3 drifted-apart places** (`useStylesheet.ts:5-7`, `TldrawApp.ts:1935`, `StyleMenu.tsx:372-385`). Consolidate first. | M |
| **Text alignment** | ✅ | `AlignStyle` (`types.ts:447-452`). | — |
| **Vertical alignment in a box** | ❌ | | S |
| **Spell check / grammar** | ❌ | Browser-native in `<textarea>`; lost if you move to F-03. | — |

### D. Shapes & elements

| Feature | Status | Action | Effort |
|---|---|---|---|
| Rect, ellipse, triangle, arrow, draw, sticky, text, group, image, video | ✅ | 10 types | — |
| **True line shape** | ❌ | `TDShapeType.Line` is declared with a tool but **no util**; `LineTool` fakes it with a decoration-less Arrow (**B-05**). | S |
| **Star, polygon, rounded-rect, speech bubble** | ❌ | Basic Canva vocabulary. | M |
| **Icon library** | ❌ | Ship as component blocks (F-02) rather than shape types. | M |
| **Illustration / sticker library** | ❌ | Same — F-02. | M |
| **Charts** | ❌ | → F-02 (Recharts in a block). Do **not** build a chart shape type. | M |
| **Tables** | ❌ | → F-02. | M |
| **Connectors with routing** | ⚠️ | Arrows bind to shapes (`canBind`), but no orthogonal routing. | M |
| **Corner radius control** | ❌ | Hardcoded `min(w/2, sw*2)` (`rectangleHelpers.ts:33-34`). | S |

### E. Media & assets

| Feature | Status | Action | Effort |
|---|---|---|---|
| Image / video shapes | ✅ | `ImageUtil`, `VideoUtil` | — |
| Upload hook + S3 reference impl | ✅ | `onAssetCreate`, `apps/www/pages/api/upload.ts` | — |
| **Image cropping / masking** | ❌ | Plain `<img>` (`ImageUtil.tsx:86-92`). Table-stakes for Canva. | M |
| **Image filters / adjustments** | ❌ | CSS filters would be cheap via component blocks. | M |
| **Background removal** | ❌ | Third-party API. | M |
| **Stock photo integration** | ❌ | Product work, not editor work. | M |
| **Asset library / reuse panel** | ❌ | Assets live in the document (`TDDocument.assets`); no cross-deck library. | M |
| **Audio** | ❌ | No audio shape. | M |
| **Alt text on images** | ❌ | **Accessibility gap.** No alt field on `ImageShape`. Add before shipping publicly. | S |
| **`patchAssets` doesn't re-render** | 🐞 | **B-08** — mutates in place with no store update. | XS |

### F. Styling & brand

| Feature | Status | Action | Effort |
|---|---|---|---|
| 4 line styles (draw/solid/dashed/dotted) | ✅ | Already there — see document 2 | — |
| **Change sketchy defaults** | ⚠️ | **XS, highest value-per-minute in the repo.** `shape-styles.ts:174-186` | XS |
| **Opacity** | ❌ | Ghosting wrappers already exist to hang it on. | S |
| **Arbitrary hex color + picker** | ❌ | 12 named colors only. Blocks any brand kit. | L |
| **Arbitrary stroke width** | ❌ | 3 fixed values; ~15 ad-hoc multipliers downstream. | M |
| **Gradients** | ❌ | Nothing exists; export path makes it hard. Consider F-02 instead. | XL |
| **Shadows / blur** | ❌ | Same. | L |
| **Independent fill color** | ❌ | `isFilled` is a boolean; fill is always a wash of the stroke color. | M |
| **Line caps / joins** | ❌ | 13 hardcoded `strokeLinecap="round"` sites. | S |
| **Brand kit (palette/fonts/logos)** | ❌ | Depends on arbitrary hex + custom fonts. | L |
| **Theme presets** | ❌ | | M |
| **Dark mode** | ✅ | Real, with per-theme palettes. | — |
| **`FontStyle.Serif = 'erif'` typo** | 🐞 | **B-01** — persisted value is literally `"erif"`. Fixing needs a migration. | S |

### G. Templates

| Feature | Status | Action | Effort |
|---|---|---|---|
| Any template concept | ❌ | → F-04, F-05 | — |
| Slide layouts with slots | ❌ | → F-05 | — |
| Master slides | ❌ | | L |
| **Saved user templates** | ❌ | Product feature on top of F-05. | M |
| **Theme/template switching on an existing deck** | ❌ | Hard: requires slot-aware re-layout. | L |

### H. Animation & transitions

| Feature | Status | Action | Effort |
|---|---|---|---|
| Any animation | ❌ | → F-06 | — |
| Slide transitions | ❌ | Separate from per-item builds. | M |
| **Motion paths** | ❌ | Advanced; defer. | L |
| **Auto-advance / timed playback** | ❌ | | S |

### I. Present & share

| Feature | Status | Action | Effort |
|---|---|---|---|
| Present mode (read-only, arrow keys, esc) | ✅ | `TldrawApp.ts:976-991` | — |
| **Browser fullscreen** | ❌ | No `requestFullscreen` anywhere in the repo. Very visible gap. | S |
| **Auto zoom-to-fit on slide change** | ❌ | `changePage` only swaps the id; camera is arbitrary per page. Fixed by F-01. | S |
| **Presenter view (notes + next slide + timer)** | ❌ | Depends on speaker notes. | L |
| **Shareable public present link** | ❌ | Product work. | M |
| **Embed / iframe player** | ❌ | | M |
| **Laser pointer / annotation while presenting** | ❌ | Blocked by `readOnly` in present mode. | M |
| **`readOnly` dual-writer bug** | 🐞 | **B-07** | S |

### J. Export & import

| Feature | Status | Action | Effort |
|---|---|---|---|
| SVG / JSON / PNG / JPG / WEBP (single slide) | ✅ | — | — |
| **PDF export** | 🐞 | Offered in the menu; returns `500 'Not implemented yet.'` **and does not `return`**, writing the response twice (**B-02**, `apps/www/pages/api/export.ts:41`). | M |
| **Whole-deck export** | ❌ | **Every export path is scoped to `currentPageId`.** Most important missing output for a presentation product. | M |
| **PPTX export** | ❌ | Zero references in the repo. Often a hard commercial requirement. | L |
| **Export endpoints hardcoded to `tldraw.com`** | 🐞 | **B-06** — production export would call tldraw's servers. Fix before any deploy. | XS |
| **PDF / PPTX / DOCX / Markdown import** | ❌ | Only `.tldr`. You own the whole ingestion pipeline. | L |
| **Headless render** | ❌ | Rasterizing requires launching a browser. | M |
| **Custom blocks in SVG export** | ⚠️ | HTML blocks have no `#{id}_svg` node; SVG export will silently drop them. PNG (headless Chrome) works. | M |

### K. AI

| Feature | Status | Action | Effort |
|---|---|---|---|
| Any AI integration | ❌ | Entirely your app layer — nothing in the editor blocks it. | — |
| Content ingestion pipeline | ❌ | Your work. | L |
| Semantic schema → `TDDocument` compiler | ❌ | **The key piece.** Never let the LLM emit `TDDocument` directly. | M |
| **AI rewrite/expand on selected text** | ❌ | Needs `app.updateShapes` + selection — easy once text is solved. | S |
| **AI image generation into a slide** | ❌ | Reuses `onAssetCreate`. | M |

### L. Collaboration

| Feature | Status | Action | Effort |
|---|---|---|---|
| Multiplayer editing pattern | ✅ | `useMultiplayerState.ts` — solid, reusable, backend-agnostic | — |
| Presence / cursors | ✅ | `core/src/components/Users/` | — |
| **Comments / threads** | ❌ | Presence exists; comments do not. Common requirement for slide review. | L |
| **Version history + restore** | ❌ | Undo stack only. | L |
| **Per-slide locking / permissions** | ❌ | Only global `readOnly`. | M |
| **Multi-slide sync** | ⚠️ | `replacePageContent` is per-page; multi-slide sync needs your own fan-out. | M |

### M. Product shell (all your work, none exists)

Accounts, projects/dashboard, folders, sharing & permissions, billing, onboarding, analytics,
admin. `apps/www` is a **demo/marketing site for the editor**, not a SaaS shell. Treat all of it
as net-new: **XL**.

### N. Platform & non-functional

| Item | Status | Action | Effort |
|---|---|---|---|
| **React 18/19 compatibility** | ⚠️ | → **R-01** below. Biggest hidden cost in this assessment. | M–L |
| **i18n** | ❌ | No i18n library; all UI strings hardcoded English (`TopPanel.tsx:47-66`). **Relevant if you ship in Vietnamese.** | M |
| **Accessibility** | ❌ | No alt text, no keyboard nav of canvas objects, no screen-reader story. Radix gives some primitives. | L |
| **Performance at deck scale** | ⚠️ | Deck thumbnails are the known bottleneck (§B). Shape culling exists (`useShapeTree.tsx:119-128`). | M |
| **Mobile / touch** | ✅ | The fork did real work here (commits `e1120038`, `9eb1d82f`). | — |
| **Test suite** | ✅ | 71 spec files — genuinely useful for refactoring safety. Note: 10 shape snapshot files will need regeneration if stroke-width math changes. | — |
| **Not published to npm** | ⚠️ | Must vendor as workspace packages (`guides/nextjs-integration.md`). | — |
| **`dist` ships raw JSX** | ⚠️ | Consumers must transpile. | — |

---

## 6.3 Risks

### R-01 — React 18/19 compatibility · **the largest unknown**

`packages/tldraw` declares `react@^17` as a peer dependency and depends on `zustand@^3.6.9`
(`package.json:62`); `packages/core` depends on `mobx-react-lite@^3.2.3` (`package.json:43`).
Both predate `useSyncExternalStore` and are known to **tear** under React 18 concurrent
rendering.

Mitigating evidence: there are **no** `ReactDOM.render`, `findDOMNode`, or
`unstable_batchedUpdates` calls in `packages/*/src`, so there is no hard API blocker — the risk is
subscription tearing, not removal.

**Action: run a time-boxed spike** — mount `<Tldraw>` in a React 19 / Next 15 App Router app and
stress-test drag, multi-select, and undo. Upgrading `zustand` 3→5 and `mobx-react-lite` 3→4 is the
likely fix. **Do this before committing to the fork**, because it gates everything else.

### R-02 — Frozen fork, no upstream

Never published to npm; last upstream sync is a `tldraw@1.9.1` snapshot from ~Nov 2021. You own
100% of future maintenance: React upgrades, security patches, browser compatibility. There is
nothing to pull fixes from.

### R-03 — Build-vs-adopt decision (do this early)

Given the depth of the gaps above, seriously evaluate **current tldraw (v2/v3)** before
committing:

**In favor of migrating:** first-class custom-shape APIs (the `shapeUtils` prop this fork lacks),
rich text, React 18/19 support, active maintenance, built-in sync, a real frame/artboard concept.
Roughly F-02, F-03, R-01, and part of F-01 come for free.

**In favor of staying:** this fork's Deck/slide layer does not exist upstream and would have to be
rebuilt; MIT licensing here is unambiguous; the codebase is small and you now understand it.

⚠️ **Verify licensing before deciding.** Current tldraw SDK versions ship under a non-MIT license
with watermark/commercial terms — confirm the present terms directly with tldraw, as they have
changed over time and this review did not verify them.

**Recommendation:** a 1-week spike building one slide with a 16:9 frame, a custom React block, and
rich text on current tldraw, measured against the F-01/F-02/F-03 estimates here. The answer will
be obvious afterwards, and the spike is cheap relative to the multi-quarter commitment.

---

## 6.4 Suggested phasing

**Phase 0 — Decide (1–2 weeks)**
R-01 React-18 spike · R-03 build-vs-adopt spike · fix B-06 (hardcoded tldraw.com endpoints)
· change the sketchy defaults (XS)

**Phase 1 — Foundation (4–8 weeks)**
F-01 slide frame · F-02 custom component blocks · F-04 `insertContent()` · slide reorder ·
fullscreen present + auto-fit · fix B-01…B-05

**Phase 2 — Content (6–10 weeks)**
F-03 rich text block · F-05 templates with slots · whole-deck export + working PDF · charts &
tables as blocks · image cropping

**Phase 3 — Differentiation (8–12 weeks)**
AI pipeline (ingestion → semantic schema → `TDDocument` compiler) · F-06 animation model +
player · brand kit (needs arbitrary hex) · slide backgrounds

**Phase 4 — Product (ongoing)**
App shell, accounts, dashboard, sharing, billing · comments · version history · i18n ·
accessibility · PPTX export

**Rough order of magnitude to a credible v1: 6–9 engineer-months of editor work**, on top of
whatever the product shell and AI pipeline cost. That estimate assumes staying on this fork; the
R-03 spike could change it materially in either direction.
