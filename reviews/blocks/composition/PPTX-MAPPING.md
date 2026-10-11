# PPTX mapping — how a laid-out deck becomes a PowerPoint file

**Status:** reference for the deferred exporter (composition plan CMP5, 2026-10-11). Nothing here is
implemented. The tree is export-ready: X1–X12 in [SURVEY.md §B3](SURVEY.md#b3-static-output-and-pptx)
are met or written down below. The exporter itself waits for the FastAPI service.

**Recommended route:** FastAPI + `python-pptx`, fed by a JSON dump of the laid-out tree.

- `packages/` stays free of new dependencies.
- The dump is the same tree the editor, the SVG export and the oracle use, so the PPTX matches
  what the user saw.
- The alternative is a TS exporter with `pptxgenjs` inside `packages/` (in-editor download). It
  would add a dependency and needs the owner's approval (BACKLOG-visual-fix §1).

**Fidelity words:**
- **stable**: native DrawingML that looks the same.
- **approximate**: native, but close rather than equal (documented).
- **bake**: render that node to a PNG (`renderSvgToPng`, browser or headless Chromium) and place it
  as a picture.

Units: 1 slide unit = 1 px at 1920 × 1080 = **9,525 EMU**; 1 unit = 0.75 pt.

---

## 1. Input: the node dump

`node tools/layout-report/cli.js <deck.json> --tree [--slide <id|index>]` (CMP1). The same API is
available in-process as `layoutDeck(deck)`, `layoutSlide(slide, ctx)` and `layoutPage(page)`.

```json
{ "deck": "…", "slides": [ { "slideId": "s01", "frame": { "width": 1920, "height": 1080 },
  "nodes": [ { "k": "group", "box": {…}, "blockId": "t1", "type": "tls.t.title",
               "children": [ { "k": "group", "part": "root", "children": [
                 { "k": "text", "part": "text", "box": {…}, "lines": [ { "text": "…", "top": 0, "baseline": 62, "width": 735 } ],
                   "style": { "family": "\"Inter\"", "size": 72, "lineHeight": 1.08, "letterSpacing": -0.03, "color": "#0B1F33" },
                   "weight": 400, "align": "start", "propPath": "text" } ] } ] } ] } ] }
```

- Every top-level node is one block wrapper with `blockId` and `type` (X2). Nested authored blocks
  are wrappers too.
- `part` names are stable. They become shape names and animation targets.
- Boxes of children are relative to their group: add up the group offsets for absolute positions.
- The tree is the **final frame** (X1, J3). Count-ups sit at their final values, wipes and draws
  are complete, and ambient loops are absent.
- Block props stay in the deck spec. Look them up by `blockId` when a native chart or table is
  wanted (X8).
- Style backdrops come first in z-order (`style:mesh`, `style:grain`, motifs) with ids
  `style:<name>`, then region blocks in reading order, overlays last. Array order is z-order.

---

## 2. Node kinds → DrawingML

| Node | DrawingML | Fidelity | Notes |
|---|---|---|---|
| `group` | `p:grpSp` (only when it has ≥ 2 painted children or carries a `blockId`) | stable | `group.clip` (rect) has no PPTX equivalent: crop images through `a:srcRect` and intersect rect boxes. Anything else clipped is **bake** (X6). `group.opacity` multiplies into the children's alpha (approximate). |
| `rect` | `p:sp` `prstGeom rect`, or `roundRect` with `adj = radius / min(w,h)` | stable | `fill` → §3; `stroke` → `a:ln` (`w` = width × 9,525, `prstDash dash` when `stroke.dash`). `shadow` 1/2 → `a:outerShdw` (blur 12/24 units, dist 4/8, 20 % black): approximate. `hard` → an offset solid rect behind it: stable. |
| `path` | `p:sp` `custGeom` from `d` (M/L/C/Q/A/Z; arcs converted to cubics) | stable | Hexagons, chevrons, connectors' routes and chart marks all come through here. `stroke.dash` → `prstDash` (custom `a:custDash` for 4w:2w). |
| `line` | `p:cxnSp` `straightConnector1` | stable | `marker` → `a:headEnd` / `a:tailEnd type="triangle"` (stealth heads are drawn as filled paths in our tree; prefer the native end). |
| `text` | `p:sp` text box, no autofit, `wrap="square"`, one `a:p` per paragraph | stable | Use the node's `lines[]` as hard breaks (`a:br`) so wrapping matches. `style.family` → `a:latin` / `a:ea`; size × 0.75 pt; `letterSpacing` (em) → `spc` = em × size × 100; `lineHeight` → `a:lnSpc spcPct`; `color` → `solidFill`; `weight` ≥ 600 or run `bold` → `b="1"`; `align` → `algn` (`start`=l, `center`=ctr, `end`=r). Runs (`TextRun`) keep their own colour, bold, italic and size. `scale` < 1 (autofit): use size × scale. |
| `image` | `p:pic` | stable | `fit: cover` → crop through `srcRect` from `focal`. `radius` → `roundRect` geometry on the picture. A grain or turbulence data URI (`tls-m-pattern`) is **bake**. |
| `icon` | `p:sp` `custGeom` from the icon's path data (`icons/index.ts`), scaled to the box | stable | Stroke icons: `a:ln` with `strokeWidth`, round caps and joins. |
| `host` (html block) | its `poster` subtree, mapped as above | stable | Since LO7 the poster is the live geometry. Template-only effects (kinetic letters, CSS text gradients) are absent from the poster by design (X7). |

**Effects that are DOM-only** and get dropped or approximated at export:
- Glass `backdrop-filter: blur`: the rgba fill alone remains (approximate, documented in X4).
- Text shadow: not used.
- `mix-blend-mode`: not used.

---

## 3. Paints

| Paint | DrawingML | Fidelity |
|---|---|---|
| `solid` hex | `a:solidFill a:srgbClr` | stable |
| `rgba()` / 8-digit hex | `a:srgbClr` + `a:alpha` (`parseColorAlpha`, CMP1) | stable |
| `linearGradient(angle, stops)` | `a:gradFill` + `a:lin ang = angle × 60000` | stable |
| `radialGradient(cx, cy, stops)` | `a:gradFill path="circle"` + `fillToRect` from cx, cy | approximate |
| Style mesh (several radial rects with alpha) | one `gradFill` shape per rect | approximate |
| Grain (`feTurbulence` image) | picture | bake |
| Theme colour roles | resolved hex in the tree. Optionally map `accent`, `text` and `surface` to `a:schemeClr` accent1/tx1/bg1 so recolouring in PowerPoint works | stable |

---

## 4. Composition parts (CMP1–CMP4)

| Part | PPTX | Fidelity |
|---|---|---|
| Containers `tls.l.stack/row/grid/split/card/overlay` | no node of their own. A card's background is its `rect` (with the shadow above); children are already positioned. Group per `blockId`. | stable |
| Peer tracks, content-height cards | already resolved in the boxes | stable |
| `layer: backdrop` photo + `layer: overlay` lockup | z-order by array order. The scrim is a `rect` with alpha. | stable |
| `tls.t.badge` / `tls.t.marker` | `roundRect` or `ellipse` with a text body (centred) | stable |
| `tls.m.shape` circle / rounded / hexagon | `ellipse` / `roundRect` / `custGeom` hexagon (or `prstGeom hexagon`) + text body + icon | stable |
| `tls.m.icon` `iconStyle: disc` | `ellipse` + icon `custGeom` | stable |
| `tls.x.rule` `dash` | `p:cxnSp` + `prstDash` | stable |
| Connector (`tls.g.connector`, from `SlideSpec.connectors`) | `p:cxnSp`. `route`: straight → `straightConnector1`, elbow → `bentConnector3`, curved → `curvedConnector3`. `head` → `a:tailEnd` / `a:headEnd type="triangle"`. `dash` → `prstDash dash`. `weight` → `a:ln w`. `tone` → resolved colour. `label` → a separate small text box at the route's midpoint over its `label-mask` rect. Snap with `a:stCxn` / `a:endCxn` (`idx` top 0, left 1, bottom 2, right 3) when the endpoint block is one shape. A nested endpoint without its own shape uses the compiled `fromBox` / `toBox` as a free connector. | stable (route shape approximate when PowerPoint re-routes a snapped elbow) |
| Charts (`tls.d.*`) | drawn marks as shapes (stable). Or a native `p:graphicFrame` chart from the block props (`blockId` → `categories`, `series`). | stable / native optional |
| Tables (`tls.d.table`, compare-table) | native `a:tbl` from props, or the drawn cells | stable |

---

## 5. Motion → PowerPoint animation (sidecar, optional)

The PPTX's static content is the final frame. Animation is an optional `p:timing` built from the
same data the web uses:
- `slideTimeline` gives the build steps and order;
- the block recipes give the preset per part;
- part names are the targets (X9).

ppt-master's default is a sound one to keep: object animation **off** by default, slide transition
`fade` 0.4 s.

| Preset (web) | PowerPoint entrance | Fidelity |
|---|---|---|
| `fade` | Fade | stable |
| `fade-up`, `fade-down`, `cover-in`, `section-in`, `closing-in`, `title-then-body`, `title-then-split`, `dashboard-in`, `field-in` | Float In (up/down) or Fade | approximate |
| `pop`, `pop-points` | Zoom (or Grow/Turn) | approximate |
| `wipe-x`, `wipe-y`, `wipe-down`, `mask-reveal`, `reveal-down`, `scrim-then-text` | Wipe (direction) | stable |
| `stagger-lines`, `stagger-children`, `stagger-grid`, `split-in` | the part's effect on each child, "After previous", delay = the capped step (≤ 300 ms total) | approximate |
| `words-in`, `quote-in` | Fade "By word" on the text body | approximate |
| `count-up` | none: the final number shows (Fade at most) | bake-free omission |
| `grow-bars-x`, `grow-bars-y`, `grow-segments`, `grow-branches` | Wipe from the baseline (or Grow & Turn) per bar shape | approximate |
| `draw-path`, `draw-axis-then-nodes`, `sweep`, `sweep-nodes`, `radiate` | Wipe along the dominant direction (a path cannot be drawn on natively) | approximate |
| Connector draw-on | Wipe in the route's direction, after the later endpoint's effect; the arrowhead in the same effect | approximate |
| Nested motion (count-up in a card) | the child's Fade "With previous" inside the card's step | approximate |
| `ken-burns` (ambient) | dropped (or an Emphasis Grow/Shrink loop) | dropped |
| `none` | no effect | — |

---

## 6. Fonts, images, and the rest

- **Fonts (X11).** The style families (Inter, Fraunces, Playfair Display, Be Vietnam Pro,
  Bricolage Grotesque, Patrick Hand, …) are embedded when the license allows; otherwise the deck's
  theme fonts point at them and the delivery check reports what is missing. Vietnamese needs
  fonts with full Latin Extended Additional coverage (all styles' families have it; checked in
  CMP4).
- **Images.** `assetId` / `url` resolve through the backend's asset store. Remote URLs are
  fetched and embedded.
- **Speaker notes.** `SlideSpec.notes` → `p:notes`.
- **Page numbers and footers.** Chrome blocks (`tls.x.*`) are ordinary shapes. They are not
  PowerPoint placeholders.
- **Masters.** One blank layout per deck. The style's backdrop shapes are repeated per slide; the
  exporter may move them to the slide layout when they are identical across slides.

---

## 7. What the exporter must test

- A shape count and z-order snapshot per fixture deck: `__fixtures__/styles/*`,
  `__fixtures__/composition/*`, the pattern looks.
- A rendered comparison against `exportSlidePng` (LibreOffice headless → PNG, pixel-diff
  threshold).
- Text: the line count per text box equals `lines.length` (no re-wrapping in PowerPoint). Turn
  autofit off.
- Connectors stay attached when a user moves a snapped endpoint shape in PowerPoint.
