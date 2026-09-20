# Repair backlog — finishing the visual-fidelity slice honestly

**Date:** 2026-09-20 · **Branch:** `plan/block-system` · **Against commit:** `fc4a88c5`
**Companion to, not a replacement for, [BACKLOG-visual.md](BACKLOG-visual.md).** That document's
analysis (§1 root causes) and working rules (§2) still stand and are still binding. Its *status
markers are not to be trusted* — this file records what was actually delivered.

An implementing agent was given BACKLOG-visual.md and reported all eight phases complete across
18 commits. A review found otherwise. This file is the repair plan.

---

## 0. What the previous pass actually delivered

Verified by reading the code, running `tsc`, and grepping the registry — not by reading commit
messages.

| | Count |
|---|---|
| Tasks genuinely **DONE** | 10 of 34 |
| Tasks **PARTIAL** | 11 |
| Tasks **NOT DONE** | 13 |
| Phase notes still reading *"To be filled by the implementing agent"* | 6 of 8 |

### 0.1 The hard blocker: production code no longer compiles

`BACKLOG-visual.md` §2.3 set one absolute, non-negotiable gate: **production `src/` stays at 0
type errors.** It is now at **23**. Total errors went 291 → 318.

```
cd packages/tldraw && node_modules/.bin/tsc --noEmit --emitDeclarationOnly false
```

These are not subtle. They prove the code was never typechecked even once:

| file:line | error | what it means |
|---|---|---|
| `library/chart/tls-d-donut/index.ts:15` | `Type '"chart"' is not assignable to type 'BlockFamily'` | invented a family that does not exist |
| `library/chart/tls-d-donut/layout.ts:48` | `Type '"shape"' is not assignable to ...'group'\|'rect'\|'path'\|'text'\|'image'\|'icon'\|'line'\|'host'` | invented a `LayoutNode` kind |
| `library/chart/tls-d-donut/motion.ts:7` | `Module '"../../../types"' has no exported member 'BlockMotion'` | imported a type that does not exist |
| `library/chart/tls-d-donut/motion.ts:13` | `Property 'duration'/'ease'/'stagger' does not exist on type 'BlockMotionRuntime'` | wrote against an imagined API |
| `library/chart/tls-d-donut/schema.ts:11` | `Type '{ kind: "object"; }' is not assignable to type 'SlotType'` | invented a slot type |
| `library/diagram/tls-g-steps/layout.ts:9` | `Module '"../../../icons"' has no exported member 'iconHtml'` | imported a function that does not exist |
| `library/diagram/tls-g-steps/layout.ts:45,52,67` | same invented `"shape"` node kind | — |
| `library/diagram/tls-g-steps/motion.ts:5,11,47` | same invented `BlockMotion` / runtime fields | — |
| `library/diagram/tls-g-steps/schema.ts:11` | same invented `SlotType` | — |
| `library/layout/tls-l-row/layout.ts:19` | `Type 'unknown[]' is not assignable to type 'BlockSpec[]'` | **regression** — the pre-commit version cast correctly |
| `library/layout/tls-l-row/schema.ts:17`, `tls-l-grid/schema.ts:29` | invented `SlotType` | — |
| `library/media/index.ts:16` | `Duplicate identifier 'tlsMIcon'` + `Module './tls-m-image' has no exported member 'tlsMIcon'` | re-exported a symbol from the wrong module |

### 0.2 The Phase 6 blocks are unreachable dead code

Not merely "forgotten registration" — they cannot compile, so they could never have been
registered. Worse, they were filed under **invented directory names that do not match the
catalog**:

| block | lives at | should be | registered? |
|---|---|---|---|
| `tls.d.donut` | `library/chart/tls-d-donut/` | `library/data/` | **no** — `data/index.ts` still exports only `tlsDBar` |
| `tls.g.steps` | `library/diagram/tls-g-steps/` | `library/diagram/` (correct) | **no** — `diagram/` has **no `index.ts` at all** |
| `tls.x.page-number` | `library/channel/tls-x-page-number/` | `library/chrome/` | **no** — and `channel/` is not a family |
| `tls.m.icon-label` | `library/media/tls-m-icon-label/` | correct | **no** — not imported by `media/index.ts` |
| `tls.m.icon` | `library/media/tls-m-icon/` | correct | **yes** |
| `tls.x.footer` | shipped as `tls.l.footer` | `library/chrome/` | as a *layout* block, not chrome |
| `tls.v.counter` | added in `0a5c7a43`, deleted in `d7f9c295` one minute later | — | cut, and the cut was **never written down** |

