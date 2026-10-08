# DeckSpec Schema v1 — Contract Reference

**Version:** 1 · **Date:** 2026-09-16 · **Source:** `BACKLOG-demo.md` §2.2

This is the authoritative contract for `DeckSpec` JSON. **FastAPI and the prompt side read this
file, not `types.ts`.** It must stand alone — no "see §6.7 for details."

---

## Overview

A `DeckSpec` is a complete slide deck as plain JSON. One `DeckSpec` renders in three modes:

| Mode | Renderer | Runs where | Purpose |
|---|---|---|---|
| Edit mode | `renderNodeToDom` | browser + editor | authoring |
| Read-only mode | `renderNodeToDom` + WAAPI | browser, no editor | viewing, with animation |
| Export | `renderNodeToSvg` | pure Node | thumbnail, PNG, PDF, SEO/share |

All three share one `layout()` per block — structural parity is enforced by test, not by eye.

---

## Types

### `DeckSpec`

```ts
interface DeckSpec {
  version: 1                         // always 1 for this contract
  id: string                         // FastAPI's primary key
  title: string                      // deck title
  theme: string | DeckTheme          // built-in theme id OR a full theme object; NEVER hex
  aspect: 'widescreen' | 'standard' | 'square' | [number, number]
  tokens?: DeckTokens                // brand-kit overrides for the resolved token scale
  masters?: MasterSpec[]             // reusable slide templates
  slides: SlideSpec[]                // ordered slides
}
```

**`theme`** — a string like `'mono-grid'` references a built-in theme by id. A full `DeckTheme`
object can override colours and fonts inline. The AI always emits a string id; inline objects are
for programmatic use. The theme resolves to concrete hex at layout time — the deck spec never
contains raw colour values (governing rule: colours are roles, not hex).

**`aspect`** — named presets:
| Preset | Frame (slide units) |
|---|---|
| `'widescreen'` | 1920 × 1080 |
| `'standard'` | 1024 × 768 |
| `'square'` | 1080 × 1080 |

A tuple `[w, h]` in slide units is also valid. Changing `aspect` re-compiles all layouts;
blocks in `free[]` (hard coordinates) will be misplaced — the host must report this.

**`masters`** — an array of `MasterSpec` objects, each with a unique `name`.

---

### `SlideSpec`

```ts
interface SlideSpec {
  id: string                         // stable — FastAPI's key for partial updates
  layout: SlideLayoutId              // one of the 16 shipped layouts (see below)
  role?: 'cover' | 'section' | 'content' | 'closing'
  rhythm?: 'anchor' | 'dense' | 'breath'
  regions: Record<string, BlockSpec[]>  // ARRAY — several blocks per region
  free?: PlacedBlock[]               // blocks the user dragged out of their region
  background?: Paint                 // slide background override
  notes?: string                     // speaker notes
  skip?: boolean                     // skip in presentation mode
  masterId?: string                  // reference to a MasterSpec by name
}
```

**`id`** — required, stable, used by FastAPI for partial updates and by the AI for
cross-referencing.

**`layout`** — one of the 16 shipped layout ids. Required: the layout engine needs it to compile
regions. The layout defines which region names are available.

**`regions`** — named content regions. Each region holds an **array** of `BlockSpec`s. The layout
engine stacks blocks vertically within the region box, separated by spacing tokens. Region names
belong to the layout (e.g., `'two-column'` offers `title`, `left`, `right`). The AI must know
which layout offers which regions.

**`free[]`** — blocks the user dragged out of their region, with explicit coordinates. The AI
never writes `free[]`; it is the editor's round-trip safety net. A block in `free[]` will be
misplaced if the deck's `aspect` changes.

---

### `PlacedBlock`

```ts
interface PlacedBlock {
  block: BlockSpec
  box: Box                           // slide units, 1920×1080 reference frame
}
```

---

### `BlockSpec`

```ts
interface BlockSpec {
  id: string                         // REQUIRED — stable within its slide
  type: string                       // registry key, e.g. 'tls.t.title'
  props: Record<string, unknown>     // content + options
  style?: BlockStyleSpec             // presentation overrides
  motion?: BlockMotionSpec           // animation overrides
  children?: BlockSpec[]             // for container blocks only
}
```

**`id`** — required at the DeckSpec layer. Generated on insert if absent (internal shapes may
lack one; the bridge mints an id). Used for motion targeting, AI cross-reference, and animation
part-key prefix.

**`type`** — the registry key of the block definition, namespaced. Built-ins use `tls.`; a host
uses its own prefix.

---

### `Box`

```ts
interface Box {
  x: number                          // origin top-left, slide units
  y: number
  width: number
  height: number
}
```

---

### `Paint`

