# 5. The Three Product Pillars: AI Generation, Element Templates, Animation

Your stated goal:

> Users upload content → AI drafts the slide content → users pick element templates to apply to
> slide components → users configure display animation for items within a slide.

This document assesses each pillar against what the codebase actually provides.

---

## 5.1 Pillar 1 — Upload → AI → slides

### What exists

| Piece | Status |
|---|---|
| Asset upload hook | ✅ `onAssetCreate(file, id) => Promise<string \| false>` on `<Tldraw>` |
| Reference upload backend | ✅ S3 presigned POST at `apps/www/pages/api/upload.ts` (5MB cap) |
| Programmatic shape creation | ✅ `createShapes`, `loadDocument` — see document 3 |
| Bulk document load | ✅ `app.loadDocument(doc)` (`TldrawApp.ts:1374`) |

### What is missing

| Gap | Detail |
|---|---|
| **Document import** | Only `.tldr` (its own JSON) is importable (`state/data/filesystem.ts:58, 79`). No PDF, DOCX, PPTX, or Markdown parsing. "User uploads content" means **you build the ingestion pipeline entirely** — that is Next.js/server work, not editor work. |
| **A layout engine** | The AI can emit shapes, but nothing decides *where* they go. With no slide frame (see below) there is no coordinate space to lay out against. |
| **Text that fits** | See below — the single biggest technical obstacle. |

### Blocker A: no slide frame

Repeated from document 1 because it bites hardest here: **`TDPage` has no width, height, or
aspect ratio** (`types.ts:144`, `core/src/types.ts:28-34`). An AI generating a slide has no canvas
dimensions to target. Every prompt would have to invent coordinates, and every slide would export
at a different size.

**You must add a slide frame before AI generation is viable.** See **F-01** in document 6.

### Blocker B: text does not wrap and does not fit

This is the highest-risk item in the whole AI pillar.

- `TextShape` is `{ text: string }` with **no width** (`types.ts:378-381`). Bounds come from DOM
  measurement with `white-space: pre` (`state/shapes/shared/getTextSize.ts:6-70`) — **text never
  wraps**. An AI-generated sentence runs straight off the slide.
- `StickyShape` wraps (`StickyUtil.tsx:340-341`) but has a fixed size and **no shrink-to-fit** —
  overflow is clipped.
- There is **no rich text at all**: no bold, italic, bullets, numbered lists, or mixed sizes.
  Style applies to the whole shape. For slide content — which is overwhelmingly bulleted — this
  is a first-order limitation.
- Under SSR, `getTextLabelSize` returns a hardcoded `[10, 10]` (`getTextSize.ts:54-57`), so you
  cannot measure text server-side to pre-layout.
- After webfonts load, bounds are stale until `app.refreshBoundingBoxes()` (`TldrawApp.ts:3154`)
  — already wired to `document.fonts` `loadingdone` (`Tldraw.tsx:260-269`).

**Three options, in increasing order of cost:**

| Option | Cost | Assessment |
|---|---|---|
| **(a) Pre-wrap server-side** — AI emits explicit `\n`, you estimate widths with a font-metrics library | S | Fast to ship, fragile. Estimates drift from browser rendering, especially with webfonts. |
| **(b) A text block as a custom component** (document 4) — a React rich-text component inside a `ComponentShape` | **M — recommended** | Sidesteps the entire plain-string model. Gives you bold/italic/bullets/auto-fit *for free* from an off-the-shelf editor (Lexical, TipTap, Slate). Cost: SVG export needs a serializer. |
| **(c) Add a real rich-text model to `TextShape`** | XL | Replaces the type, every text renderer, `<textarea>` editing, `getTextSvgElement.ts`, and needs a migration. Only worth it if you must keep pure-SVG export. |

**Recommendation: (b).** It resolves rich text, wrapping, and auto-fit in one move and reuses the
custom-block infrastructure you want anyway.

### Recommended AI generation architecture

```
upload → parse (your pipeline) → LLM → structured slide JSON (your schema, NOT TDDocument)
       → deterministic layout engine (your code, frame-aware)
       → TDDocument
       → app.loadDocument(doc)   ← one atomic call
```

Two design rules, both grounded in findings from document 3:

