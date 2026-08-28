# Visual test harness

Headless browser checks for the editor. Jest cannot catch a canvas that renders nothing — the
`dist` bundles ship un-transpiled JSX, so a build can succeed, every suite can pass, and the page
can still die on `Unexpected token '<'`. These scripts load the real thing and screenshot it.

## Prerequisites

Playwright is deliberately **not** a dependency of this repo; adding it would pull a browser
download into a 2021-era dependency tree. `tools/visual/playwright.js` reuses an existing
installation instead. Override the location with `PLAYWRIGHT_PATH` if the default does not exist
on your machine.

## Running

Build and serve the example app, then shoot a scenario:

```bash
cd examples/tldraw-example
COREPACK_ENABLE_STRICT=0 pnpm exec node scripts/build.mjs
(cd dist && python3 -m http.server 5431 &)

cd ../..
node tools/visual/shoot.js shapes
```

Screenshots land in `tools/visual/shots/` (git-ignored). The process exits non-zero if the page
logged an error, so it works as a CI gate.

## Adding a scenario

Drop a file in `tools/visual/scenarios/` exporting `{ route, run(page) }`. `run` receives a
Playwright page with `#canvas` already present and may return a plain object of facts to print
alongside the screenshot path.

## `nextjs` scenario

Exercises `examples/nextjs-sample`, the Next.js 15 / React 19 reference integration of
`@tlslides/tldraw`. Start its dev server, then shoot the scenario against it:

```bash
cd examples/nextjs-sample
COREPACK_ENABLE_STRICT=0 pnpm exec next dev -p 5432

cd ../..
node tools/visual/shoot.js nextjs --base=http://localhost:5432
```

It draws a rectangle by hand, clicks the "Add rectangle" and "Add slide" buttons from the app's
control strip, and reports shape/page counts plus whether `onPersist` wrote a document to
`localStorage` (the app renders `<Tldraw>` with no `id` prop, so `localStorage` is its only
persistence path — see `examples/nextjs-sample/components/Editor.tsx`).

Note: this app ships with `reactStrictMode: false` (see the comment in
`examples/nextjs-sample/next.config.js`) because of a real React 19 dev-mode bug found while
building this scenario — with StrictMode on, `next dev` double-constructs the `TldrawApp`
instance, and an imperative ref captured the normal way can end up pointing at the instance that
is *not* the one rendered to the DOM, silently breaking every button in the control strip. See the
Phase 2 report for the full repro; the bug is in `packages/tldraw`'s mount pattern, not something
this harness or app can fix from the outside.