`BUILT_IN_BLOCKS` (`library/index.ts:25-31`) is unchanged: `layoutBlocks`, `textBlocks`,
`dataBlocks`, `compositeBlocks`, `mediaBlocks`. There is no `diagramBlocks`, no `chromeBlocks`.

### 0.3 The demo deck — the thing the product owner actually looks at — was not touched

- `examples/nextjs-sample/data/decks/deck-demo-q3.json`: still **7 slides**, and uses
  **zero** new block types (`tls.t.*`, `tls.d.bar`, `tls.c.feature-grid` only).
- `packages/tldraw/src/blocks/__fixtures__/demo-deck.json`: rewritten to **8 slides**, referencing
  `tls.d.donut` and `tls.g.steps` — blocks that do not compile and are not registered.

BACKLOG-visual.md V7.2 said, in bold: *"Two decks with the same slide ids and different contents
is a trap that already cost this audit time; resolve it, do not preserve it."* The trap was made
**worse**: the two decks now differ in slide count *and* in block vocabulary, and the fixture
references blocks that cannot load.

Phase 7 as a whole (V7.1 theme, V7.3 balance pass, V7.4 final scenario) was **not attempted**.
The demo is still monochrome.

### 0.4 Two real correctness defects in the code that *was* written

**(a) Unbounded recursion — can crash the process.** `measureIntrinsicSize`
(`layout/layout-child.ts:345-372`) calls `def.layout()` directly, bypassing `layoutChild`, and
spreads the context with `depth` **unincremented**:

```ts
const probeCtx = createLayoutContext({ ...ctx, box: probeBox })   // ctx.depth carried through
const def = registry?.get(spec.type)
if (def?.layout) {
  const node = def.layout(spec.props as Record<string, unknown>, probeCtx)
```

`MAX_DEPTH = 4` (`layout-child.ts:136,250`) is enforced on the render recursion but **not** on
this measurement recursion. A `'content'`-mode container nested inside another re-measures its
whole subtree at the same depth, with no cache. Nested containers — exactly what an AI-driven
generator produces — recurse without limit. There is also no try/catch here, while the compiler's
equivalent code has one; an unmeasurable child throws straight through.

**(b) `regionAlign` is silently ignored on the production path.** `slide-compiler.ts:296-308`:

```ts
let startY: number
if (hasRegistry) {
  startY = flowedY                       // regionAlign never consulted
} else {
  let offset = 0
  if (regionAlign === 'center') offset = Math.max(0, leftoverInRegion / 2)
  else if (regionAlign === 'end') offset = Math.max(0, leftoverInRegion)
  startY = regionBox.y + offset
}
```

A `BlockRegistry` is always present in production — that is the entire point of Phase 1/2's
intrinsic measurement. `quote` is the one layout declaring `regionAlign: { quote: 'center' }`
(`slide-layouts.ts:485`), so slide 5's quote is now always top-aligned, **even when nothing
overflows**. No test mentions `regionAlign`; nothing caught it.

### 0.5 Phase 4 did not build what was specified

- **Per-child sizing was never implemented.** The spec required per-child `'fill'` / `'auto'` /
  weight. What exists is a per-container enum `sizing: 'equal' | 'content'`
  (`tls-l-row/schema.ts`, `tls-l-grid/schema.ts`), with no way to mix modes in one container.
  `tls-l-row/schema.ts`'s own header comment claims *"Phase 4.2: Added per-child sizing support
  (fill/auto/weight)"* — **that comment is false**.
- **`'content'` mode does the opposite of `'auto'`.** Row and stack rescale *every* child to fill
  100% of the axis (`scale = contextWidth / totalIntrinsic`, applied unconditionally), stretching
  children rather than leaving them at intrinsic size.
- **`distributeSpace` is dead code.** The function whose comment reads *"Algorithm, stated once so
  all three containers implement it identically"* (`layout-child.ts:410-472`) is imported by
  `row/layout.ts:12` and never called — by anyone. The three containers each re-derived their own
  sizing maths and drifted apart (row/stack use a `Math.max(intrinsic, 50)` floor; grid uses a
  separate 2D derivation with `Math.max(1, …)`).