```ts
type Paint =
  | { type: 'solid'; color: string }
  | { type: 'linearGradient'; angle: number; stops: Array<{ color: string; at: number }> }
  | { type: 'radialGradient'; cx: number; cy: number; stops: Array<{ color: string; at: number }> }
```

---

### `DeckTheme`

A full theme object (used inline in `DeckSpec.theme`):

```ts
interface DeckTheme {
  id: string
  name: string
  colors: {
    background: string               // hex
    surface: string
    text: string
    textMuted: string
    accent1: string
    accent2: string
    positive?: string                // semantic status colours
    negative?: string
    warning?: string
  }
  fonts: {
    heading: 'script' | 'sans' | 'serif' | 'mono'
    body: 'script' | 'sans' | 'serif' | 'mono'
    headingFamily?: string           // arbitrary CSS font-family override
    bodyFamily?: string
  }
}
```

---

## Slide Layouts (16 shipped)

| Layout id | Regions |
|---|---|
| `title` | `title`, `subtitle` |
| `section` | `title`, `subtitle` |
| `two-column` | `title`, `left`, `right` |
| `three-column` | `title`, `a`, `b`, `c` |
| `four-up` | `title`, `q1`, `q2`, `q3`, `q4` |
| `image-left` | `title`, `image`, `content` |
| `image-right` | `title`, `image`, `content` |
| `image-top` | `title`, `image`, `content` |
| `image-bottom` | `title`, `image`, `content` |
| `grid-3x2` | `title`, `c1`, `c2`, `c3`, `c4`, `c5`, `c6` |
| `grid-2x3` | `title`, `c1`, `c2`, `c3`, `c4`, `c5`, `c6` |
| `comparison` | `title`, `left`, `right` |
| `timeline` | `title`, `items` |
| `quote` | `quote`, `attribution` |
| `kpi-row` | `title`, `kpi1`, `kpi2`, `kpi3`, `kpi4` |
| `blank` | `content` |

Region names are **defined by the layout function** (`blocks/slide-layouts.ts`). Q19 generates
this table from code; a hand-written copy will drift.

---

## Worked Examples

### Example 1: Cover slide (title layout)

```json
{
  "id": "sl_01",
  "layout": "title",
  "role": "cover",
  "rhythm": "anchor",
  "regions": {
    "title": [
      {
        "id": "b1",
        "type": "tls.t.title",
        "props": { "text": { "runs": [{ "text": "Q3 Financial Review" }] } }
      }
    ],
    "subtitle": [
      {
        "id": "b2",
        "type": "tls.t.subtitle",
        "props": { "text": "Infrastructure spend and revenue analysis" }
      }
    ]
  },
  "notes": "Open with the big picture before drilling into infrastructure."
}
```

**What happens:** The `title` layout places `title` in the upper third and `subtitle` below it.
Both blocks are positioned by the layout engine — no coordinates needed.

---

### Example 2: Two-column content slide (§2.4 canonical example)

```json
{
  "id": "sl_03",
  "layout": "two-column",
  "role": "content",
  "rhythm": "dense",
  "regions": {
    "title": [
      {
        "id": "b1",
        "type": "tls.t.title",
        "props": {
          "text": {
            "runs": [
              { "text": "Margin fell on " },
              { "text": "infrastructure", "bold": true }
            ]
          }
        }
      }
    ],
    "left": [
      {
        "id": "b2",
        "type": "tls.d.bar",
        "props": {
          "categories": ["Q1", "Q2", "Q3"],
          "series": [64, 64, 61],
          "highlightIndex": 2
        },
        "motion": { "preset": "bars-grow", "order": 2, "trigger": "onClick" }
      }
    ],
    "right": [
      {
        "id": "b3",
        "type": "tls.t.takeaway",
        "props": { "text": "Compute spend grew 2.4× while revenue grew 1.2×." },
        "motion": { "preset": "fade-up", "order": 3 }
      },
      {
        "id": "b4",
        "type": "tls.t.caption",
        "props": { "text": "Source: internal Q3 financials" }
      }
    ]
  },
  "notes": "Land on the 61 — this is the hinge slide."
}
```

**What happens:**
- `regions.title[0]` → bar chart with build-step animation on click
- `regions.left[0]` → bar chart, fades up on build step 2
- `regions.right[0]` → takeaway text, fades up on build step 3
- `regions.right[1]` → caption, always visible
- Changing `theme` restyles every block; changing `aspect` to `[9,16]` re-lays out the columns

---

### Example 3: KPI row