1. **Never let the LLM emit `TDDocument` directly.** Emit *your* semantic schema
   (`{ layout: 'title-bullets', title, bullets[], image? }`), then compile it deterministically.
   The LLM should not be choosing pixel coordinates, shape ids, or `childIndex` values.
2. **Build the whole document server-side and load it once.** `createShapes` is hard-wired to
   `currentPageId` (`TldrawApp.ts:2542`), so incremental generation means N × (`createPage` →
   `changePage` → `createShapes`) — N undo entries and N persists. `loadDocument` is one command,
   one render.

⚠️ Also: **presentation mode silently reverts programmatic writes.** `togglePresentationMode` sets
`readOnly = true` (`:988`) and `cleanup` does `next.document.pages = prev.document.pages`
(`:486-488`). Guard your AI-write path against it.

---

## 5.2 Pillar 2 — Element templates

### What exists: nothing

Grepping `template|preset` across `packages/tldraw/src` and `apps/www` returns **only CSS
`gridTemplateColumns`**. There is no template gallery, no starter deck, no master slide, no
symbol/component concept, no theme preset. The only "starting point" is a hardcoded two-empty-
slide `defaultDocument` (`TldrawApp.ts:3718-3756`).

### But the core primitive already exists

`TldrawApp.paste` (`:1805-1877`) contains exactly the logic a template system needs:

- remaps every shape and binding id via `Utils.uniqueId()` (`:1817-1818`)
- rewrites `parentId` and `childIndex` to land on the current page (`:1823-1835`)
- rewires `handle.bindingId` references (`:1836-1842`)
- merges in any assets not already present (`:1809-1816`)
- re-centers the pasted group on a target point (`:1851-1867`)

The problem: it reads from `navigator.clipboard`, and the reusable core
(`pasteInCurrentPage(shapes, bindings, assets)`) is a **local closure**, not an exposed method.

### Recommended design

**Step 1 — expose the primitive.** Lift `pasteInCurrentPage` into a public method:

```ts
insertContent(
  content: { shapes: TDShape[]; bindings: TDBinding[]; assets: TDAsset[] },
  options?: { point?: number[]; pageId?: string; select?: boolean }
): this
```

Effort: **S**. Pure refactor of existing, working code.

**Step 2 — define a template format.** A template is stored JSON — essentially `copyJson`
(`:2021`) output — plus metadata:

```ts
type ElementTemplate = {
  id: string
  name: string
  category: 'title' | 'bullets' | 'quote' | 'stat' | 'image-left' | ...
  thumbnail: string
  frame: { width: number; height: number }   // requires F-01
  shapes: TDShape[]
  bindings: TDBinding[]
  slots: Array<{                              // ← the key addition for AI
    shapeId: string
    role: 'title' | 'body' | 'image' | 'caption'
    constraints?: { maxChars?: number; maxLines?: number }
  }>
}
```

**`slots` is what makes templates AI-usable.** The AI fills named roles; your compiler maps role
→ shape id → content. The AI never touches geometry.

**Step 3 — two kinds of template.**
- **Element templates** — a group of shapes applied *into* a slide (a stat block, a quote card).
- **Slide layouts** — a whole-slide arrangement with slots (title+bullets, section header).

Both use the same format; only the scope differs.

**Step 4 — theming.** Because templates store concrete `ShapeStyles`, a template is locked to the
12 named colors and 4 fonts today. A **brand kit** (your own palette/fonts) requires the arbitrary-
hex work in document 2 (**L**), or — again — custom component blocks, which are styled with your
own CSS and are immune to `ShapeStyles` entirely.

### Effort summary

| Item | Effort | Depends on |
|---|---|---|
| `insertContent()` public API | S | — |
| Template JSON format + slots | S | F-01 (frame) |
| Template picker UI | M | your Next.js app |
| Applying a template to an existing slide (replace vs merge semantics) | M | `insertContent` |
| Brand-kit theming of templates | L | arbitrary hex (document 2) |

---

## 5.3 Pillar 3 — Per-item animation

### What exists: nothing at all

Verified by grep. The only `easing` code in the repo is **geometry, not animation** — arrow curve
sampling (`arrowHelpers.ts:59, 88`) and freehand smoothing (`drawHelpers.ts:8-13`). The only
`transition` declarations are CSS hover and drag-ghosting effects
(`ImageUtil.tsx:147`, `StickyUtil.tsx:324`, `TextLabel.tsx:165`, `Deck.tsx:220`).

