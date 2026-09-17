# Blocks — using the demo, adding a block, wiring the AI backend

This is the practical companion to [reviews/blocks/README.md](../reviews/blocks/README.md)
(the rules) and [reviews/blocks/BACKLOG-enhance.md](../reviews/blocks/BACKLOG-enhance.md)
(what is being built next). Where a step depends on a task that has not landed yet, it says so
with the task id, so the guide stays truthful as the code catches up.

Contents: §1 running and using the demo · §2 adding a block (layout kind today, html kind after
R2) · §3 the FastAPI / LLM integration flow · §4 things that have already cost time.

---

## 1. Running and using the demo

```bash
# once
yarn install
yarn build:packages                       # root script; passes --log-order=stream to turbo 1.13
# then
cd examples/nextjs-sample && yarn dev     # http://localhost:5433
```

The sample app consumes `packages/tldraw/dist`, **not** `src`. After any change under
`packages/tldraw/src`, rebuild, or the Next.js app keeps running the old code. If `dist/index.js`
is missing after a build that exited 0, read the build output: esbuild can fail to bundle while
`turbo` still reports success (this happened when a Node-only module was exported from the
package root).

| Route | What it is |
|---|---|
| `/view/<deckId>` | `<DeckViewer>` — read-only, animated, no editor mounted. `→` / Space / click = next build step, `←` back, `Home` / `End`. |
| `/edit/<deckId>` | `<Tldraw>` with the block registry. Save runs `documentToDeckSpec` and PUTs; the right panel shows the input spec, the output spec and the findings side by side. Reload re-fetches. |
| `/api/decks/<deckId>` | Mock backend. `GET` reads `examples/nextjs-sample/data/decks/<deckId>.json`; `PUT` stores in memory for the life of the dev server. |

The demo deck is `packages/tldraw/src/blocks/__fixtures__/demo-deck.json` (copied into
`data/decks/deck-demo-q3.json`). It is a Schema v1 `DeckSpec`:

```jsonc
{
  "version": 1, "id": "deck-demo-q3", "title": "…", "theme": "mono-grid", "aspect": "16:9",
  // built-in theme ids: midnight · ivory-editorial · coral-pop · forest · mono-grid (state/shapes/shared/deck-theme.ts)
  "slides": [
    {
      "id": "sl_03", "layout": "two-column",
      "regions": {
        "title": [ { "id": "b_03_title", "type": "tls.t.title", "props": { "text": [...] },
                     "motion": { "preset": "fade-up", "order": 1 } } ],
        "left":  [ { "id": "b_03_chart", "type": "tls.d.bar", "props": { "series": [...] } } ],
        "right": [ { "id": "b_03_take",  "type": "tls.t.takeaway", "props": { "text": "…" } } ]
      },
      "free": [ { "id": "b_03_note", "type": "tls.t.caption", "props": { … },
                 "box": { "x": 1180, "y": 860, "w": 620, "h": 80 } } ]
    }
  ]
}
```

- `regions` is the semantic placement: the layout (`two-column`, `kpi-row`, `quote`, …) decides
  the boxes. This is what the AI should produce.
- `free[]` is the escape hatch with hard coordinates in the 1920×1080 frame. The editor produces
  it when a person drags a block out of every region; `validateDeckSpec` warns that it will not
  re-layout if the aspect changes.
- Colors are **roles** (`accent`, `surface`, `textMuted`, …), never hex, in anything a block or
  the AI emits. A hex value is something a person set in the inspector.

Two routes into the code from a JSON file:

```ts
import { deckSpecToDocument, documentToDeckSpec, validateDeckSpec, capabilityDigest } from '@tlslides/tldraw'

const { document, findings } = deckSpecToDocument(spec)   // spec → TDDocument for <Tldraw>
const back = documentToDeckSpec(document)                  // TDDocument → spec after editing
const problems = validateDeckSpec(spec)                    // DeckFinding[]; never throws
const prompt = capabilityDigest()                          // Markdown catalog for the LLM
```