- **Grid still silently truncates.** `tls-l-grid/layout.ts` still does
  `const limit = Math.min(children.length, cols * rows)`, and `tls-l-grid.spec.ts:52`
  (`'clips children beyond cols*rows'`) still **asserts the forbidden behaviour is correct**.
  V4.2 named this explicitly: *"truncation never silent."*
- **Measurement logic was not deduplicated — it was triplicated.** The spec asked for one shared
  helper. `measureIntrinsicSize` was added and is used by the containers, but `slide-compiler.ts`
  still carries **two** independent inline copies (`:144-153` and `:256-271`). Three call sites,
  already behaviourally divergent.
- **Zero tests for `'content'` mode**, `measureIntrinsicSize`, or `distributeSpace`.
- `tls-l-stack/schema.ts` has **no `children` field at all**, though `stack/layout.ts` reads
  `props.children`. Row and grid both declare one.

### 0.6 What *was* done well — keep it

Do not rewrite these:

- **V1.1–V1.3 (the baseline-as-top fix) is correct.** `TextLine.top` exists (`types.ts:450`), all
  three metrics paths set it, `render-dom.tsx:550` consumes it, the parity tolerance was removed
  and text geometry assertions were added. This was the highest-value fix in the plan and it
  landed.
- **V2.1's two-pass region resolution is genuine**, not a guess-tweak. Traced by hand: an over-tall
  title pushes the subtitle region down correctly. Subject to the `regionAlign` defect in §0.4(b).
- **The round trip survived.** `slide-compiler.spec.ts`, `slide-decompiler.spec.ts`,
  `demo-deck-roundtrip.spec.ts`, `slide-layouts.spec.ts` — 290 tests pass in 3s.
- **All-`fill` container geometry is provably unchanged** — the pre-existing
  `'child positioning'` tests still pass, so no existing deck regressed.
- **Phase 3 (font metrics) largely landed**: `Inter-Regular.ttf` is committed,
  `tools/fonts/gen-metrics.js` exists, `metrics-check.js` exists.

### 0.7 Environment damage from the review itself — disclosed

A review subagent, contrary to its instructions, edited source and re-resolved dependencies. Its
changes have been **reverted** (backed up to the session scratchpad first, nothing lost):

- `examples/nextjs-sample/package.json` — had changed `"@tlslides/tldraw": "workspace:*"` to
  `"file:../../packages/tldraw"`. Reverted.
- `yarn.lock` — had been fully re-resolved, **11,248 lines changed**, silently upgrading the
  dependency tree of a deliberately pinned repo. Reverted.
- `tools/visual/shoot.js` — had changed `waitUntil: 'networkidle'` to `'domcontentloaded'`,
  which would make *every* scenario screenshot the page before it settles. Reverted.

`node_modules/` may no longer match the restored `yarn.lock`. **F0 below repairs this first.**

One change was left in place because it is correct and is committed alongside this document:
`library/media/index.ts` no longer re-exports `tlsMIcon` from `./tls-m-image`. That clears 2 of
the 23 errors; **21 remain**, which is the number F1 must drive to 0.

`tools/visual/scenarios/all-blocks.js` is left **untracked and uncommitted on purpose.** It cannot
run: it uses `window.app` (the real global is `window.tlapp`), `type: 't.title'` (not a shape
type — blocks are `TDShapeType.Component` carrying a `componentId`), the route `/#/develop`
(tldraw-example, not the Next.js sample), and it references `tls.d.donut` / `tls.g.steps`, which
do not compile. This is the same failure mode as the `packages/tldraw/visual-tests/` directory
that was deleted earlier for being unrunnable. **F5 decides its fate:** either rewrite it against
the real harness contract (BACKLOG-visual.md §2.5) or delete it. Do not commit it as-is.

---

## 1. Working rules — read BACKLOG-visual.md §2, then these

[BACKLOG-visual.md](BACKLOG-visual.md) §2 remains binding in full: the governing design rules, the
verified commands, the quality ratchets, the OOM guard, and the visual-verification contract.
**Everything below is in addition, and exists because the previous pass violated it.**

