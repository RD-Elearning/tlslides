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
