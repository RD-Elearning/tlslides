# 2. Design language — tokens, roles, and the rules blocks must obey

Every value a block draws with comes from here. A block definition that hard-codes a hex, a pixel
size, or a shadow is a bug, not a style choice.

Sources: `ppt-master/skills/ppt-master/references/executor-base.md` (Page Expression Core,
everyday-effects block, layout structures) and `.../references/shared-standards-core.md` for the
design judgment; Phase 12's `DeckTheme` for the existing machinery this extends.

## 2.1 What already exists, and what this adds

`DeckTheme` (Phase 12) is real and shipping: `{ id, name, colors: { background, surface, text,
textMuted, accent1, accent2 }, fonts: { heading, body, headingFamily?, bodyFamily? },
shapeDefaults? }`, five built-ins, resolved live through the `'theme:accent1'` sentinel token so a
theme switch restyles a deck in one move.

Three things it does not have, and blocks need:

1. **Semantic status colors.** `positive`/`negative`/`warning` — a KPI delta, a pros/cons block, a
   traffic-light matrix all need them and none of the six existing roles means "bad".
2. **Scales.** Type sizes, spacing, radius, elevation — currently each template hard-codes
   numbers.
3. **Surface awareness.** A theme picks `text`/`textMuted` for contrast against
   `colors.background`. Phase 11 then lets any slide set any background, and any block set its
   own surface. Put a `mono-grid` stat row on a teal gradient and the muted captions nearly
   vanish — this is a *named open follow-up* in `reviews/roadmap-slides.md`, with a screenshot
   (`tools/visual/shots/export-headless.png`). §2.4 closes it.

All three land as one optional `TDDocument.tokens?: DeckTokens`, defaulted from the active theme
when absent. No migration (§01 1.13).

## 2.2 Color roles

A block never names a color. It names a **role**, and the role resolves against the *effective
surface* it is drawn on.

| Role | Meaning | Default derivation |
|---|---|---|
| `surface` | the ground this block sits on | `theme.colors.surface` |
| `surfaceAlt` | a second, quieter ground (zebra rows, nested card) | `surface` mixed 4% toward `text` |
| `text` | primary foreground on the current surface | contrast-solved from surface (§2.4) |
| `textMuted` | captions, axis labels, sources | `text` at 62% toward surface, floor-checked at 4.5:1 |
| `accent` | the deck's one emphasis color | `theme.colors.accent1` |
| `accent2` | a second categorical hue | `theme.colors.accent2` |
| `positive` | up / good / gain | theme override, else `#0ca30c` family |
| `negative` | down / bad / loss | theme override, else `#d03b3b` family |
| `warning` | caution / at-risk | theme override, else amber family |
| `neutral` | flat / no change / unclassified | `textMuted` |
| `line` | hairlines, dividers, gridlines | `text` at 12–18% alpha |
| `scrim` | the wash over an image behind text | derived from the image's own tone (§2.6) |

**Rules.**

- **60-30-10.** Dominant surface ≈60%, support ≈30%, accent ≈10% of a slide's visual area. The
  linter measures this from the laid-out node tree (it can — layout is data), not by eye.
- **The accent goes on the one number or word that matters, not everywhere.** A block that paints
  three things `accent` has no emphasis; the linter flags >2 accent-painted parts per block.
- **Reserve `positive`/`negative` for real polarity.** Never as "series 1 / series 2". Categorical
  series use the categorical ramp (§2.3).
- **A literal hex does not flip with the UI light/dark theme.** Settled in Phase 8b and it still
  holds: the enum palette flips because whiteboard ink must stay legible; an explicit value is
  "this exact color" and silently shifting it defeats the point. Blocks inherit that semantics.

### Categorical ramp

Charts need a series palette, not a role. `DeckTokens.categorical: string[]` — 6 hues, generated
from `accent1`/`accent2` by rotating hue and holding perceptual lightness, or overridden wholesale
by a host brand kit. Rules: never more than 6 encoded categories (past that, group into "other" or
switch to direct labelling); never re-order the ramp between two charts in one deck; a single
series uses `accent`, not `categorical[0]`, so one-series charts across a deck agree.