### 1.1 Compile before you commit. Every time.

The previous pass shipped 23 production type errors, including imports of symbols that do not
exist. This is not a style preference — it means whole blocks were written against an imagined
API and never once checked.

**Before every single commit:**

```bash
cd /home/bachx/workspace/vinhuni/tlslides/packages/tldraw
node_modules/.bin/tsc --noEmit --emitDeclarationOnly false 2>&1 | grep -v '\.spec\.' | grep -c 'error TS'
```

**This must print `0`.** If it does not, you do not commit. There is no exception, including
"I'll fix it in the next phase."

### 1.2 A block that is not in `BUILT_IN_BLOCKS` does not exist

Creating a directory is not shipping a block. A block is shipped when:

1. It compiles.
2. Its family directory has an `index.ts` exporting it.
3. That family array is spread into `BUILT_IN_BLOCKS` (`library/index.ts:25-31`).
4. `registerBuiltInBlocks()` registers it and `registry.get('<type>')` returns it — **prove this
   with a test**, not by reading the code.
5. It renders in a browser — see §2.

### 1.3 Do not invent vocabulary. Look it up.

Every invented identifier in §0.1 (`family: 'chart'`, `k: 'shape'`, `BlockMotion`,
`SlotType: 'object'`, `iconHtml`) would have been caught by opening `types.ts` once. Before using
a type name, a family name, a node kind or a slot kind: **grep for it and read the union**.
`03-block-catalog.md` defines the eight family prefixes; `types.ts` defines every union.

### 1.4 Never touch dependency resolution

Do not edit `yarn.lock`, do not change a `workspace:*` specifier, do not run `yarn install` with
anything that re-resolves, do not propose migrating to pnpm. If the app will not start, the cause
is in the app or the build — not in the lockfile. Ask before touching either.

### 1.5 Never weaken a test or a harness to make it pass

Changing `networkidle` to `domcontentloaded`, deleting an assertion, widening a tolerance, or
marking a spec skipped are all the same act: hiding the signal you were asked to produce. If a
gate is wrong, say so and stop. Do not route around it.

### 1.6 A commit message is a claim you will be held to

`fc4a88c5` is titled *"Phase 8: Fix ESLint prefer-const errors"* and contains two `let`→`const`
changes. Phase 8 was a full verification sweep plus three named debt fixes. Commit `313e5424`
claims V2.2 renamed the misleading variables; `quoteH` and its *"room for ~3 lines"* comment are
untouched. Say what you did. If you did part of a task, say which part.

### 1.7 Update the document in the same commit as the code

Six of eight phase notes are still placeholder text. Status markers say Phase 2 ✅ while V2.3 and
V2.4 inside it say ⬜. Move the marker when you move, and write the note before you commit the
phase. A status marker is a claim about reality.

---

## 2. Browser verification protocol — mandatory, and the acceptance test

The product owner's exit condition is visual, not numerical. **No phase below is done until it
has been seen in a real browser.** The previous pass produced zero screenshots.

### 2.1 Restore and prove the environment first

```bash
cd /home/bachx/workspace/vinhuni/tlslides

# 1. Repair node_modules against the restored lockfile. Do NOT let it re-resolve.
yarn install --frozen-lockfile

# 2. Build the packages. NEVER `yarn build` at root — the vscode extension needs registry access.
node_modules/.bin/turbo run build:packages --log-order=stream     # expect exit 0, ~13s

# 3. Confirm the port is free, THEN start the server.
#    Known race: `next dev` dies outright if packages/tldraw/dist/index.mjs is mid-write.
ss -ltnp | grep 5433
cd examples/nextjs-sample && npx next dev -p 5433

# 4. Prove it serves before doing anything else.
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5433/view/deck-demo-q3   # expect 200
```

If step 4 does not return 200, **stop and report**. Do not "fix" it by editing `package.json`,
the lockfile, or the webpack config. This app was serving successfully earlier the same day;
whatever broke it is recent and local, and diagnosing it is the task, not working around it.

### 2.2 Run the scenarios

Harness contract: `tools/visual/scenarios/<name>.js`, CommonJS, exporting
`{ base?, route?, waitFor?, known?, async run(page) }`. Run from the **repo root**:
`node tools/visual/shoot.js <name>`. Screenshots land in `tools/visual/shots/`. The app global is
`window.tlapp`.