Useful checks while working:

```bash
cd packages/tldraw
npx jest src/blocks                                     # block system suites
node ../../tools/visual/shoot.js parity-3way            # editor vs viewer geometry; expect 0 failing rows
node ../../tools/visual/shoot.js blocks                 # contact sheet — LOOK at the PNG
```

---

## 2. Adding a block

Read [reviews/blocks/04-block-anatomy.md](../reviews/blocks/04-block-anatomy.md) once; §4.9 is
the ten-point definition of done every block must meet. What follows is the mechanical part.

### 2.1 The folder

One block, one folder, under the family directory:

```
packages/tldraw/src/blocks/library/<family>/tls-<f>-<name>/
  schema.ts        # SlotSpecs + defaults — this is what the AI reads
  layout.ts        # pure function: (props, ctx) → LayoutNode
  motion.ts        # parts + default preset
  index.ts         # the BlockDefinition
  tls-<f>-<name>.spec.ts
```

Families and prefixes: `layout` → `tls.l.*`, `text` → `tls.t.*`, `data` → `tls.d.*`,
`media` → `tls.m.*`, `diagram` → `tls.g.*`, `composite` → `tls.c.*`, `chrome` → `tls.k.*`.
Registration is one line in the family's `index.ts` (`textBlocks`, `dataBlocks`, …), which
`library/index.ts` folds into `BUILT_IN_BLOCKS`. The digest, the registry snapshot test and the
inserter all derive from that array — nothing else to update.

### 2.2 `schema.ts` — write it for the model, not for the compiler

```ts
export const schema: BlockSchema = {
  value:    { type: { kind: 'text', maxChars: 12 }, role: 'content', label: 'Value', required: true,
              guidance: 'The number as it should read: "$4.2M", "61%", "118". Include the unit symbol.' },
  label:    { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Label', required: true,
              guidance: 'What the number measures, 1–3 words.' },
  delta:    { type: { kind: 'text', maxChars: 24 }, role: 'content', label: 'Delta',
              guidance: 'Change vs. the prior period, e.g. "+21% QoQ". Omit when unknown.' },
  polarity: { type: { kind: 'enum', values: ['up-good', 'down-good', 'neutral'] }, role: 'option', label: 'Polarity',
              guidance: 'Whether an increase is good. Drives the delta color.' },
  color:    { type: { kind: 'color' }, role: 'option', label: 'Value color',
              guidance: 'Override the value color. Role or theme token, never hex.' },
}
export const defaults: KpiTileProps = { value: '42%', label: 'Adoption', delta: '+6 pts', polarity: 'up-good' }
```

(`SlotSpec` is `{ type: SlotType, role: 'content' | 'option', label, required?, guidance?, help? }`
— see `blocks/types.ts` `SlotSpec` / `SlotType`. `role: 'content'` slots are what the AI fills;
`'option'` slots are for templates, themes and the inspector.)

Rules of thumb that make the digest useful:

- `guidance` is an instruction to a writer, one sentence, with an example value.
- `defaults` must render well with no input at all — it is the inserter preview and the poster.
- Keep the slot count under ~8. If a block needs more, it is two blocks or a container with
  children.
- Anything the model must not do goes in `describe.avoid` (after R7) — until then, in `summary`.

### 2.3 `layout.ts` — pure, measured, in slide units