```json
{
  "id": "sl_04",
  "layout": "kpi-row",
  "role": "content",
  "rhythm": "dense",
  "regions": {
    "title": [
      {
        "id": "k1",
        "type": "tls.t.title",
        "props": { "text": { "runs": [{ "text": "Key Metrics" }] } }
      }
    ],
    "kpi1": [
      {
        "id": "k2",
        "type": "tls.t.hero-number",
        "props": { "value": 61, "unit": "%", "label": "Margin" }
      }
    ],
    "kpi2": [
      {
        "id": "k3",
        "type": "tls.t.hero-number",
        "props": { "value": 2.4, "unit": "×", "label": "Compute Growth" }
      }
    ],
    "kpi3": [
      {
        "id": "k4",
        "type": "tls.t.hero-number",
        "props": { "value": 1.2, "unit": "×", "label": "Revenue Growth" }
      }
    ]
  }
}
```

---

### Example 4: Slide with free-positioned block

```json
{
  "id": "sl_05",
  "layout": "blank",
  "regions": {
    "content": [
      {
        "id": "f1",
        "type": "tls.t.body",
        "props": { "text": "Main content" }
      }
    ]
  },
  "free": [
    {
      "block": {
        "id": "f2",
        "type": "tls.t.caption",
        "props": { "text": "Dragged out of a region" }
      },
      "box": { "x": 1200, "y": 800, "width": 400, "height": 60 }
    }
  ]
}
```

**What happens:** `f1` is positioned by the layout engine inside the `content` region. `f2` is
placed at explicit coordinates in `free[]`. If the user drags `f1` out of its region, the editor
moves it to `free[]` with its new coordinates on save.

---

### Example 5: Full deck with masters

```json
{
  "version": 1,
  "id": "deck_acme_q3",
  "title": "ACME Q3 Financial Review",
  "theme": "mono-grid",
  "aspect": "widescreen",
  "masters": [
    {
      "name": "branded",
      "blocks": {
        "footer": {
          "id": "m1",
          "type": "tls.t.caption",
          "props": { "text": "ACME Corp — Confidential" }
        }
      },
      "background": {
        "type": "linearGradient",
        "angle": 180,
        "stops": [
          { "color": "#0a0a0a", "at": 0 },
          { "color": "#1a1a2e", "at": 1 }
        ]
      }
    }
  ],
  "slides": [
    {
      "id": "sl_01",
      "layout": "title",
      "role": "cover",
      "masterId": "branded",
      "regions": {
        "title": [
          {
            "id": "b1",
            "type": "tls.t.title",
            "props": { "text": { "runs": [{ "text": "Q3 Review" }] } }
          }
        ]
      }
    },
    {
      "id": "sl_02",
      "layout": "two-column",
      "role": "content",
      "masterId": "branded",
      "regions": {
        "title": [
          {
            "id": "b2",
            "type": "tls.t.title",
            "props": { "text": { "runs": [{ "text": "Revenue Breakdown" }] } }
          }
        ],
        "left": [
          {
            "id": "b3",
            "type": "tls.d.bar",
            "props": { "categories": ["Q1", "Q2", "Q3"], "series": [100, 120, 140] }
          }
        ],
        "right": [
          {
            "id": "b4",
            "type": "tls.t.takeaway",
            "props": { "text": "Revenue grew 17% QoQ." }
          }
        ]
      }
    }
  ]
}
```

---

## Key Design Decisions

1. **Colours are roles, not hex.** `DeckSpec.theme` is a theme id or object — never raw hex.
   The theme resolves to concrete colours at layout time.

2. **Region names belong to the layout.** The AI must know which layout offers which regions.
   Q19 generates the layout→region table from code.

3. **`free[]` is the round-trip safety net.** Blocks dragged out of their region get explicit
   coordinates in `free[]`. The AI never writes `free[]`. Changing `aspect` with non-empty
   `free[]` will misplace those blocks — the host must report this.

4. **`BlockSpec.id` is required.** FastAPI uses it for partial updates. Internal shapes that
   lack one get an id minted by the bridge layer.

5. **`regions` holds arrays.** Several blocks can share a region, stacked vertically by the
   layout engine. This replaces the old single-block-per-region `content` field.

6. **Schema version is always 1.** The version field enables future schema evolution without
   guessing.

---

## TypeScript Implementation

The types are implemented in `packages/tldraw/src/blocks/types.ts`. Key differences from this
document:

- `BlockSpec` also has an optional `slot` field for backward compatibility with the Phase 13
  template system — this is an internal bridge concern, not part of the API contract.
- `MasterSpec.blocks` is `Record<string, BlockSpec>` — each block in a master also requires
  `id` per the v1 contract.
- `DeckTheme` is imported from `packages/tldraw/src/types.ts`.

The persisted editor type `TDPage` has two optional fields for round-trip support:

```ts
layout?: SlideLayoutId     // which layout compiled this slide
slideSpecId?: string       // the SlideSpec.id this page was compiled from
```

These are optional — a page that predates this work simply has neither, and loads unchanged.
`TldrawApp.version` stays at 16; `migrate.ts` gets no new block.