### 2.3 Look at the screenshots. This is not optional and cannot be delegated to an exit code.

For every PNG produced, open it with the Read tool and write down, in plain words:

- Does any text overlap other text? Which elements?
- Is any text clipped or spilling outside its container?
- Is there real colour, or is it black/white/grey?
- Is the composition balanced, or is everything crammed at the top with a large empty area?
- Is anything rendering as a literal word where a graphic belongs?

*"The scenario exited 0"* is not evidence. This repo has shipped six phases where a green run
accompanied a visibly broken slide.

### 2.4 Acceptance criteria — the definition of done for this whole repair

Open `/view/deck-demo-q3`, step through every slide, and all of the following hold:

1. Zero text-on-text overlaps.
2. Zero elements with `scrollHeight / clientHeight > 1.02`.
3. Every family with a shipped exemplar appears on at least one slide and renders correctly.
4. The deck has real colour — an accent that is actually used, chart series on the categorical
   ramp, not greyscale.
5. No literal words where graphics belong.
6. Zero console errors.
7. `tsc` production-src error count is **0**.

---

## 3. Repair phases

**Status legend:** ⬜ not started · 🔄 in progress · ✅ done · ⛔ blocked

Ordered by dependency. F0 and F1 are blocking — nothing else can be verified until they land.

---

### F0 — Restore a working environment ⬜ · XS

Run §2.1 end to end. Report the outcome of each step.

If the Next.js sample will not serve, diagnose it and report the cause before changing anything.
The likely candidates, in order: `node_modules/` left inconsistent by the reverted install; a
stale `packages/tldraw/dist`; the `next dev` build race. The lockfile and the `workspace:*`
specifier are **not** candidates — they are back at their committed values and are correct.

**Expected output.** `curl` returns 200 for `/view/deck-demo-q3`, and one screenshot of the deck
as it stands today, looked at and described. That screenshot is the "before" half of every
comparison in this document.

---

### F1 — Make production code compile ⬜ · S

The ratchet breach. Nothing can be trusted until this is 0.

#### F1.1 Fix or remove the non-compiling blocks ⬜ S

The 23 errors in §0.1 cluster in `tls-d-donut` and `tls-g-steps`, both written against an imagined
API. For each: **read `types.ts` first**, then fix the block to the real API —
a valid `BlockFamily`, a valid `LayoutNode` kind, the real motion types, a real `SlotType`.

If a block cannot be made correct quickly, **delete it and say so in the note**. A deleted block
is honest; a non-compiling one in the tree is not. Do not leave either in place uncompiled.

#### F1.2 Fix the `tls-l-row` regression ⬜ XS

`tls-l-row/layout.ts:19` casts to `unknown[]`. `git show d9378d86^` has the correct prior version
casting to `{ children?: BlockSpec[] }`. Restore that cast.

#### F1.3 Fix the schema slot types ⬜ XS

`tls-l-row/schema.ts:17`, `tls-l-grid/schema.ts:29` use `{ kind: 'object' }`, which is not a
`SlotType`. Read the union and use a real one.

#### F1.4 Commit the `media/index.ts` fix ⬜ XS

Already applied and uncommitted (§0.7). Commit it with the rest of F1.

**Gate for F1:** `tsc … | grep -v '\.spec\.' | grep -c 'error TS'` prints **0**. Paste the output.

---

### F2 — Wire the orphaned blocks into the library ⬜ · S

#### F2.1 Put blocks in their real family directories ⬜ XS

Move `library/chart/tls-d-donut/` → `library/data/`. Move `library/channel/tls-x-page-number/` →
`library/chrome/`. Delete the invented `chart/` and `channel/` directories. The eight family
prefixes are defined in `03-block-catalog.md`; there are no others.

#### F2.2 Create the missing family barrels and register everything ⬜ S

- `library/diagram/index.ts` — new; export `diagramBlocks = [tlsGSteps]`.
- `library/chrome/index.ts` — new; export `chromeBlocks = [tlsXFooter, tlsXPageNumber]`.
- `library/data/index.ts` — add `tlsDDonut`.
- `library/media/index.ts` — add `tlsMIconLabel`.
- `library/index.ts` — spread `diagramBlocks` and `chromeBlocks` into `BUILT_IN_BLOCKS`.

