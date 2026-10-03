# P6 · Chrome — 7 blocks (+ one prerequisite)

**Depends on:** P0.1–P0.3, and P6.0 for the position-aware blocks.
**Folder:** `library/chrome/` (prefix `x`). **Reference:** `tls-x-page-number/`.

Block entry format and the standard tests are defined in [P1-text-lists.md](P1-text-lists.md#how-to-read-a-block-entry-same-in-every-phase-file).

**Context:** masters are not built (03-block-catalog §G assumed they would be), so chrome blocks
are placed on each slide like any other block, usually in the `tls.l.footer` region or by a slide
layout. Keep them small (`size.preferred` height ≤ 80) and quiet (`textMuted`, `line`), and give
them motion preset `none` by default.

---

## Status

| # | Block | Category | Priority | Status | Commit | Blocked / notes |
|---|---|---|---|---|---|---|
| P6.0 | Deck position for chrome (prerequisite) | — | must | ⬜ | | additive; see below |
| 1 | `tls.x.footer-text` | chrome | must | ⬜ | | |
| 2 | `tls.x.logo-mark` | chrome | must | ⬜ | | |
| 3 | `tls.x.progress` | chrome | must | ⬜ | | needs P6.0 |
| 4 | `tls.x.section-tabs` | chrome | should | ⬜ | | needs P6.0 |
| 5 | `tls.x.header` | chrome | should | ⬜ | | |
| 6 | `tls.x.rule` | decoration | should | ⬜ | | |
| 7 | `tls.x.watermark` | chrome | could | ⬜ | | |

---

### P6.0 · Deck position for chrome blocks

**Finding (verified 2026-10-03):** `tls.x.page-number` renders a static `props.number`. Nothing
feeds it the real slide index, so every chrome block that depends on position (progress, section
tabs, page number) shows a hard-coded value.

**Proposal (must be agreed before coding, because it adds a field):** an optional
`ctx.deck?: { index: number; count: number; section?: { index: number; count: number; titles: string[] } }`
on `LayoutContext`, filled by the slide compiler / `DeckViewer` when known, absent in isolated
rendering (gallery preview, tests). Every reader falls back to props when it's absent. Section
info comes from slides that contain a `tls.c.divider` (its `title`), counted in order.

- `tls.x.page-number`: new option `source: enum[auto, manual]` (default `manual` for backward
  compatibility; the demo uses `auto`), plus `format: enum[n, n-of-total]`.
- Tests: compile a 5-slide deck and assert the page number is 1…5 and the progress fill is 20 %…100 %.

If the field is not approved, P6 ships blocks 1, 2, 5, 6 and 7 only, and 3 and 4 move to Parked.

### 1. `tls.x.footer-text` · chrome · element · layout · must
- **short:** `Footer line with deck title, author or date, separated by dots`
- **Slots:** `items!: list<text maxChars 40>` (1–3)
- **Options:** `align: enum[start, center, end, spread]` (spread = first left, last right);
  `separator: enum[dot, bar, none]`; `rule: boolean` (hairline above)
- **when:** Repeating a deck title, event name or confidentiality note at the bottom of slides.
- **avoid:** Sources, so use `tls.t.footnote`.

### 2. `tls.x.logo-mark` · chrome · element · layout · must
- **short:** `Small corner logo repeated on content slides`
- **Slots:** `image!: image`; `alt!: text`
- **Options:** `size: enum[sm, md]`; `corner: enum[top-right, top-left, bottom-right, bottom-left]`
  (aligns inside its box)
- **when:** Brand presence on every slide.
- **avoid:** A featured logo, so use `tls.m.logo`.

### 3. `tls.x.progress` · chrome · element · layout · must (needs P6.0)
- **short:** `Thin bar along the slide edge showing how far through the deck we are`
- **Slots:** none (reads `ctx.deck`; manual fallback `value: number` 0–1).
- **Options:** `style: enum[bar, dots, fraction]`; `thickness: enum[sm, md]`; `tone: enum[accent, muted]`
- **Motion:** `grow-bars-x` (only when the deck enables motion; default `none`).
- **when:** Long talks and lectures where the audience benefits from knowing their position.
- **avoid:** Short decks (under 8 slides).

### 4. `tls.x.section-tabs` · chrome · element · layout · should (needs P6.0)
- **short:** `Row of section names with the current section highlighted`
- **Slots:** `sections: list<text maxChars 20>` (2–7; falls back to `ctx.deck.section.titles`);
  `current: number` (manual fallback)
- **Options:** `style: enum[tabs, dots, underline]`
- **when:** Multi-part lectures and reports where orientation matters.
- **avoid:** Decks with no sections.

### 5. `tls.x.header` · chrome · element · layout · should
- **short:** `Thin header strip with a section label on the left and meta on the right`
- **Slots:** `label: text maxChars 40`; `meta: text maxChars 40`
- **Options:** `rule: boolean`; `tone: enum[muted, accent]`
- **when:** Consistent running header (course code, chapter, client name).
- **avoid:** The slide title, so use `tls.t.title`.

### 6. `tls.x.rule` · decoration · element · layout · should
- **short:** `Horizontal or vertical divider line, plain or accent gradient`
- **Options:** `axis: enum[horizontal, vertical]`; `weight: enum[hairline, md, bold]`;
  `tone: enum[line, accent, gradient]`; `length: enum[full, short]` (short = 64 px accent bar)
- **Motion:** `wipe-x` (`wipe-y` for vertical).
- **when:** Separating areas on free layouts, and an accent bar under a heading.
- **avoid:** Inside containers that already draw a divider (`tls.l.section`).

### 7. `tls.x.watermark` · chrome · element · layout · could
- **short:** `Large faint text such as DRAFT or CONFIDENTIAL across the slide`
- **Slots:** `text!: text maxChars 20`
- **Options:** `opacity: enum[faint, soft]`; `angle: enum[none, diagonal]`. Diagonal needs
  rotated text, which `LayoutNode` can't express. **Ship `none` only**, and record diagonal as
  blocked on rotation (same gap as `tls.m.image-collage`).
- **when:** Draft or confidential decks.
- **avoid:** Decorative text, so use `tls.t.statement`.

---

## Phase done when
- [ ] Must blocks ✅ (or P6.0 explicitly declined, with 3 and 4 moved to Parked).
- [ ] One demo slide with footer-text, logo-mark, progress and page-number, screenshotted and opened.
- [ ] Full suite, tsc 0, README counts and session log updated.
