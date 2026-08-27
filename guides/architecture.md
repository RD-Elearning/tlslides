# Architecture

`tlslides` is a fork of [tldraw](https://github.com/tldraw/tldraw) (the pre-v2, ~Nov 2021
snapshot, `1.9.x`) by [@nimeshnayaju](https://github.com/nimeshnayaju), with a **"Deck" /
slide-navigation layer** added on top of tldraw's infinite-canvas editor. The fork history is
short — 7 commits on top of the imported tldraw snapshot (`git log`) — all of them adding the
slide concept: `DeckContextMenu`, `BottomPanel` slide navigation, duplicate/reorder slide,
mobile UI tweaks.

Think of it as: **tldraw's canvas engine + a thin "multiple pages you can present as slides"
feature**, not a from-scratch product.

## Monorepo layout

Managed with **Yarn Classic (1.22.17) workspaces** + **Turborepo** (`turbo.json`) +
**Changesets** for versioning (`.changeset/`). `package.json` pins
`"packageManager": "yarn@1.22.17"`.

```
packages/
  vec/          @tlslides/vec        – 2D vector math helpers
  curve/        @tlslides/curve      – bezier/curve math
  intersect/    @tlslides/intersect  – geometry intersection helpers
  core/         @tlslides/core       – the canvas renderer: Canvas/Page/Shape/Bounds/
                                        Handles/Brush/SnapLines components, pan/zoom/
                                        gesture hooks (mobx-based)
  tldraw/       @tlslides/tldraw     – the actual editor. Exports <Tldraw>. Contains:
                                        - state/ : zustand-based StateManager, shapes,
                                          tools, sessions, commands (undo/redo, etc.)
                                        - components/Deck, DeckContextMenu, BottomPanel,
                                          ToolsPanel, TopPanel — the slide-specific UI
                                          this fork added on top of stock tldraw
apps/
  www/          @tlslides/www        – the tlslides.com Next.js 12 (pages router) site.
                                        Reference implementation for embedding <Tldraw>.
  electron/     @tlslides/electron   – Electron desktop wrapper
  vscode/       editor + extension   – VS Code extension embedding the editor
examples/
  core-example*                      – plain @tlslides/core usage (esbuild, no React app
                                        framework)
  tldraw-example                     – plain @tlslides/tldraw usage (esbuild dev server on
                                        :5420). Good reference for the <Tldraw> API surface:
                                        basic.tsx, embedded.tsx, readonly.tsx, api-control.tsx,
                                        multiplayer/, changing-id.tsx, export.tsx, etc.
```

## Key fact: `@tlslides/*` packages are NOT published to npm

Verified directly: installing the workspace tries to fetch `@tlslides/tldraw` from
`registry.npmjs.org` for any consumer that references it with a plain semver range and gets a
**404**. These packages only exist as source in this repo — there is no public/private registry
publish of the fork. `packages/*/package.json` still carries versions (`@tlslides/tldraw@1.9.3`,
`@tlslides/core@1.9.1`) left over from when *upstream* tldraw published those, but this fork's
own versions were never pushed anywhere.

**Implication:** to use `@tlslides/tldraw` anywhere outside this repo, you must build it from
source here and vendor the output (see `guides/nextjs-integration.md`). You cannot `npm install
@tlslides/tldraw`.

## Editor internals worth knowing before modifying it

- `packages/tldraw/src/state/StateManager` — the central app state container, drives undo/redo,
  persistence (`idb-keyval`), and dispatches to `tools/` and `sessions/` (one class per
  interaction mode: select, draw, erase, etc.) and `commands/` (one function per undoable
  action).
- Shapes are defined in `packages/tldraw/src/state/shapes` (rectangle, ellipse, arrow, text,
  draw/freehand, sticky, group, image, video...). Adding a new shape type means adding a
  `TLShapeUtil` here plus wiring it into the shape registry.
- The **Deck/slide feature** (the thing that differentiates this fork from stock tldraw) lives in
  `packages/tldraw/src/components/Deck`, `DeckContextMenu`, and `BottomPanel`. This is the
  natural extension point for "slide"-oriented product work (reordering, per-slide thumbnails,
  transitions, present mode).
- `packages/tldraw/src/components/ReadOnlyEditor` — a read-only render mode, useful for a
  "viewer"/presentation-only page distinct from the editor.
- Build tool: each package's `build`/`start` script runs a private internal tool called `lask`
  (esbuild + `tsconfig-replace-paths` + dts generation) producing `dist/index.js` (CJS),
  `dist/index.mjs` (ESM), and `dist/index.d.ts`. **The dist output ships un-transpiled JSX** —
  `dist/index.mjs` literally contains `return <TextWrapper>...` — so any downstream bundler
  consuming this package must be configured to parse JSX in `.js`/`.mjs` files from
  `node_modules` (this is exactly why `apps/www/next.config.js` wraps the Next config with
  `next-transpile-modules(['@tlslides/tldraw', '@tlslides/core'])` — see
  `guides/nextjs-integration.md`).

## Dependency vintage (important context, not a criticism)

This is a 2021/2022-era toolchain: React 17, Next 12 (pages router), TypeScript 4.5, Jest 27,
Radix UI `0.1.x`, Webpack 5. There's no `engines` field pinning a Node version. It was built and
last touched against a much older Node (14/16-era). It runs fine on modern Node (verified on
Node 22) but with the install/build friction documented in `guides/development.md`.

Meanwhile, upstream tldraw has moved on to a completely different, actively maintained SDK
(tldraw v2/v3 — React 18/19, official Next.js support, a much larger plugin ecosystem, built-in
multiplayer sync). This fork is frozen at a `tldraw@1.9.1` snapshot and has no relationship to
that newer codebase. Worth weighing before committing to this fork long-term — see the
"Build vs. adopt" note in `guides/nextjs-integration.md`.