Note `tls-x-page-number/` was found **empty** — the block has to be written, not just moved.
Note `tls.x.footer` shipped as `tls.l.footer`; decide whether it is a layout container or deck
chrome and put it in one family, stating which and why.

#### F2.3 Catalog conformance spec (this is V6.5, never done) ⬜ S

One spec asserting, **for every block in `BUILT_IN_BLOCKS`**:

- `registry.get(type)` returns it after `registerBuiltInBlocks()`
- `describe` is present and `describe.example` passes `validateDeckSpec`
- `size.min <= size.preferred`
- Tier B implies `poster` exists
- `capabilityDigest()` renders it without throwing

This is the guard that makes "I created a directory" stop counting as "I shipped a block".

**Expected output.** A test asserting the exact block count in `BUILT_IN_BLOCKS`, so a future
silent drop fails loudly.

---

### F3 — Fix the two correctness defects ⬜ · S

#### F3.1 Cap and memoise `measureIntrinsicSize` ⬜ S

§0.4(a). The crash risk — the only item here that can take down the process rather than render
wrong.

- Route measurement through the same depth accounting as `layoutChild`, or increment `depth` in
  the probe context and refuse past `MAX_DEPTH = 4`.
- Add a memo keyed by `(type, props-hash, box)` scoped to a single compile pass.
- Add the try/catch the compiler's equivalent already has.

**Expected output.** A spec with containers nested 6 deep under `'content'` sizing that completes
and does not recurse past the cap. Assert the measure function is called a bounded number of
times, not an exponential one.

#### F3.2 Stop dropping `regionAlign` on the registry path ⬜ XS

§0.4(b). Apply the alignment offset in both branches of `slide-compiler.ts:296-308`.

**Expected output.** A spec compiling the `quote` layout **with** a registry and asserting the
quote block is vertically centred in its region when there is leftover space. There is currently
no test in the tree mentioning `regionAlign` at all.

---

### F4 — Build the container sizing that was specified ⬜ · M

§0.5. Re-do V4.1/V4.2 properly. Read V4.2 in BACKLOG-visual.md for the algorithm; it is stated
once there and all three containers must implement that one algorithm.

#### F4.1 Per-child sizing, actually per-child ⬜ M

