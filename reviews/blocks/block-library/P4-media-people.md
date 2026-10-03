# P4 · Media, brand, people, decoration — 11 blocks

**Depends on:** P0.1–P0.3, P0.5 (icons for placeholders).
**Folder:** `library/media/` (prefix `m`); `profile-card` goes in `library/composite/` (prefix `c`).
**Reference:** `tls-m-image/` (fit, focal, asset id vs url, caption).

Block entry format and the standard tests are defined in [P1-text-lists.md](P1-text-lists.md#how-to-read-a-block-entry-same-in-every-phase-file).

**What the `image` node can and cannot do:** it has `fit` (cover/contain), `focal`, `radius`, and
`assetId`/`url`. A circle is `radius = size/2`. There is **no** clip path, filter, blend or
greyscale, so "monochrome logos", duotone and shaped masks are parked (README §Parked). Don't fake
them with overlays that only work in one renderer.

**Extra tests for media blocks:** a missing or empty image renders the existing placeholder
(no crash, no broken box); `alt` is required content wherever an image is content (accessibility
lint: empty alt → warning).

---

## Status

| # | Block | Category | Priority | Status | Commit | Blocked / notes |
|---|---|---|---|---|---|---|
| 1 | `tls.m.image-grid` | media | must | ✅ | `73839a01` | patterns even / feature-left / feature-top / mosaic; parts `img[i]`, `cap[i]`; overlay caption is a floating scrim pill (a square band pokes out of rounded corners); `alt/missing` lint. Also: SVG renderer clips images with a radius (circles were squares in export) |
| 2 | `tls.m.avatar` | people | must | ✅ | `095d8f04`, `2106b577`, `656cd36b` | initials of the first 2 words (NFC, diacritics kept); unresolvable image id also falls back to initials; extra option `align: center/start`; root height = content height (stacks size it) |
| 3 | `tls.c.profile-card` | people | must | ✅ | `2106b577`, `656cd36b` | composite + a thin layout wrapper that renames the anonymous `text` parts to name/role/bio/contact (toggles need real parts). **Reduced:** no `tone: outline` (`tls.l.card` has no stroke), tones are `alt`/`surface`; text is start-aligned (`tls.t.title`/`caption` ignore `align`); DOM/SVG parity probe off (layoutChild wrappers sit at x>0, SVG ignores group offsets) |
| 4 | `tls.m.logo` | brand | must | ✅ | `ac633f13` | `ratio` option (width/height) added so `align`/plate hug the logo; read from `ctx.asset()` when absent (wired in `deck-context.ts` from the asset table `size`); no ratio = full-width contain box, `align` has nothing to move |
| 5 | `tls.m.logo-wall` | brand | must | ✅ | `0c420dae` | `sizeLogos` = exact equal-area math (A = min over logos of iw²/r, ih²·r); per-logo `ratio`; cells capped at 0.7 of their width; cols auto = at most 5 per row, balanced |
| 6 | `tls.m.image-compare` | media | should | ✅ | `2ce3a8c4` | `split` verified: `group.clip` clips in BOTH renderers when the clip group sits at the block origin with absolute children (after fills the frame, before sits clipped to the left half; a clip group at x>0 would be offset in the DOM only); DOM verified in the screenshot, SVG by clipPath assertion |
| 7 | `tls.m.device-mock` | media | should | ✅ | `ee53da81` | 4 devices drawn from rects; screenshot cover + `focal [0.5,0]`; device is fitted and centred in the box (a block cannot carry a per-device `size.aspect`); shadow = faded offset rect, no blur |
| 8 | `tls.m.avatar-group` | people | should | ✅ | `f5fa0bb2` | `+N` bubble, surface edge on each avatar, size shrinks to fit; caption right of the row or under it |
| 9 | `tls.m.decoration` | decoration | should | ✅ | `69fb9f7c` | one `path`; deterministic mulberry32(seed); rotation rotates blob and arc, snaps wave/corner to quarter turns, ring/dots ignore it. **Not built:** the contrast lint (a block lint cannot see its siblings) |
| 10 | `tls.m.image-collage` | media | could | ⏸ blocked |  | Confirmed: `LayoutNode` has no rotation (group: box/name/part/clip/opacity/children; `image` cannot rotate), so rotated prints are impossible; a non-rotated overlap would just be `tls.m.image-grid`. Not built, no `rotate` field added (rule 3). Revisit if rotation is ever agreed (README §Parked) |
| 11 | `tls.m.pattern` | decoration | could | ✅ | `eaec2825` | dots/grid/lines/diagonal, ONE path node at 1920x1080 scale sm (dots capped at 2,500 marks); no motion preset |
| — | Demo slides (gallery, people, brand) + screenshots | | | ✅ | `bb9c91ed` | sl_42-sl_46 (+ decoration, pattern); images are generated SVGs in `examples/nextjs-sample/public/demo/` referenced as `/demo/x.svg`; one grid cell uses an unresolvable id to show the placeholder; shots opened (`tools/visual/shots/p4-sl_4*.png`) |

---

### 1. `tls.m.image-grid` · media · group · layout · must
- **short:** `Grid of images in even cells or a feature pattern, with optional captions`
- **Slots:** `images!: list<object{ image!: image, alt!: text, caption: text maxChars 60 }>` (2–9)
- **Options:** `pattern: enum[even, feature-left, feature-top, mosaic]` (feature = first image
  spans 2×2; mosaic = alternating spans); `cols: enum[auto, '2', '3', '4']`; `gap: enum[sm, md, none]`;
  `radius: enum[md, none, lg]`; `captions: enum[below, overlay, none]`
- **Parts / motion:** `img-<i>`, `cap-<i>`; `stagger-grid`.
- **Capacity:** `cols: auto` picks columns from the count and aspect; more than 9 → truncate.
- **when:** Several photos of equal importance: portfolio, event photos, product shots.
- **avoid:** One image plus text, so use `tls.c.image-text`. Logos go in `tls.m.logo-wall`.

### 2. `tls.m.avatar` · people · element · layout · must
- **short:** `Round portrait with name and role beside or beneath it`
- **Slots:** `image: image`; `name!: text maxChars 40`; `role: text maxChars 50`
- **Options:** `shape: enum[circle, rounded, square]`; `size: enum[md, sm, lg, xl]`;
  `layout: enum[stacked, inline]`; `ring: boolean` (accent ring = a slightly larger accent
  circle behind)
- **Fallback:** no image → initials on a `surfaceAlt` circle (first letters of the first two words).
- **Toggles:** `showRole` → `role`; `showName` → `name`.
- **Parts / motion:** `photo`, `name`, `role`; `fade-up`.
- **when:** Naming a speaker, an author or a contact person.
- **avoid:** Several people, so use `tls.c.team` or `tls.m.avatar-group`.
- **Tests:** initials for 1-word, 2-word and Vietnamese names with diacritics.

### 3. `tls.c.profile-card` · people · element · composite · must
- **short:** `Card with portrait, name, role, short bio and contact or social line`
- **Slots:** `image: image`; `name!: text`; `role: text`; `bio: text maxChars 200`; `contact: text maxChars 60`
- **Options:** `layout: enum[stacked, side]`; `tone: enum[surface, alt, outline]`
- **Toggles:** `showBio`, `showContact`.
- **Build:** `defineCompositeBlock` → `tls.l.card` → `tls.l.stack`/`tls.l.row` [`tls.m.avatar`
  (showName false), `tls.t.title` (sm), `tls.t.caption`, `tls.t.body`, `tls.t.caption`].
- **when:** Introducing one person in detail: speaker bio, lecturer, team lead.
- **avoid:** A row of team members, so use `tls.c.team` (which repeats this card).

### 4. `tls.m.logo` · brand · element · layout · must
- **short:** `Single logo image fitted inside a fixed height, never cropped`
- **Slots:** `image!: image`; `alt!: text`
- **Options:** `maxHeight: enum[md, sm, lg]`; `align: enum[center, start, end]`; `plate: enum[none, surface, alt]` (a background plate for logos that need contrast)
- **Parts / motion:** `logo`; `fade-up`.
- **when:** One brand mark: partner, client, sponsor.
- **avoid:** Several logos, so use `tls.m.logo-wall`. A logo repeated on every slide goes in
  `tls.x.logo-mark`.

### 5. `tls.m.logo-wall` · brand · group · layout · must
- **short:** `Even grid of logos at equal visual weight, with an optional heading`
- **Slots:** `heading: text maxChars 60` (e.g. "Trusted by"); `logos!: list<object{ image!: image, alt!: text }>` (3–16)
- **Options:** `cols: enum[auto, '3', '4', '5', '6']`; `uniform: enum[height, area]` (area
  equalises the visual weight of wide vs square logos by scaling to equal area within the cell);
  `plates: boolean`; `dividers: boolean`
- **Toggles:** `showHeading` → `heading`.
- **Parts / motion:** `heading`, `logo-<i>`; `stagger-grid`.
- **when:** Clients, partners, sponsors, integrations.
- **avoid:** Fewer than 3 logos, so use `tls.m.logo`.
- **Tests:** area-equalisation math with a 4:1 and a 1:1 logo.

### 6. `tls.m.image-compare` · media · group · layout · should
- **short:** `Two images side by side or split down the middle, labelled before and after`
- **Slots:** `before!: object{ image!: image, alt!: text, label: text }`; `after!` (same)
- **Options:** `mode: enum[side, split]` (split = one frame, left half from before, right half
  from after, using `group.clip` with two half-width clipped groups; check that `clip` clips to
  the group box in both renderers); `divider: boolean`
- **Parts / motion:** `before`, `after`, `divider`; `wipe-x`.
- **when:** Visual change: renovation, redesign, treatment results.
- **avoid:** Text-only before/after, so use `tls.g.before-after`.

### 7. `tls.m.device-mock` · media · element · layout · should
- **short:** `Screenshot framed in a phone, laptop or browser window`
- **Slots:** `image!: image`; `alt!: text`; `url: text maxChars 60` (browser address bar)
- **Options:** `device: enum[browser, laptop, phone, tablet]`; `tone: enum[light, dark]`; `shadow: boolean`
- **Build:** frames are `rect`/`path` nodes drawn from the device's proportions (screen inset
  ratios per device as constants). The screenshot is an `image` with `fit: cover`, top-aligned
  (`focal: [0.5, 0]`). `size.aspect` set per device.