There is no animation model, no timeline, no playback engine, and no slide transitions.

### There is no free-form metadata field either

This matters for where you store animation config. Checked directly:

- `TDBaseShape` = `{ style, type, label?, handles? }` (`types.ts:297-302`)
- `TLShape` = `{ id, type, parentId, childIndex, name, point, assetId?, rotation?, children?, handles?, isGhost?, isHidden?, isLocked?, isGenerated?, isAspectRatioLocked? }` (`core/src/types.ts:67-83`)
- `TDMeta` = `{ isDarkMode: boolean }` (`types.ts:153-155`) — **renderer meta, not per-shape storage**

So there is **no `meta` bag to hide animation data in**. You must add a field.

Good news from document 2: because there is no schema validation and persistence is structural
JSON, **an optional field needs no migration** as long as readers default it.

### Two storage options

**Option A — on the shape:**
```ts
interface TDBaseShape {
  /* ... */
  animation?: {
    entrance?: { effect: 'fade' | 'slide-up' | 'zoom' | ...; duration: number; delay: number; easing: string }
    order?: number       // build order within the slide
  }
}
```
✅ Travels automatically with copy/paste, duplicate, templates, and `moveToPage` — all of which
spread the whole shape object.
❌ Build *order* is denormalized; reordering means touching N shapes.

**Option B — per-page ordered list:**
```ts
interface TDPage {
  /* ... */
  animations?: Array<{ shapeId: string; effect: ...; duration: number; delay: number }>
}
```
✅ Build order is a first-class array — trivial to reorder, and matches how PowerPoint/Keynote
model it.
❌ Needs cleanup on shape delete, and does **not** survive copy/paste or template application
without extra work (`paste` remaps ids but knows nothing about a page-level list).

> **Recommendation: Option A**, plus a derived sort by `animation.order`. It composes with the
> template system (pillar 2) and the existing paste/duplicate machinery for free — which is worth
> more than clean reorder semantics, since reorder is a single UI operation you control.

### The playback engine

This is net-new work with **no foundation in the repo**. Scope:

1. **A player** that, in presentation mode, hides shapes with entrance animations and reveals them
   in `order` on click/keypress. Reveal can be done with the existing per-shape `opacity`/
   `transform` wrappers, or by toggling `isHidden` and animating via CSS.
2. **Hooking the advance action.** `useKeyboardShortcuts.tsx:159-178` currently maps
   left/right directly to `previousPage`/`nextPage` in presentation mode. That must become:
   *advance to next animation step; if none remain, go to next slide.*
3. **An editor UI** — an animation panel listing items in build order with effect/duration/delay
   controls, plus a preview.
4. **Export semantics.** Animations cannot exist in PNG/SVG/PDF output. Decide: export the final
   state (all items visible) — almost certainly the right default.

⚠️ **Constraint:** in presentation mode `readOnly = true` and `cleanup` reverts page mutations
(`TldrawApp.ts:486-488`). The player must therefore drive animation through **transient, non-
persisted state** (React state or `appState`), **not** by mutating shapes.

### Effort summary

| Item | Effort |
|---|---|
| Animation data model (optional field, no migration) | S |
| Editor UI panel (effect / duration / delay / order) | M |
| Playback engine + advance-step integration | **L** |
| Slide-to-slide transitions (separate from per-item) | M |
| Export "final state" semantics | S |

**Total: L–XL.** This is the most net-new of your three pillars, but it is also the most
self-contained — it does not require fighting the existing architecture, only adding to it.

---

## 5.4 Dependency order

These pillars are not independent. Build in this order:

```
F-01  Slide frame (16:9 artboard)
  ├── enables → Templates (slots need a coordinate space)
  ├── enables → AI layout (needs canvas dimensions)
  └── enables → Consistent thumbnails + export

Custom component blocks (document 4)
  ├── solves → rich text / wrapping / auto-fit  (cheaper than rewriting TextShape)
  ├── solves → charts, tables, branded elements
  └── solves → brand styling without arbitrary-hex work

insertContent() API
  └── enables → Templates

Animation model + player
  └── independent; can proceed in parallel once the frame exists
```

**The two changes that unblock the most downstream work are F-01 (slide frame) and custom
component blocks.** Everything else in your product vision depends on one or both.