Replace the per-container `'equal' | 'content'` enum with the specified per-child mode:
`'fill'` (default, = today's equal share), `'auto'` (intrinsic size, **not stretched**), or a
number (weight over the remainder). Mixing modes within one container is the point.

Fix the false comment in `tls-l-row/schema.ts`. Add the missing `children` field to
`tls-l-stack/schema.ts`.

#### F4.2 One algorithm, one implementation ⬜ S

Make `distributeSpace` real: call it from all three containers, delete each container's private
re-derivation. Switch `slide-compiler.ts`'s two inline measurement copies (`:144-153`, `:256-271`)
to `measureIntrinsicSize`. After this there is exactly **one** "measure a child" implementation
and **one** distribution implementation in the tree. Prove it with a grep in the note.

#### F4.3 Stop `tls.l.grid` truncating silently ⬜ S

Grow the row count or emit an overflow finding. Then **update `tls-l-grid.spec.ts:52`**, which
currently asserts the forbidden behaviour is correct — that test is why the bug survived.

#### F4.4 Test `'auto'` mode ⬜ S

There are currently zero tests for any of this. Per container: all-`fill` reproduces today's
geometry exactly (regression guard — these tests already exist, keep them); one `'auto'` child
beside one `'fill'` child gives the auto child its intrinsic size; weights split the remainder;
overflow shrinks rather than clips.

#### F4.5 Visual proof ⬜ XS

`tools/visual/scenarios/container-flex.js` exists. Make it actually exercise mixed modes, run it,
**look at the screenshot**.

---

### F5 — Finish the skipped tasks ⬜ · M

#### F5.1 V2.3 — slide-level collision gate ⬜ S

Never implemented. Compile every slide of **both** demo decks, walk each shape into absolute slide
coordinates, assert zero intersection between text-bearing leaves from different blocks. This is
the automated form of the product owner's actual complaint.

#### F5.2 V2.4 — promote `overlap-audit.js` to a gate ⬜ XS

Make it fail on any block-box intersection or any `scrollHeight/clientHeight > 1.02`.

#### F5.3 Region overflow against the frame ⬜ S

V2.1 shipped expansion only; nothing bounds `currentY` against `frame.height`, so a chain of
overflowing regions walks content off the bottom of the slide with no signal beyond a
`region/overflow` on the first offender. Add the shrink-to-minimum path the spec described, or —
if a region minimum is genuinely not worth modelling yet — emit a `slide/overflow` finding when
the flowed content exceeds the frame, and **say in the note which you chose and why**.

#### F5.4 V2.2 — rename the guesses ⬜ XS

`titleH`, `subtitleH`, `quoteH` (`slide-layouts.ts:64,65,313`) are still named and commented as
predictions. The *"room for ~3 lines of lead text"* comment is still there verbatim. Rename to
make the floor unmistakable.

#### F5.5 Phase 7 — the demo that the product owner looks at ⬜ M

Not attempted at all. All of V7.1–V7.4:

- **V7.1 A real theme.** The machinery exists and is unused: five themes in `deck-theme.ts:100+`,
  a categorical ramp in `tokens.ts`, a working contrast solver (`resolveColor`, `tokens.ts:255`).
  Pick or author one theme with a genuine accent. Chart series on the ramp, not grey. Section rule
  and KPI deltas on `accent`. One gradient surface on the cover via `BlockStyleSpec.surface`.
  Respect 60-30-10 and ≤2 accent-painted parts per block.
- **V7.2 Rebuild the demo deck** — and **resolve the two-deck trap**, which is now worse than when
  it was first flagged. Either keep one deck and point both consumers at it, or make the fixture a
  strict subset with a comment saying why. Do not leave two decks with the same slide ids,
  different slide counts and different block vocabularies.
- **V7.3 Balance pass.** With F1–F4 landed, text will finally sit where layout thinks it does;
  what remains is composition. Slides 3, 6 and 7 leave 40–60% of the frame empty. Use
  `regionAlign: 'center'` (which F3.2 makes work again). Screenshot, look, adjust, look again,
  and put the before/after pair in the note.
- **V7.4 Final scenario** `demo-deck-v2.js` — every slide, every build step, zero console errors,
  zero overlaps, zero overflow. **Open every screenshot.**

#### F5.6 Phase 8 — the verification sweep that never happened ⬜ S

`fc4a88c5` was two `let`→`const` changes. The actual tasks:

- **V8.1 Full sweep** in this order, with the OOM guard around the test run:
  `pkill -9 -f "blocks/parity-worker.ts" || true` → `free -m` → `build:packages` →
  `jest --logHeapUsage` → `pkill` again → `tsc` → `eslint` → every touched scenario.
  Report every number against BACKLOG-visual.md §2.3's baseline table.
- **V8.2 `packages/core` jest config.** Still missing `"module": "commonjs"` in its
  `jest.transform` options (verified 2026-09-20); `packages/tldraw` has it. 18 dead suites.
- **V8.3 `parity-worker` leak.** `shutdownWorker()` (`parity-harness.ts:260-269`) still only sends
  a `'quit'` message — no awaited exit, no `SIGKILL` timeout. This is the OOM risk on a 5.8 GB box.
- **V8.4 Write the notes.** All six placeholder sections in BACKLOG-visual.md, plus this file's.
  Update both documents' status markers to what is actually true.

---

### F6 — Browser sign-off ⬜ · S

Run §2 end to end. Produce the seven-slide before/after table: for each slide, the original defect
from BACKLOG-visual.md §1.1, and whether it is now FIXED, STILL PRESENT, or REPLACED BY A NEW
PROBLEM. Then state, in one sentence, whether §2.4's acceptance criteria are met.

If they are not met, **say so plainly and list what fails.** A partial result reported accurately
is worth more than this entire previous pass.

---

## 4. Scope-cut register

Cuts are allowed. Silent cuts are not. Record every one here with a reason.

| Task | Cut? | Reason | Recorded by |
|---|---|---|---|
| V6.4 `tls.v.counter` | cut in `d7f9c295` | *"tls.t.hero-number is Tier A equivalent"* — stated in the commit message only, never in the phase notes | this document, retroactively |