- **Parts / motion:** `frame`, `screen`; `fade-up`.
- **when:** Showing an app, website or product UI.
- **avoid:** Photos, so use `tls.m.image`.

### 8. `tls.m.avatar-group` · people · element · layout · should
- **short:** `Overlapping row of small portraits with a plus-N overflow bubble`
- **Slots:** `people!: list<object{ image: image, name!: text }>` (2–20)
- **Options:** `max: number` (default 5); `size: enum[md, sm, lg]`; `overlap: enum[md, none, lg]`;
  `caption: text maxChars 60`
- **Parts / motion:** `avatar-<i>`, `more`, `caption`; `stagger-children`.
- **when:** "Who's involved" at a glance: contributors, attendees.
- **avoid:** When names and roles matter, so use `tls.c.team`.

### 9. `tls.m.decoration` · decoration · element · layout · should
- **short:** `Decorative blob, arc, ring, dot grid or wave in a theme colour`
- **Slots:** none.
- **Options:** `shape: enum[blob, arc, ring, dots, wave, corner]`; `tone: enum[accent, accent2, alt, line]`;
  `opacity: enum[soft, medium, strong]`; `rotation: number` (0–359); `seed: number`
  (deterministic variation for the blob, since `Math.random()` is forbidden in layout)
- **Parts / motion:** `shape`; `field-in`.
- **Lint:** warning if it's placed over text with a contrast drop (use the existing contrast check
  against the surface).
