# 9. Testing strategy

What "done" means, mechanically. Every phase's acceptance section in
[08-phase-plan.md](08-phase-plan.md) is an instance of this.

## 9.1 The four layers

| Layer | Runs | Catches | Cost |
|---|---|---|---|
| **Unit (jest)** | `yarn test` / `pnpm test` | logic, geometry, schema, purity, lint rules | cheap |
| **Parity (jest + Playwright)** | per Tier-A block | DOM and SVG disagreeing — the failure this architecture exists to prevent | medium |
| **Visual (Playwright)** | `node tools/visual/shoot.js <scenario>` | a canvas that renders nothing, or renders wrong | medium |
| **Judgement** | a person looking at a screenshot | "this is a finished slide" vs "this is a debug rectangle" | the only one that catches design |

The fourth is not optional and not automatable. This repo's own history is the argument: a
test-invisible bug was caught by looking at a screenshot in Phase 8a (a rounded rectangle rendering
as a hexagon), 8b (Tab cloning the shape being styled), 11 (a CSS class silently beating an SVG
`fill` attribute), 13 (dividers invisible from a coordinate-space mismatch), 15 (text unscaled in
every export since Phase 13 — found one phase late), and 16 (opening a popup silently ending the
presentation). Every one passed the full suite.

## 9.2 Unit tests

Per block, minimum:

```
<name>.spec.ts
  schema         accepts good input; rejects each bad shape with a specific message
  defaults       produce a valid, complete node tree with zero input
  purity         layout() runs with document/window/Date/Math.random stubbed to throw
  geometry       expected parts, at expected boxes, at min / preferred / 2× preferred
  capacity       overflow detected; each declared remedy actually fires
  motion         motion.parts === parts emitted by layout (both directions)
  lint           zero findings on defaults × 5 themes × {light, dark, gradient} surfaces
  roundtrip      spec → shape → spec lossless, incl. JSON.parse(JSON.stringify(...))
```

The purity test matters more than it looks. It is what guarantees the block works on a server, in
a fixture, and in the linter — and it is trivially cheap:

```ts
it('lays out with no browser globals', () => {
  withGlobalsThrowing(['document', 'window', 'Date', 'Math.random'], () => {
    expect(() => def.layout(def.defaults, nodeCtx())).not.toThrow()
  })
})
```

## 9.3 The parity harness — the load-bearing test

**Claim under test:** for a Tier-A block, what the editor shows and what an export produces are
the same picture.

```ts
await assertParity(definition, props, box, { tolerance: 1 /* slide unit */ })
```

How it works:
1. `layout(props, ctx)` once. Both renderers consume the *same* node tree — so this does not test
   that two layouts agree (they cannot disagree); it tests that two **renderers** agree.
2. DOM: render into a Playwright page at camera zoom 1, read every `[data-part]`'s
   `getBoundingClientRect`, convert back to slide units.
3. SVG: render to a string, parse, compute each part's box from its attributes.
4. Compare part-for-part: box within tolerance, fill/stroke exact, text content and line count
   exact, font size within 0.5.

Deliberate exclusions, stated so a later reader does not think they were forgotten:
- **Antialiasing and subpixel rendering** — hence 1 unit of tolerance, not 0.
- **Font rasterization** — text *boxes* and line breaks are compared; glyph shapes are not.
- **Tier B blocks** — compared against their `poster()` only, by snapshot.

A parity failure is a P0. It means somebody special-cased a renderer, which is the one thing the
architecture forbids.

## 9.4 Visual scenarios

The existing harness (`tools/visual/shoot.js`, scenarios export `{ route, run(page) }`, non-zero
exit on a page error, screenshots to `tools/visual/shots/`) is reused as-is. New scenarios:

| Scenario | Phase | Shows |
|---|---|---|
| `tokens.js` | P19 | role swatch matrix × 5 themes × light/dark/gradient |
| `blocks-render.js` | P20 | every `LayoutNode` kind, DOM beside SVG |
| `blocks-export.js` | P21 | editor screenshot beside a rasterized headless SVG of the same slide |
| `blocks-motion.js` | P22 | a real presentation, screenshotted mid-build and at rest |
| `blocks-text.js` | P23/P24 | a type specimen: every token, list, rich runs, autofit at 3 sizes |
| `blocks-layout.js` | P24 | container contact sheet + a reflow at 3 aspect ratios |
| `blocks-data.js` | P25 | 32 charts with realistic **and** adversarial data |
| `blocks-diagram.js` | P26 | 30 diagrams at 2, 5 and 12 items |
| `blocks-media.js` | P27 | portrait/landscape/square sources; text-on-photo at 4 anchors |
| `blocks-composite.js` | P28 | 20 composites + one deck with a master |
| `blocks-templates.js` | P29 | all 12 rebuilt templates, before/after |
| `blocks-authoring.js` | P30 | the real UI driven by real clicks |
| `deck-doctor.js` | P31 | a deliberately bad deck and its findings |
| `ai-fixtures.js` | P32 | 10 compiled `DeckSpec` decks as contact sheets |

