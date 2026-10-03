# P5 · Composites — 14 blocks

**Depends on:** the P1–P4 blocks each one composes (listed per entry). Do P5 last.
**Folder:** `library/composite/` (prefix `c`). **Build path: `defineCompositeBlock`** unless an
entry says otherwise. **Reference:** `tls-c-stat-card/`, plus guides/blocks-authoring.md §2.8 and
[../block-authoring/B5-define-composite-block.md](../block-authoring/B5-define-composite-block.md)
(purity, depth budget of 4, motion animates as one unit in v1).

Block entry format and the standard tests are defined in [P1-text-lists.md](P1-text-lists.md#how-to-read-a-block-entry-same-in-every-phase-file).

**Composite rules:**
- **Scope `slide`** composites fill the main content region and are never nested (P0.2 gate).
  Scope `group` composites (cards, team, chart-insight) can sit in any region.
- **Depth budget:** count the levels of each `build()` tree. Anything that would exceed depth 4
  must flatten (use `tls.l.stack` directly rather than card → section → stack → …).
- **Motion v1 limitation:** a composite animates as one unit. Per-child choreography is a
  separate follow-up; don't hand-roll it inside one composite.
- **Toggles map onto children:** `showX: false` ⇒ `build()` omits that child spec. Never render
  an empty child.

**Extra tests for composites:** the generated tree's depth is ≤ 4 for the max-content
example; each toggle removes exactly its child; `intrinsicSize` grows with content
(`measureIntrinsicSize` path); the slide-scope example compiles cleanly in a `title` slide
layout region without collisions (collision helper).

---

## Status

| # | Block | Category | Scope | Priority | Composes | Status | Commit | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | `tls.c.cover` | cover | slide | must | t.kicker, t.title, t.subtitle, m.image, m.logo, m.decoration | ✅ | aad0b682 | `defineCompositeBlock` metadata + `build()`, but `layout()` is hand-placed with `ctx.layoutChild` and flattened (`composite/_kit.ts`, see Notes below). Logo is a fixed 240x96 box (top start). No kicker marker (it detaches from centred text). `bleed` without a photo falls back to an accent field. Decoration only on centered and photo-less split. |
| 2 | `tls.c.divider` | divider | slide | must | t.kicker, t.title, t.subtitle, m.decoration | ✅ | 62b0d21b | Number slot is 8 chars (plan said 4, but its own example is "Part 2"). Number is drawn with `tls.t.title` display size; no kicker or decoration (not needed by the three variants). |
| 3 | `tls.c.closing` | closing | slide | must | t.title, t.body, t.tags, m.avatar | ✅ | c81e43a9 | Contacts are `tls.t.caption` lines, not `t.tags`. Button = pill rect + `tls.t.subtitle` label (no pill block exists). `avoid` points at `tls.t.numbered`: `tls.c.recap` is part B. Has `capacity()` (contacts <= 4). |
| 4 | `tls.c.dashboard` | metric | slide | must | c.kpi-row, d.* chart, t.takeaway | ✅ | 05c772e6 | Chart kinds bar, line, area, donut, stacked-bar, grouped-bar, pie all lay out (depth + DOM/SVG parity per kind). `kpis-left` uses `tls.c.kpi-tile` stacked, not kpi-row. `chartRatio` splits chart vs insight width (insight hidden: chart takes it all). Bar kind draws the pre-P2 `tls.d.bar` (gridlines and labels do not line up): prefer line/area/grouped-bar. |
| 5 | `tls.c.chart-insight` | chart | group | must | d.* chart, t.takeaway, t.footnote | ✅ | a17f6cfb | Same chart slot as dashboard (all 7 kinds, parity per kind). `intrinsicSize` = content height. `avoid` names `tls.c.dashboard`. |
| 6 | `tls.c.team` | people | group | must | c.profile-card | ✅ | 1dd5da6a | Not a grid of `tls.c.profile-card`: that is exactly 4 deep and cannot sit in a container. Cells are laid out by hand (avatar + bio, panel rect), 1 level deep, works nested (tested). Centred cells; `cols auto` = 2/3/4/3/3/4/4 for 2..8. `showBio` is a toggle (`bio`). No contact line. |
| 7 | `tls.c.objectives` | agenda | slide | must | t.checklist / t.numbered, m.icon | ✅ | 2eb5dc87 | `icon` marker uses `tls.m.icon-list` with one icon for all items, always one column. Items render at body size (28): the list blocks have no size option. |
| 8 | `tls.c.cards` | list | group | must | l.card, m.icon, t.title, t.body, t.hero-number | ✅ | 6b80c1b4 | Rounded panels are raw rects (the card block has no radius or stroke), so `outline` and `surface` tones are possible. Cards are content-height (min 460, region permitting), not region-filling. `feature-grid` avoid/related now point at cards. |
| 9 | `tls.c.quiz` | learning | group | should | t.title, l.grid, l.card | ⬜ | | layout, not composite |
| 10 | `tls.c.recap` | closing | slide | should | t.numbered, t.takeaway | ⬜ | | |
| 11 | `tls.c.case-study` | comparison | slide | should | l.row, l.card, t.kicker, t.body, t.hero-number | ⬜ | | |
| 12 | `tls.c.problem-solution` | comparison | group | should | g.before-after or l.split, t.callout | ⬜ | | |
| 13 | `tls.c.contact` | closing | group | could | m.avatar, t.kv-list, m.icon-list | ⬜ | | |
| 14 | `tls.c.quote-image` | emphasis | slide | could | l.overlay, m.image, t.quote | ⬜ | | |
| — | Demo deck "block-library-tour" (one slide per must composite) + screenshots | | | | | 🔶 | aaf9ca00 | 17 slides: P1-P4 representatives (reused sl_12/15/19/23/32/42/43), 8 part A composites. Every slide shot at 1920x1080 and opened. Part B composites still to be added. |

---

### 1. `tls.c.cover` · cover · slide · must
- **short:** `Title slide with kicker, title, subtitle and meta line, centred, split or over a photo`
- **Slots:** `kicker: text maxChars 40`; `title!: richText maxChars 80`; `subtitle: text maxChars 140`;
  `meta: text maxChars 80` (presenter · date · venue); `image: image`; `alt: text`; `logo: image`
- **Options:** `variant: enum[centered, split, bleed]` (split = image half; bleed = full image
  with scrim via `tls.l.overlay`, `scrim` role); `decoration: enum[none, blob, arc, dots]`
- **Toggles:** `showKicker`, `showSubtitle`, `showMeta`, `showLogo`, `showImage` (ignored for `centered`).
- **when:** First slide of a deck or talk, especially with a photo or logo.
- **avoid:** A text-only opener with a call-to-action button, so use `tls.c.hero`. Mid-deck
  section starts go in `tls.c.divider`.
- **Note:** `hero` stays. Their `avoid` lines point at each other.

### 2. `tls.c.divider` · divider · slide · must
- **short:** `Section break with a big section number, section title and one-line intro`
- **Slots:** `number: text maxChars 4` ("01", "II", "Part 2"); `title!: text maxChars 60`; `subtitle: text maxChars 120`
- **Options:** `variant: enum[numeral, field, minimal]` (numeral = oversized muted number;
  field = accent field background via `tls.l.field`); `align: enum[start, center]`
- **Toggles:** `showNumber`, `showSubtitle`.
- **when:** Between major parts of a deck or chapters of a lecture.
- **avoid:** The first slide, so use `tls.c.cover`.

### 3. `tls.c.closing` · closing · slide · must
- **short:** `Closing slide with thank-you title, call to action and contact details`
- **Slots:** `title!: text maxChars 50` ("Thank you", "Questions?"); `text: text maxChars 160`;
  `cta: text maxChars 40`; `contacts: list<text maxChars 60>` (0–4); `person: object{ image, name, role }`
- **Options:** `variant: enum[centered, split]`; `ctaStyle: enum[button, link]`
- **Toggles:** `showCta`, `showContacts`, `showPerson`.
- **when:** Last slide: thanks, Q&A, next step, how to reach us.
- **avoid:** A summary of key points, so use `tls.c.recap`.

### 4. `tls.c.dashboard` · metric · slide · must
- **short:** `KPI tiles across the top, one chart below and an insight note`
- **Slots:** `kpis!: list<object(kpi-tile props)>` (2–4); `chart!: object{ kind!: enum[bar, line,
  area, donut, stacked-bar], categories!, series! }`; `insight: text maxChars 160`
- **Options:** `layout: enum[kpis-top, kpis-left]`; `chartRatio: enum['2:1', '1:1']`
- **Build:** `chart.kind` picks the child type (`tls.d.<kind>`) inside `build()`, which is pure,
  so that's fine. The chart props pass through unchanged. **Depth check:** row → kpi-tile is
  2 + kpi internals. Verify ≤ 4.
- **Toggles:** `showInsight`.
- **when:** Performance overview: monthly review, project status, business results.
- **avoid:** One number, so use `tls.c.big-stat`. A chart with an explanation goes in
  `tls.c.chart-insight`.

### 5. `tls.c.chart-insight` · chart · group · must
- **short:** `Chart with a highlighted takeaway beside it and a source line`
- **Slots:** `chart!: object{ kind!, categories!, series! }` (same as dashboard); `insight!: richText maxChars 200`;
  `insightTitle: text maxChars 40`; `source: text maxChars 120`
- **Options:** `side: enum[right, left, below]`; `ratio: enum['2:1', '3:2', '1:1']`
- **Toggles:** `showSource`.
- **when:** A chart whose message must be stated explicitly ("Revenue doubled after launch").
- **avoid:** Several KPIs, so use `tls.c.dashboard`.

### 6. `tls.c.team` · people · group · must
- **short:** `Grid of team members, each with photo, name, role and optional bio`
- **Slots:** `people!: list<object(profile-card props)>` (2–8)
- **Options:** `cols: enum[auto, '2', '3', '4']`; `card: enum[plain, card]`; `showBio: boolean`
- **Build:** `tls.l.grid` of `tls.c.profile-card` (depth: grid → card → stack → leaf = 4, at the
  limit, so **verify**). If it's over, inline the profile-card tree with `card: plain`.
- **when:** Team, speakers, committee, research group.
- **avoid:** One person, so use `tls.c.profile-card`. Faces only go in `tls.m.avatar-group`.

### 7. `tls.c.objectives` · agenda · slide · must
- **short:** `Learning objectives or goals as a numbered or checked list with an intro line`
- **Slots:** `intro: text maxChars 120` ("By the end of this session you will be able to…");
  `items!: list<text maxChars 120>` (2–6)
- **Options:** `marker: enum[numbered, check, icon]`; `icon: icon` (for marker icon);
  `cols: enum['1', '2']`
- **Toggles:** `showIntro`.
- **when:** Start of a lecture, workshop or project: what the audience will achieve.
- **avoid:** A list of topics to cover, so use `tls.c.agenda`.

### 8. `tls.c.cards` · list · group · must
- **short:** `Row of equal cards, each led by an icon, number or image, then title and text`
- **Slots:** `cards!: list<object{ icon: icon, number: text maxChars 6, image: image, title!: text maxChars 40, text: text maxChars 160 }>` (2–4)
- **Options:** `lead: enum[icon, number, image, none]`; `tone: enum[surface, alt, outline, accent-first]`;
  `align: enum[start, center]`
- **when:** Three pillars, key benefits, offerings, each with a short paragraph.
- **avoid:** More than 4 items or icon-only entries, so use `tls.c.feature-grid`. Plain points go
  in `tls.t.bullets`.
- **Note:** this is the Tier A, card-framed sibling of the Tier B `feature-grid`. The `avoid`
  lines distinguish them.

### 9. `tls.c.quiz` · learning · group · layout · should
- **short:** `Multiple-choice question with lettered options; correct answer revealed on click`
- **Slots:** `question!: richText maxChars 200`; `options!: list<text maxChars 80>` (2–5);
  `answer!: number` (index); `explanation: text maxChars 200`
- **Options:** `layout: enum[list, grid]`; `reveal: enum[on-click, shown, none]`
- **Build:** a hand-written `layout()`, because the answer state needs per-part styling: the
  correct option gets an alternate `positive`-styled part `answer-<i>`, revealed by a build step.
  Needs per-part triggers in `computeBuildSteps`. **If those don't exist, ship
  `reveal: shown | none` and record the gap** (same check as `tls.t.qa`).
- **Parts / motion:** `question`, `option-<i>`, `answer`, `explanation`; `stagger-lines`.
- **when:** Knowledge checks in lectures and training.
- **avoid:** Open questions, so use `tls.t.qa`.
- **Validation:** `answer` out of range → validation error with a clear message.

### 10. `tls.c.recap` · closing · slide · should
- **short:** `Numbered key points to remember, closed by one takeaway line`
- **Slots:** `points!: list<richText maxChars 140>` (2–5); `takeaway: text maxChars 140`
- **Options:** `style: enum[numbered, cards]`
- **when:** End of a section or lecture: "what we learned".
- **avoid:** The final thank-you slide, so use `tls.c.closing`.

### 11. `tls.c.case-study` · comparison · slide · should
- **short:** `Challenge, solution and result columns, with one headline result number`
- **Slots:** `client: text maxChars 40`; `challenge!: text maxChars 220`; `solution!: text maxChars 220`;
  `result!: text maxChars 220`; `metric: object{ value!: text, label!: text }`
- **Options:** `layout: enum[columns, rows]`; `emphasis: enum[result, none]`
- **Toggles:** `showMetric`, `showClient`.
- **when:** Success stories, project showcases, references.
- **avoid:** A generic 3-point list, so use `tls.c.cards`.

### 12. `tls.c.problem-solution` · comparison · group · should
- **short:** `Problem statement on one side, solution on the other, joined by an arrow`
- **Slots:** `problem!: object{ title: text, text!: richText maxChars 200 }`; `solution!` (same); `icons: boolean`
- **Options:** `style: enum[panels, callouts]` (callouts = `tls.t.callout` danger → success)
- **when:** Pitch and proposal slides framing a pain point and the answer to it.
- **avoid:** Visual before/after, so use `tls.g.before-after` or `tls.m.image-compare`.

### 13. `tls.c.contact` · closing · group · could
- **short:** `Contact block with person, email, phone, website and social handles`
- **Slots:** `person: object{ image, name, role }`; `items!: list<object{ kind!: enum[email, phone, web, address, social], value!: text }>` (1–6)
- **Build:** icons per kind (mail, phone, globe, map-pin, share; all from P0.5) via `tls.m.icon-list`.
- **when:** Where to reach the presenter or organisation.
- **avoid:** A full closing slide, so use `tls.c.closing`.

### 14. `tls.c.quote-image` · emphasis · slide · could
- **short:** `Large quote set over a full-bleed photo with a dark scrim`
- **Slots:** `image!: image`; `alt!: text`; `quote!: richText maxChars 200`; `name: text`; `role: text`
- **Options:** `anchor: enum[bottom-left, center, left]`; `scrim: enum[medium, strong]`
- **Lint:** contrast of the text over the scrim, using the existing surface/overImage logic.
- **when:** Emotional or inspirational quotes as a full slide.
- **avoid:** Customer testimonials with a face, so use `tls.c.testimonial`.

---

## Notes from part A (cover, divider, closing, cards, chart-insight, dashboard, team, objectives)

- **Build pattern.** `defineCompositeBlock` gives the metadata and a reference `build()` tree (used for
  depth and measure checks), but its generated `layout()` is replaced. Reasons, all measured: (1) the
  text blocks ignore `align`, so centring needs per-line placement; (2) a `content` stack scales its
  children to fill a tall region; (3) `ctx.layoutChild` wrappers sit at non-zero offsets, which the SVG
  renderer ignores, so every nested composite failed DOM/SVG parity. `library/composite/_kit.ts`
  (`composeFlat`, `placePiece`, `flattenNode`, `translatePath`) lays out each piece with `ctx.layoutChild`,
  flattens to absolute leaves under one root group at (0,0) (path `d` and `line` endpoints are translated
  and re-boxed to the full block), and names parts (`kicker`, `logo[0]`...). Parity now passes for all eight,
  including every chart kind.
- **The parity probe was comparing empty trees for composites.** `assertParity` built its layout context
  without a registry, so `ctx.layoutChild` returned empty groups and every composite "passed" (profile-card
  and stat-card included). `assertParity(..., { registry })` and `standardBlockSuite(def, { withRegistry: true })`
  are new and opt-in; the other families are unchanged. Existing composites (swot, profile-card, kpi-row...)
  were NOT re-probed with a registry: they probably fail for the nesting reason above.
- **Centring.** `estimateMetrics` runs 10-25% wide on large Inter text (a centred 96px title sat 38px
  off, a 44px subtitle 92px off). Centred lines use `tableMetrics` (per-glyph advances, ~3% error) via
  `_kit.lineWidth`. Left anchoring is still exact.
- **Digest.** Top-8 detail is 11,985/12,000 (`tls.c.feature-grid` grew 19 chars from its new avoid line; the
  eight new blocks are 976-1,365 chars, cover the largest). Index 14,104/20k.
- **Depth.** Layouts are 1 level deep (children are leaves), so all eight work at any nesting level except
  the reference `build()` trees, which are asserted <= 4.
- **Browser.** Next dev serves a stale `packages/tldraw/dist` after a rebuild unless the server (and `.next`) is
  restarted: a changed text-box width did not show until then.

## Phase done when
- [x] Must composites ✅, each with a depth ≤ 4 assertion. (8 of 8 must composites; `depthOk` per block.)
- [x] New demo deck fixture `block-library-tour.json` (one slide per must composite plus one per
  phase P1–P4), validated by `validateDeckSpec` with 0 errors, screenshotted per slide, and
  **every PNG opened**. Copy it to `examples/nextjs-sample/data/decks/` byte-identical and
  register it in `demo-deck-contract.spec.ts` if that spec enumerates fixtures. (Part A slides done;
  the contract/roundtrip specs only read `demo-deck.json`, so the tour is registered in
  `catalog-conformance` (slide-scope nesting), picked up by `collision.spec` automatically, and has its own
  `block-library-tour.spec.ts` (0 errors, byte-identical copy). Part B composites still to be added.)
- [ ] `capabilityIndex()` for the full catalog pasted into the session log note, with its char count.
- [ ] Full suite, tsc 0, README counts and session log updated.