- **when:** Adding visual interest to sparse slides (covers, dividers, quotes).
- **avoid:** Anything that carries meaning, which should be a real block.
- **Tests:** same seed gives the same path; DOM↔SVG identical.

### 10. `tls.m.image-collage` · media · group · layout · could
- **short:** `Overlapping, slightly rotated photos like prints on a table`
- **Slots:** `images!: list<object{ image!: image, alt!: text }>` (2–5)
- **Options:** `pattern: enum[scatter, stack, fan]`; `frame: enum[polaroid, none]`; `seed: number`
- **Build:** rotation needs a transform. **`LayoutNode` has no rotation.** Unless `path`-based
  frames plus an unrotated image are acceptable, this is **blocked**. Decide at pick-up and record
  it; don't add a `rotate` field (rule 3).
- **Motion:** `stagger-children`.

### 11. `tls.m.pattern` · decoration · element · layout · could
- **short:** `Repeating dots, lines, grid or diagonal stripes as a subtle backdrop`
- **Options:** `pattern: enum[dots, grid, lines, diagonal]`; `scale: enum[md, sm, lg]`;
  `tone: enum[line, accent, alt]`; `opacity: enum[soft, medium]`
- **Build:** one `path` node with all marks in a single `d` (not thousands of nodes); a
  performance test for 1920×1080 at scale `sm` (node count = 1).
- **Motion:** none (`fade-up` only if set explicitly).
- **when:** Texture behind a cover or divider.
- **avoid:** Content slides with dense text.

---

## Phase done when
- [x] Must blocks ✅; demo slides (generated SVG images, the repo has no photos) screenshotted and opened.
- [x] Image placeholders verified in the screenshot for at least one block (sl_42, image-grid cell "Photo not uploaded yet").
- [ ] Full suite (not run: 6 GB machine; targeted suites pass), tsc 0 ✔, README counts and session log updated ✔.