## 2.3 Scales

All values are in **slide units** — the 1920×1080 frame from `DEFAULT_SLIDE_SIZE`. A block never
reasons in CSS pixels or in screen space; the camera handles that.

### Type scale

Anchored to `ppt-master`'s 16:9 guidance (title band ≈100px at 1280×720 → ×1.5 for 1920×1080) and
to a 1.25 modular ratio.

| Token | Size | Line height | Use |
|---|---|---|---|
| `display` | 152 | 1.02 | hero number, cover word, chapter numeral |
| `title` | 96 | 1.08 | slide title |
| `heading` | 64 | 1.15 | section/zone heading, card title |
| `subheading` | 44 | 1.2 | subtitle, kicker at scale |
| `lead` | 36 | 1.35 | the page's primary claim, takeaway line |
| `body` | 28 | 1.45 | ordinary copy, bullets |
| `caption` | 22 | 1.4 | captions, data labels, axis labels |
| `footnote` | 18 | 1.35 | sources, page numbers, credits |

**Rules.** Every text part maps to exactly one token, or a value within ±2 units of one (the
`ppt-master` tolerance). Peers on one slide use the same token. A block that wants a size no token
provides either uses the nearest token, or its author proposes a new token to this document —
never a bare number. `ppt-master`'s "sparse display exception" applies: one undeclared display
size may appear at most twice in a deck; a third occurrence means it is a role and needs a token.

### Spacing scale

`3xs 4 · 2xs 8 · xs 12 · sm 16 · md 24 · lg 32 · xl 48 · 2xl 64 · 3xl 96 · 4xl 128`

Slide margin defaults to `3xl` (96 at 1920 ≈ the 40px-at-1280 guidance). Block padding defaults to
`md`; card gap `lg`; column gutter `xl`. `density: 'compact'` shifts every internal gap one step
down, `'roomy'` one step up — one knob, not a dozen.

### Radius

`none 0 · sm 8 · md 16 · lg 24 · xl 32 · pill 9999`. The deck theme's `shapeDefaults.cornerRadius`
sets the default; a block inherits it rather than choosing, so a deck reads as one thing.
`clampCornerRadius` (Phase 8a) still guards over-large values.

### Elevation

Three levels only, and this is a discipline, not a palette.

| Level | Shadow | When |
|---|---|---|
| `0` | none | **the default for everything**, including peer cards in a grid |
| `1` | `0 6 8 rgba(0,0,0,0.10)` | an object genuinely floating over a photo or a colored panel |
| `2` | `0 12 24 rgba(0,0,0,0.18)` | at most one per slide: the primary CTA or an overlay |

From `ppt-master` verbatim: *"Shadow 2–3 genuinely floating objects per page at most… keep
peer-grid cards, dividers, and body containers flat. Reach for weight, spacing, accent bars, and
tints before shadow. Pick one weight tool per container (shadow, border, gradient fill, or strong
tint — never stacked)."* The linter enforces the last clause literally: a part with both a shadow
and a border and a tinted fill is a finding.

One light source per slide: `dx = 0`, `dy` positive. Never black shadow on a dark field — use a
hairline or a restrained glow.

## 2.4 The effective-surface contract — closing the known contrast bug

This is the mechanism that fixes the named follow-up.

Every block is laid out with a `ctx.surface` describing what is actually behind it:

```ts
interface SurfaceContext {
  /** The resolved paint behind this block: the slide background, or the parent block's fill. */
  behind: Paint
  /** Its representative luminance, 0–1. For a gradient, sampled at the block's own box, not at
   *  the slide's center — a block on the dark end of a gradient must know that. */
  luminance: number
  /** Whether an image sits behind this block; forces a scrim decision (§2.6). */
  overImage: boolean
}
```

`resolveColor(role, ctx)` then:

1. Looks up the role's theme value.
2. For foreground roles (`text`, `textMuted`, `line`), **solves for contrast against
   `ctx.luminance`** rather than against `theme.colors.background`: lighten or darken along the
   role's own hue until it clears the floor.