Existing scenarios (`shapes`, `frame`, `line`, `reorder`, `styles`, `stylepanel`, `background`,
`theme`, `templates`, `deckapi`, `export`, `present`, `typography`, `blocks`, …) must keep passing
unchanged. A block phase that breaks `templates.js` has broken Phase 13.

**Follow the `stylepanel.js` precedent for anything testing the UI:** drive the real controls with
real clicks and real typing; use `window.app` only to seed deterministic state and to read back
assertions. A scenario that calls `window.app` to perform the action it claims to test is testing
nothing.

## 9.5 Adversarial content

Block libraries fail at the extremes, and only deliberate input finds it. Every library phase runs
its contact sheet against this set:

| Case | Why |
|---|---|
| Empty / 1 / 2 items | most layouts are designed for 3–5 and collapse at 1 |
| 40 items | overflow cascade, stagger cap, pagination |
| A single 400-character word | line breaking with no break opportunity |
| CJK-only, and CJK+Latin mixed | different measurement rates in `estimateTextSize` |
| RTL text | **known unhandled** (P23) — the test exists to keep it visible, not to pass |
| All-zero, all-negative, one huge outlier | chart scales, nice-ticks, zero baselines |
| Missing / null values | must be explicit per chart type, never silently zeroed |
| A missing asset, a missing icon | degrade with a marker; never throw |
| 6-deep nesting | depth cap fires as a lint error, no recursion |
| A 4:3 and a 9:16 frame | region and block reflow |
| The darkest and lightest theme on the darkest and lightest background | contrast solving |

## 9.6 Regression protections that must never be removed

Each encodes a bug this repo already paid for. Deleting one re-opens it.

| Guard | Protects |
|---|---|
| `renderPageToSvg` with **no** `blocks` option matches the pre-P21 snapshot byte-for-byte | the placeholder contract (Phase 5/15) |
| A `fadeIn` block exports at full opacity | presentation state leaking into exports (Phase 16) |
| `style.scale` multiplies font size in every text path | Phase 15's silent export bug |
| Tab in every block field does not clone the shape | Phase 8b |
| `defaults` deep-cloned per instantiation (`not.toBe` + `toEqual`) | Phase 3's array aliasing |
| Paint set via inline `style`, never the `fill` attribute | Phase 11 |
| Paint on inner nodes, never an outer container | Phase 8a |
| No block uses `LineShape.handles` semantics | Phase 13 |
| `build:packages` output **read** for type errors | Phase 5/7 — the tool exits 0 with type errors |
| `editorOnly` blocks absent from every export path | P28 |

## 9.7 Performance budgets

Asserted, not hoped for.

| Budget | Limit | Where |
|---|---|---|
| `layout()` for one block | < 2ms | unit, timed |
| A full 20-block slide compile | < 50ms | unit |
| `renderPageToSvg` of a 20-block slide | < 100ms | unit (Node) |
| `lintDeck` on a 60-slide deck | < 2s | unit |
| Presentation build on a slide | 60fps, ≤ 40 simultaneous animated elements | visual + manual |
| `@tlslides/blocks` minified+gzipped | < 250KB, tree-shakeable per family | build check |

That last one has teeth: 170 blocks in one bundle is a real risk for a host. The library must be
importable per family (`@tlslides/blocks/data`) and the build check fails if the full bundle
exceeds the budget.

## 9.8 What a phase reports when it ships

Mirror the Phase 1–17 convention in `reviews/README.md`, in the phase's notes section in
[08-phase-plan.md](08-phase-plan.md):

```
**Verified:** N/N jest suites (M tests, up from M′) · `build:packages` 9/9 with zero type errors ·
parity N/N blocks · scenarios <list> exit 0 with no console errors, screenshots inspected ·
lint clean on defaults across 5 themes × 3 surfaces.
```

Plus prose covering: what differed from the plan and why; every bug found, with its mechanism (not
just "fixed a bug"); what was **not** built, named as a follow-up rather than dropped; and any new
trap a future phase will hit.

Baseline to count from: **87/87 suites, 570 tests** at `df699142`.
</content>
