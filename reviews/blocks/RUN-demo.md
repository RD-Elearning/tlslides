# How to run the demo

From a clean checkout, run these commands:

```bash
# 1. Build the package. `dist` is what the sample app consumes, NOT `src`.
cd packages/tldraw && PATH="$PWD/../../node_modules/.bin:$PWD/node_modules/.bin:$PATH" \
  ./node_modules/.bin/lask

# 2. Run the demo app.
cd examples/nextjs-sample && npx next dev -p 5433
```

## Routes

- `http://localhost:5433/view/deck-demo-q3` — read-only animated viewer, no editor mounted
- `http://localhost:5433/edit/deck-demo-q3` — the same JSON in `<Tldraw>`, with Save
- `http://localhost:5433/api/decks/deck-demo-q3` — the mock API (a route handler reading `examples/nextjs-sample/data/decks/deck-demo-q3.json`; PUT keeps the result in memory)

## Definition of demo done — what to see and verify

The demo proves these four things:

1. **Read-only mode** — Open `/view/deck-demo-q3` in a browser. Press arrow keys or click to advance through 6 slides. The first slide shows a title and some text. The right-arrow reaches a two-column slide with a bar chart on the left and text on the right (the bar's maximum is 70, Q3 is highlighted). Press End to reach the closing slide; it includes a free-positioned block. The slides animate in as build steps on each arrow press. Press Home to return to the start. Close the browser console — there should be no page errors.

2. **Edit mode** — Open `/edit/deck-demo-q3` in a browser. The same 6 slides appear in the editor. Click on a block's text to select and edit it (for example, the title on slide 1). Change the text, then press the **Save** button. The page reloads. The edited text persists — you are viewing the result of `documentToDeckSpec` → PUT → GET → reload.

3. **Round trip** — While in edit mode, drag a block out of its region (for example, drag the title downward, outside the title region box). Press **Save**. The page reloads. Scroll down in the comparison panel on the right and look for the "free" row — the block you dragged now appears in that row with explicit coordinates, no longer in the region it started in.

4. **Export** — This is **not** demonstrated in the running UI. The infrastructure exists (`exportSlidePng` is implemented) but is not wired to a button in the demo. Skip this for now.

## Traps that have cost time

**`dist` must be rebuilt before the sample app sees new package exports.** The sample consumes `packages/tldraw/dist`, not `src`. Running `lask` updates `dist`; without it, the sample sees the old version.

**`turbo run build:packages` and `lask` exit 0 even when the bundle fails.** The tools report "Build succeeded" while emitting no `dist/index.js`. Read the output — a recent bug had esbuild fail with `Could not resolve "child_process"`, leaving only the `.d.ts` files. `examples/nextjs-sample` then failed with an import error that pointed nowhere near the cause.

**`curl` of `/view` or `/edit` returns 200 and proves nothing.** Both routes are client-rendered React. `curl` returns the HTML shell, not the rendered page. Use a real browser to verify anything about what the slides show.

**`$?` after a pipe is the last command's exit code, not the first.** `cmd | tail` followed by `echo $?` prints `tail`'s exit code. Use `${PIPESTATUS[0]}` to check the original command.

## What this demo does not prove

**Only two of the three paths are proven equal.** Q17 measured editor vs viewer across all 6
slides — 109 rows, 0 failing, worst delta 0.7 units — so those two agree. Run it yourself with
`node tools/visual/shoot.js parity-3way` against the dev server.

An earlier note here claimed slide 1's title renders smaller in the editor than in the viewer.
That was read off a screenshot and is **wrong**: the geometry is identical on both paths
(`{x:96, y:498, width:1728, height:52}`). The difference on screen was camera zoom — the editor
fits the slide into the area left over after its toolbars, the viewer fits it to the full window.

**The third path, SVG export, does not render blocks at all**, so "one layout, three renderers"
remains unproven. `renderPageToSvg` on a document straight from `deckSpecToDocument` produces an
empty `<svg>`: `blockToShape` stamps `parentId: "page"` as a literal and only `TldrawApp`'s
load-time `migrate()` repairs it, while `renderPageToSvg` filters on `parentId === page.id`. After
migrating, every block renders as the dashed "Component: …" placeholder, because `ComponentShape`
has no headless renderer unless the caller passes `opts.blocks`.

**Export is not demonstrated.** `exportSlidePng` exists but no UI wires it to a button. The infrastructure is there; the demo does not exercise it.

**The mock API is not a database.** The route handler's PUT stores its result in a module-level Map — it resets on server restart. No persistence, no backup.

**Theme expansion loses the AI's form.** `documentToDeckSpec` expands `theme: "mono-grid"` (the string the AI writes) into a full `DeckTheme` object on the way out. One save costs the deck its theme id, which is the form the LLM is meant to emit. This is valid per the schema (`string | DeckTheme`), but it is a known gap in the round trip.

**No LLM is involved anywhere.** `validateDeckSpec` and `capabilityDigest` exist but nothing calls a model. The pipeline from a prompt to a slide is incomplete.

**Part-level motion is not wired up.** Only the block-level entrance reveal works (the animation that runs on arrow-press). Motion inside a block (`resolvePartMotion`) compiles but does not play.

## Commands to verify the build

```bash
# Test suite
cd packages/tldraw && npx jest --silent 2>&1 | tail -8

# Typecheck (tsc lives in the root node_modules, not packages/tldraw)
cd packages/tldraw && ../../node_modules/.bin/tsc -p tsconfig.json \
  --noEmit --emitDeclarationOnly false 2>&1 | grep -E 'error TS'

# Lint
cd packages/tldraw && npx eslint src/blocks --ext .ts,.tsx
```

The build succeeds when:
- Jest reports all suites passing (or "todo" tests are expected)
- Typecheck returns no errors (or only the pre-existing baseline)
- eslint reports no errors in `src/blocks`