3. Floors: `text` ≥ 4.5:1 always; `textMuted` ≥ 4.5:1 for anything ≥ `caption`, ≥ 3:1 only for
   decorative non-informational text; `line` ≥ 1.4:1 (visible, not loud).
4. Reports what it did. A resolution that could not reach its floor without changing hue returns
   `{ color, ok: false }`, and the linter turns that into a finding naming the block and the
   surface — which is strictly better than silently rendering an illegible caption, which is what
   happens today.

**This is computed at layout time, in a pure function, so it works headlessly and is unit-testable
without a browser.** That matters: the existing bug is invisible to every current test because
nothing measures contrast anywhere.

**Building a `SurfaceContext` (P19, `blocks/tokens.ts`):**

```ts
function surfaceFromBackground(
  background: SlideBackground | string | undefined,
  box: Box,
  pageSize: [number, number],
  theme?: DeckTheme
): SurfaceContext

function surfaceFromPaint(paint: Paint, box: Box, parentBox: Box): SurfaceContext
```

`surfaceFromPaint` takes **three** arguments, not two: a gradient fill spans exactly the box it
paints (the same `objectBoundingBox` convention the slide background already uses), so sampling
"where within that fill does `box` sit" needs a reference frame — `parentBox` — the same role
`pageSize` plays for `surfaceFromBackground`. `box` and `parentBox` are both in the same absolute
slide-unit coordinate space; `surfaceFromPaint` normalizes `box`'s position against `parentBox`
before projecting it onto the gradient, the same way `surfaceFromBackground` normalizes against
the page.

## 2.5 Typography rules