```ts
export function layout(props: KpiTileProps, ctx: LayoutContext): LayoutNode {
  const pad = ctx.tokens.space.md
  const w = ctx.box.width - pad * 2
  const valueStyle = ctx.resolveText('display', { letterSpacing: -0.04 })
  const value = ctx.measureText(props.value, valueStyle, w)      // never guess a height
  const label = ctx.measureText(props.label, ctx.resolveText('subheading'), w)
  return {
    k: 'group', box: { x: 0, y: 0, width: ctx.box.width, height: pad * 2 + value.height + ctx.tokens.space.sm + label.height },
    children: [
      { k: 'text', part: 'value', box: { x: pad, y: pad, width: w, height: value.height },
        lines: value.lines, style: { ...valueStyle, color: ctx.resolveColor('accent').color } },
      { k: 'text', part: 'label', box: { x: pad, y: pad + value.height + ctx.tokens.space.sm, width: w, height: label.height },
        lines: label.lines, style: { ...ctx.resolveText('subheading'), color: ctx.resolveColor('text').color } },
    ],
  }
}
```

- No `document`, `window`, `Date.now`, `Math.random`, no throwing. The same function runs in the
  editor, in `<DeckViewer>` and in Node for SVG export.
- Every visual element that motion or lint will address gets a `part`. Repeated items use
  `part/i` (`bar/0`, `item/2`).
- Return the **content height** in the root box. R0 makes `compileSlide` stack regions by this
  number; a layout that reports the box it was given instead of what it drew will overlap its
  neighbour.
- Colors through `ctx.resolveColor(role)`; it contrast-solves against the surface the block sits
  on. Composites arrange other blocks with `ctx.layoutChild(childSpec, box)` (depth-capped at 4)
  rather than drawing text themselves.

### 2.4 `motion.ts` and `index.ts`

```ts
export const motion: MotionRecipe = { parts: ['value', 'label'], preset: 'count-up' }

export const tlsCKpiTile: BlockDefinition = {
  type: 'tls.c.kpi-tile', name: 'KPI tile', family: 'composite', tier: 'A',
  summary: 'One metric: big value, label, optional delta colored by polarity.',
  keywords: ['kpi', 'metric', 'stat', 'number', 'delta'],
  schema, defaults, size: { preferred: [420, 260], min: [220, 160] },
  layout: layout as BlockDefinition['layout'], motion,
  // after R7:
  // describe: { when: 'A slide that leads with 1–5 headline metrics.', avoid: 'More than 5 tiles; a metric without a label.', example: {...} },
}
```

### 2.5 The spec file — what to assert

1. `defaults` lays out without throwing under all five themes, light and dark.
2. Parts: the set of `part` names in the output equals `motion.parts` (plus indexed ones).
3. Root box height equals the sum of the children plus padding — the intrinsic-height contract.
4. Adversarial props: empty string, a 400-character word, CJK text, 40 items — no throw, and the
   output stays inside the box or reports overflow via `capacity()`.
5. Parity: add the block to the parity fixture so `renderNodeToDom` and `renderNodeToSvg` are
   compared automatically.
6. A screenshot row in `tools/visual/scenarios/blocks.js`. Look at it.

### 2.6 Html-kind blocks (after R1–R2 land)

Same folder, same `schema.ts`, same `index.ts`, but instead of `layout.ts`:

```ts
// template.ts — markup, escaped, colors from CSS custom properties the runtime sets
export function template(p: FeatureGridProps, ctx: HtmlTemplateContext): string {
  return `<div class="tls-grid" style="color:var(--tls-on);background:var(--tls-surface)">
    ${p.cells.map((c, i) => `
      <div data-part="cell/${i}">
        <div data-part="cell/${i}/icon">${ctx.esc(c.icon)}</div>
        <h3 data-part="cell/${i}/title" data-prop-path="cells.${i}.title">${ctx.esc(c.title)}</h3>
        <p  data-part="cell/${i}/desc"  data-prop-path="cells.${i}.desc">${ctx.esc(c.desc)}</p>
      </div>`).join('')}
  </div>`
}

// poster.ts — a still for SVG export and thumbnails, built from existing text layouts
export function poster(p: FeatureGridProps, ctx: LayoutContext): LayoutNode { … }

// animate.ts — optional; GSAP when the host provided it, otherwise the runtime plays the preset
export function animate(root: HTMLElement, rt: BlockMotionRuntime) {
  if (!rt.gsap || rt.reducedMotion) { rt.onComplete(); return }
  // `rt.gsap` is typed structurally (`GsapLike`) — the package never imports gsap or its types
  const tl = (rt.gsap as GsapLike).timeline({ onComplete: rt.onComplete })
  tl.from(root.querySelectorAll('[data-part^="cell/"]'), { y: 24, opacity: 0, stagger: rt.timing.staggerMs / 1000, duration: rt.timing.durationMs / 1000, ease: rt.timing.ease })
  return () => tl.kill()
}

// index.ts
export const tlsCFeatureGrid: BlockDefinition = { …, tier: 'B', kind: 'html', html: { template, poster, animate } }
```

