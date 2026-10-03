# P7 · Motion styles + showcase blocks — 1 schema field, 4 blocks, 1 demo deck

**Status (2026-10-03):** in progress.

**Goal (user):** some slides should have striking, showy animation, others stay simple. Blocks
must support both, and a demo deck must show it in the browser.

**Finding that drives the plan (verified 2026-10-03):** a block animates in `<DeckViewer>` only
when its shape carries `animation`, and `deriveShapeAnimation` creates one only when the block's
own `spec.motion` has `order`/`preset`/`effect`. A deck with no per-block `motion` is fully
static, and nothing at slide or deck level can say "this slide is showy" or "this slide is calm".
Part choreography was also mostly dead: `playBlockReveal` matched `[data-part="<name>"]` exactly,
while layouts emit indexed parts (`bar/0`, `item[2].text`) under recipe names `bar`,
`item[*].text`.

**Folder:** `blocks/motion/motion-style.ts` (resolver), `library/composite/` (new blocks, prefix `c`).
**Reference:** `tls-c-hero/` (html kind, GSAP path + driver fallback).

---

## Status

| # | Item | Priority | Status | Commit | Notes |
|---|---|---|---|---|---|
| 7.0 | This plan + README row | must | ✅ | | |
| 7.1 | `motionStyle` on deck + slide (compiler, viewer, validator, schema, digest) | must | ⬜ | | |
| 7.2 | `tls.c.kinetic-title` | must | ⬜ | | |
| 7.3 | `tls.c.stat-spotlight` | must | ⬜ | | |
| 7.4 | `tls.c.journey` | should | ⬜ | | |
| 7.5 | `tls.c.feature-reveal` | should | ⬜ | | |
| 7.6 | `MotionRecipe.expressive` on existing layout blocks | should | ⬜ | | |
| 7.7 | Demo deck `motion-showcase.json` (fixture + sample copy) | must | ⬜ | | |
| 7.8 | Browser pass: screenshots, video, mid-animation frames | must | ⬜ | | |

---

### 7.1 · `motionStyle` (additive, optional)

- `DeckSpec.motionStyle?: 'static' | 'subtle' | 'expressive'`, `SlideSpec.motionStyle?` (slide
  wins over deck). Absent everywhere = today's output, byte for byte.
- Applied by `compileSlide` to blocks with **no own `motion`**. An explicit block `motion` always
  wins; `motion: { preset: 'none' }` opts a block out. A recipe whose preset is `none` (chrome) is
  never animated by a style.
  - `static`: no animation.
  - `subtle`: `fade`, fast (250 ms), all blocks in one auto step, 60 ms offset per block in
    reading order (capped). Parts only fade with the block. html blocks get `rt.style = 'subtle'`.
  - `expressive`: the recipe's `expressive` preset, else its `preset`, else `fade-up`. Part
    choreography on. Blocks chained in reading order (top-to-bottom, then left-to-right): the first
    `withPrevious`, the rest `afterPrevious`, so the slide plays with no click. html blocks get
    `rt.style = 'expressive'` and the duration from the recipe's `expressiveMs` (how long the
    showy timeline runs) so chaining waits for it.
- New optional fields: `MotionRecipe.expressive?: MotionPresetId`, `MotionRecipe.expressiveMs?:
  number`, `BlockMotionRuntime.style?: 'subtle' | 'expressive'` (missing = expressive).
- The derived motion is stored on the shape as `$block.styleMotion` + `$block.motionStyle`, never
  as `$block.motion`, so `documentToDeckSpec` returns the authored spec (no invented per-block
  motion); `TDPage.motionStyle` / `TDDocument.motionStyle` carry the field through the round trip.
- `playBlockReveal`: a recipe part with no exact `data-part` match now matches its indexed parts
  (`bar` → `bar/0…`, `item[*].text` → `item[0].text…`), staggered per element. Exact matches
  behave as before.
- Validator: `motion/unknown-style` warning on deck and slide. JSON schema: enum on both.
  Index + full digest: one line on when to use each style.

**Done when:** three styles + precedence + back-compat unit-tested; slide-compiler, motion/*,
validate-deck-spec, capability-digest, demo-deck-contract/roundtrip, block-library-tour green; tsc 0.

### 7.2–7.5 · Showcase blocks (`kind: 'html'`, `scope: slide` or `group`)

Every block: GSAP timeline when `rt.gsap` exists, driver fallback otherwise; `rt.reducedMotion`
calls `onComplete` at once; `rt.style === 'subtle'` plays one plain fade with numbers shown final;
`onComplete` exactly once; returns a disposer; never touches `root.style.transform`. Poster has a
full-box background rect (parity measures the root group bbox) and the same `data-part` set as
the template. Standard suite incl. DOM/SVG parity.

- **`tls.c.kinetic-title`** (cover): title words rise through a mask one by one with a slight
  rotation, accent underline draws, decorative shapes drift in, subtitle fades last.
- **`tls.c.stat-spotlight`** (metric): one huge number counts up while a ring arc draws around it,
  label slides in, 0–3 supporting stats pop with stagger.
- **`tls.c.journey`** (timeline): milestones on a path; the path draws across the slide, each node
  pops as the line reaches it, labels rise.
- **`tls.c.feature-reveal`** (list): 3–6 cards flip/scale in with a staggered 3D tilt, icons bounce.

### 7.6 · Expressive recipes on existing blocks

Only existing presets. Candidates: bar/column-like charts (`grow-bars-y`), bullet and numbered
lists (`stagger-lines`), title (`words-in`).

### 7.7 · Demo deck

`packages/tldraw/src/blocks/__fixtures__/motion-showcase.json`, byte-identical copy in
`examples/nextjs-sample/data/decks/`, reachable at `/view/motion-showcase`. ~11 slides: expressive
kinetic cover, expressive stat-spotlight, the same content as `expressive` and as `subtle` pairs,
a `static` handout slide, journey, feature-reveal, charts/lists expressive vs subtle, closing.
`validateDeckSpec` returns no errors.

### 7.8 · Browser pass

`tools/visual/scenarios/motion-showcase.js`: settled screenshot per slide, a `recordVideo` run of
the whole deck (1600x900) to `tools/visual/shots/motion-showcase.webm`, mid-animation frames as
PNGs. Look at every PNG.

---

## Phase done when
- [ ] 7.1 shipped with tests, back-compat proven by the existing compiler/demo specs.
- [ ] Four showcase blocks shipped, parity probe passing, `EXPECTED_BLOCK_COUNT` bumped.
- [ ] Demo deck validates; browser pass done with screenshots and video opened.
- [ ] README counts and session log updated.