- **Fonts come from the theme pairing, resolved lazily.** Phase 17's `fontToken: 'heading' |
  'body'` and `resolveFont` already do this; block text styles carry the token, never a family, so
  a theme switch restyles them. This also sidesteps the Phase 17 follow-up entirely — that
  follow-up is blocked on `TextUtil.getBounds` caching, and a block does not use `TextUtil`.
- **Inline emphasis is one text frame with runs** (P23), matching `ppt-master`'s rule and its SVG
  `<tspan>` realization. Emphasis is for *numerical results, before/after contrasts, and one or
  two load-bearing nouns per sentence* — never connectives, common verbs, every noun, decorative
  adjectives, or structural text.
- **One paragraph, one text node.** Line breaking happens in layout, producing `TextLine[]` with
  explicit baselines — never sibling text nodes per line, which is what made SVG export drift in
  Phase 15.
- **Autofit shrinks, it does not truncate** (Phase 17's `autoFit`, generalized): minimum scale
  0.75, then reflow, then paginate. Below 0.75 the content genuinely does not belong in that box.
- **Measure ≈ 45–75 characters per line** for body copy. A block whose text column is wider than
  ~75ch at `body` should be reflowed to columns or narrowed, and the linter says so.

## 2.6 Images, scrims and washes

From `ppt-master`'s image-overlay rule, because "text on a photo" is where slide decks most
reliably fail:

- **Never a uniform flat opacity over a whole image, and never a solid black plate.** Use a
  *directional* scrim, darkest beside the text: `0.88 → 0.30 → 0`; a bottom fade under a lower
  title `0 → 0.72`; a radial vignette `0 → 0.58`; or a brand wash `0.80 → 0.10`.
- Image composition families, used as the option vocabulary for media blocks (§03 §E):
  `P1` single visual (side / band / inset / hero), `P2` image-as-canvas with native overlay,
  `P3` multi-visual (grid / collage / sequence / compare). Modifiers: `M1` reveal/crop/registration,
  `M2` tone/focus/contrast, `M3` framing/placement/depth.
- A photo that fights the palette gets a duotone or brand wash, not a different photo.

## 2.7 Composition rules blocks inherit

These come from `ppt-master`'s *layout structures* table and are the option vocabulary for
`tls.split`, `tls.grid`, and the composite slide blocks.

| Content relationship | Structure | Starting geometry (1920×1080) |
|---|---|---|
| One focal claim | centered single column, or full-bleed + floating text | column 1200–1500 wide; a breathing slide leaves 40–60% empty |
| Equal comparison | symmetric split, or a true 2×2 matrix | 1:1 with a 60–90 gutter; quadrants ≈840×375, gaps 30–45 |
| Dominant evidence + takeaway | asymmetric split | 3:7 or 2:8, heavy side 1260–1536 |
| Parallel sequence | three columns, process line, chevron strip | 3 columns, gutters 45–60 |
| Core + surrounding forces | hub & spoke | hub 300–450, 4–6 satellites |
| Wide visual + explanation | top/bottom split | visual ≥55% of the content field |
| Page-field organization | one large surface/outline/aperture spanning zones | field spans ≥2 zones |

**The failure mode these exist to prevent, named by `ppt-master` and worth repeating:** *repeating
symmetric card grids with no page job.* Three cards because there are three things is fine; three
cards on every slide is not. P31's linter tracks "consecutive slides using the same structure" and
warns at 3.

**Page rhythm.** Every slide carries `anchor | dense | breathing` (§06 §2). `breathing` slides cap
block count and forbid grids; `dense` allows dashboards and tables. *Follow a data-heavy slide
with a breathing one* is a deck-level rule the linter checks across the whole deck, not per slide.

## 2.8 The lint rule set (implemented in P31)

Each rule is `id · severity · what it measures`. All are computed from the laid-out node tree and
the resolved tokens — no heuristics over pixels, no screenshots.

**Legibility**
| id | sev | rule |
|---|---|---|
| `contrast/text` | error | any `text`-role part below 4.5:1 against its effective surface |
| `contrast/muted` | warn | informational `textMuted` below 4.5:1 |
| `contrast/line` | info | hairline below 1.4:1 (invisible divider) |
| `type/off-scale` | warn | a text part more than ±2 units off every type token |
| `type/peers-disagree` | warn | sibling parts of the same role at different sizes |
| `type/measure` | info | body column wider than 75ch or narrower than 30ch |
| `text/overflow` | error | `capacity().fits === false` after all remedies |
| `text/truncated` | warn | a truncate remedy actually fired |

**Composition**
| id | sev | rule |
|---|---|---|
| `layout/margin` | error | a block crosses the slide safe margin |
| `layout/overlap` | warn | two non-overlay blocks intersect by >5% of the smaller's area |
| `layout/collision-text` | error | text parts of two blocks intersect |
| `layout/misalign` | info | block edges within 12 units of each other but not equal (near-miss alignment) |
| `layout/empty` | info | >70% of the content field empty on a `dense` slide |
| `rhythm/repeat` | warn | 3+ consecutive slides with the same structure |
| `rhythm/no-breathing` | info | 5+ consecutive `dense` slides |

**Color & effect**
| id | sev | rule |
|---|---|---|
| `color/accent-overuse` | warn | >2 accent-painted parts in one block, or >3 per slide |
| `color/too-many-hues` | warn | >6 distinct encoded hues on one slide |
| `color/polarity-misuse` | warn | `positive`/`negative` used for non-polar categories |
| `effect/stacked-weight` | warn | one container with shadow + border + strong tint |
| `effect/shadow-count` | warn | >3 elevated parts on a slide, or any elevation-2 peer grid |
| `effect/flat-image-overlay` | warn | uniform-opacity plate over an image instead of a directional scrim |

**Motion** (rules in [05-motion-system.md](05-motion-system.md) §8, listed there to keep motion in
one place)

**Content**
| id | sev | rule |
|---|---|---|
| `content/empty-slot` | error | a `required` content slot is empty |
| `content/placeholder` | error | shipped placeholder text ("Lorem", "Your title here") survives |
| `content/list-length` | warn | a list exceeds its schema `max`, or a bullet exceeds 2 lines |
| `content/duplicate-title` | info | two slides with identical titles |
| `a11y/alt` | warn | an image block with no alt text (`ImageShape.alt` exists and has no UI — Phase 3 reserved it) |

The linter returns findings; it never edits. P30's UI surfaces them per-slide; P32 runs them over
AI output and feeds failures back as a repair instruction, which is the cheapest quality lever in
the whole plan.
</content>