What stays the same as a layout block: schema with guidance, parts, defaults, the digest entry,
`validateDeckSpec`. What is different: the parity test compares the **poster** to the SVG
renderer and a jsdom test checks the template's text equals the poster's text. Three rules:

- The template is code in the registry. The `DeckSpec` never carries markup; everything from
  `props` goes through `ctx.esc()`.
- Colors come from `--tls-*` custom properties, never literal hex, so themes and per-instance
  `style` (R4) apply to html blocks too.
- `animate` must call `rt.onComplete()` on every path — the viewer waits on it for
  `afterPrevious` chaining, and a block that forgets is timed out with a warning naming it.
  Never animate `transform` (the shape wrapper owns it); animate `translate`, `scale`, `opacity`,
  `clip-path`, `filter` — the same allow-list the WAAPI driver enforces.

### 2.7 Registering a block from the host instead of the library

A Next.js host can register its own blocks without forking the package:

```ts
const registry = new BlockRegistry()
registerBuiltInBlocks(registry)
registry.register(myBlockDefinition)              // any BlockDefinition, layout or html kind
<Tldraw blockRegistry={registry} hostRegistry={hosts} />   // hostRegistry after R1
```

Host-registered blocks appear in `capabilityDigest(registry)` and `validateDeckSpec(spec, registry)`
like built-ins, so the backend's prompt can include them. **Gap:** `<DeckViewer>` currently builds
one module-level registry from `registerBuiltInBlocks` and takes no `registry` prop
(`DeckViewer.tsx`, "Shared block registry"), so a host block renders in the editor but not in the
viewer. R1 adds `registry` and `hostRegistry` props to the viewer beside the editor's.

---

## 3. FastAPI + LLM integration — how a model picks blocks

The frontend never talks to the LLM. It talks to FastAPI in `DeckSpec` JSON; FastAPI owns the
prompt. This section is the minimal loop; the full design (deck profiles for teaching vs keynote
vs report, outline → plan → fill → review stages, what is saved, the self-review critic, the tech
stack) is [reviews/blocks/LLM-ARCHITECTURE.md](../reviews/blocks/LLM-ARCHITECTURE.md). The Next.js mock in `examples/nextjs-sample/app/api/` is the reference for the shapes
the real backend must return. The endpoint table is in task **R16** of
[BACKLOG-enhance.md](../reviews/blocks/BACKLOG-enhance.md); today only `GET/PUT /api/decks/:id`
exist.

### 3.1 The loop

```
brief ─▶ prompt = system(rules) + capabilityDigest() + few golden decks + brief
      ─▶ LLM, structured output constrained by deckSpecJsonSchema()          (R7)
      ─▶ validateDeckSpec(deck)   ── errors? ─▶ one repair round: append findings, re-ask
      ─▶ store DeckSpec (Postgres JSONB) ─▶ frontend GETs ─▶ <DeckViewer> / <Tldraw>
      ─▶ person edits ─▶ PUT ─▶ "revise" sends instruction + current DeckSpec back to the LLM
```

Three properties the frontend relies on:

1. **The digest is generated, never written.** `capabilityDigest(registry)` is built from the
   block definitions at call time. When a block is added in §2, the model learns about it on the
   next request with no prompt edit. Cache it per package version in FastAPI; regenerate on
   deploy.
2. **Validation runs on both sides.** FastAPI runs `validateDeckSpec` in a Node sidecar (or via
   `POST /api/decks/validate` against the Next.js app) before storing; the editor runs it after
   every save. Findings are structured — `DeckFinding { level: 'error' | 'warning', rule, path,
   message, suggestion? }` with `message` written to be fed straight back to the model — so a
   repair prompt is just the findings array appended to the conversation.
3. **Regions, not pixels.** The model emits `regions`; it should be told never to emit `free[]`.
   `free[]` exists for people. A model that emits coordinates produces slides that break on the
   first aspect change.

### 3.2 What the prompt contains (until R7 makes it one call)

Today `capabilityDigest()` yields: a layout → regions table, and per block the summary,
keywords and a slot table with the writer guidance, followed by one worked slide. R7 adds the
color-role list, the style shape (including gradients), the motion vocabulary with default
durations from `blockShowDuration`, a per-block `when / avoid / example`, and the JSON Schema.
Until then the backend should append, by hand, the 12 color roles and the preset names it wants
the model to use — and remove that text the day R7 lands, because a hand-written copy drifts.

A compact system instruction that has worked with this schema:

> You produce a `DeckSpec` v1 JSON only. Use the layouts and blocks in the catalog below and no
> others. Place blocks in `regions` by name; never use `free`. Colors are role names from the
> list; never hex. One idea per slide; a title is never a full sentence. Set `motion` only when
> the reveal order matters, using `order` and `trigger`. Return the JSON and nothing else.

### 3.3 Timing for the backend (after R6)

`slideTimeline(slide, registry)` returns each build step's start/end and the slide's total in
milliseconds. FastAPI can use it to plan voice-over alignment or an auto-advance schedule, and
to cap a model that stacks too many `afterPrevious` reveals on one slide. `blockShowDuration` is
the same number per block; R7 puts each preset's default into the digest so the model can reason
about pacing before the backend measures it.

### 3.4 Editing round trip

The editor is the model's reviewer. `documentToDeckSpec` returns the spec plus findings such as
`shape/no-region-match` (a block was dragged out of every region and is now in `free[]`). The
backend should store what the editor sends verbatim, and when the person asks the model to
revise, send the **edited** spec — the model then works from what the person approved, not from
its own earlier draft.

---

## 4. Things that have already cost time

- The root scripts now pass `--log-order=stream` (the pinned `turbo` 1.13 removed `--stream`).
  `yarn test` still cannot pass end to end because `packages/core`'s jest setup fails on an ESM
  import in `setupTests.ts` (all 18 suites; `--listTests` alone looks fine and is misleading).
  The `.husky/pre-commit` hook runs `yarn test`, so commits from `packages/tldraw` work run jest
  there directly (`cd packages/tldraw && npx jest src/blocks`) and commit with `--no-verify`
  until core's config is fixed.
- Text metrics are category tables (`sans`, `serif`, `mono`, `script`), hand-authored, not
  extracted from a font. Until R0 checks in a per-glyph table for the theme font, a layout that
  "fits" in the estimate can wrap in the browser — that is exactly the demo's overlap bug.
- The build tool does not fail on type errors and can emit `.d.ts` files with no `dist/index.js`.
  Read the output; check the file exists.
- Green tests are not a screenshot. Q17 measured editor/viewer geometry to 0.7 units and the
  demo still overlapped text on three slides because both agreed on the wrong metrics. Every
  block change ships a scenario whose PNG somebody looks at.
- Do not `git stash` while agents are writing; some directories under `packages/tldraw/src` are
  root-owned and `stash pop` cannot unlink into them.
- Playwright is deliberately not a dependency. `tools/visual/playwright.js` `loadPlaywright()`
  finds a global install and explains how to get one if missing.
