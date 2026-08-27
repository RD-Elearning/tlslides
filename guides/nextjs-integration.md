# Integrating into an existing Next.js app

## The one fact that shapes everything here

`@tlslides/tldraw` and `@tlslides/core` are **not published to npm** (verified — see
`guides/architecture.md`). You cannot `npm install @tlslides/tldraw` into an unrelated project.
You have to build them from this repo's source and bring the output with you. That means the
realistic choices are:

### Option A — Fold this repo into your Next.js app as a workspace (recommended if you'll be
### customizing the editor, which you will — see "Canva-like" section below)

Turn your existing Next.js app into (or add it to) a small monorepo that includes
`packages/core` and `packages/tldraw` as sibling workspace packages:

```
your-app/
  package.json          ← add "workspaces": ["apps/*", "packages/*"] (or a pnpm-workspace.yaml)
  apps/
    web/                 ← your existing Next.js app moves here
  packages/
    core/                ← copied from this repo (packages/core)
    tldraw/               ← copied from this repo (packages/tldraw)
```

Your Next app's `package.json` then depends on `"@tlslides/tldraw": "workspace:*"` and the
package manager links it locally — no publish step, no version drift, and you can edit
`packages/tldraw/src` directly and see changes through the editor's own watch build
(`yarn start:packages` / `pnpm --filter @tlslides/tldraw run start`). This is the only option
that scales if the plan is to keep modifying the editor (new shape types, slide
transitions, etc.) rather than treat it as a frozen dependency.

### Option B — Build once, vendor the tarball (if you just want to consume it as-is)

```bash
# in this repo
yarn build:packages   # or the pnpm equivalent from guides/development.md
cd packages/tldraw && npm pack   # produces tlslides-tldraw-1.9.3.tgz

# in your Next.js app
npm install /path/to/tlslides-tldraw-1.9.3.tgz /path/to/tlslides-core-1.9.1.tgz
```
Simpler, but every future change requires re-packing and re-installing — not a good fit once you
start customizing shapes/UI, which is the actual goal here.

## Wiring `<Tldraw>` into a Next.js page (verified pattern, copied from `apps/www`)

This repo's own `apps/www` is the reference implementation — `apps/www/components/Editor.tsx` +
`apps/www/pages/index.tsx` + `apps/www/next.config.js`. The three things that matter:

**1. `next.config.js` must transpile the package.** The build output in `packages/tldraw/dist`
and `packages/core/dist` ships **un-transpiled JSX** (verified — `dist/index.mjs` literally
contains raw `<TextWrapper>...` JSX syntax). Next's default webpack config does not run
`node_modules` packages through its JS/JSX compiler, so without this step the build fails on the
JSX syntax.

- **Pages router / Next ≤ 12** (what `apps/www` uses):
  ```js
  const withTM = require('next-transpile-modules')(['@tlslides/tldraw', '@tlslides/core'])
  module.exports = withTM({ reactStrictMode: true, /* ...your config */ })
  ```
- **Next 13.1+ (either router)**: use the built-in option instead, no extra package needed:
  ```js
  module.exports = {
    transpilePackages: ['@tlslides/tldraw', '@tlslides/core'],
  }
  ```

**2. The editor must not render on the server.** `<Tldraw>` touches `window`/canvas/DOM APIs at
import time, so it needs `ssr: false`.

- **Pages router:**
  ```tsx
  import dynamic from 'next/dynamic'
  const Editor = dynamic(() => import('../components/Editor'), { ssr: false })
  ```
- **App router:** same `next/dynamic` call works from a Client Component
  (`'use client'` at the top of the file that imports `<Tldraw>`).

**3. Minimal editor component** (trimmed from `apps/www/components/Editor.tsx` — the real one
also wires up file-system persistence, export-to-image, and sign-in handlers you likely don't
need yet):
```tsx
import { Tldraw } from '@tlslides/tldraw'

export default function Editor() {
  return (
    <div className="tldraw" style={{ position: 'fixed', inset: 0 }}>
      <Tldraw id="my-document" autofocus />
    </div>
  )
}
```
`<Tldraw>` needs an explicitly-sized (or `position: fixed`/absolute, full-bleed) ancestor — see
`examples/tldraw-example/src/embedded.tsx` for a non-fullscreen, contained-size example.

No environment variables are required for the editor to render — see `guides/development.md` for
which features (sign-in, multiplayer) need which optional env vars.

## Assessing this repo against "build a Canva-style slide maker"

**What you get for free from this fork:**
- An infinite pan/zoom canvas with real shape tools (rectangle, ellipse, arrow, text,
  freehand/draw, sticky notes, image/video embeds), multi-select, resize/rotate handles,
  grouping, copy/paste, keyboard shortcuts, undo/redo.
- The **Deck** concept this fork specifically added: multiple slides/pages inside one document,
  a bottom-panel slide navigator with thumbnails, duplicate/reorder via a context menu
  (`packages/tldraw/src/components/Deck`, `DeckContextMenu`, `BottomPanel`) — this is the actual
  "slides" part of "tlslides" and the reason this fork exists instead of stock tldraw.
- A read-only render mode (`ReadOnlyEditor`) — a starting point for a "view/present" mode
  distinct from editing.
- PNG export (`apps/www/utils/export.ts`, server-rendered via Puppeteer/`chrome-aws-lambda`) and
  local persistence (`idb-keyval`) plus optional realtime multiplayer (Liveblocks) — all present
  in `apps/www` as reference wiring, not packaged as reusable library code.

**What's genuinely missing for a Canva-like product** (i.e., what you'd be building yourselves on
top of this): a template/theme library, brand kit (fonts/colors/logos), richer typography
controls, slide transitions/animations, a presenter mode, a stock asset/stickers library,
PDF/PPTX export (only PNG export exists today), comments, version history UI, and the actual
product shell — accounts, projects/dashboard, billing. `apps/www` is a demo/marketing site for
the editor, not a SaaS app shell.

**Maintenance risk worth naming explicitly:** this fork sits on a `tldraw@1.9.1` snapshot from
~Nov 2021 (React 17, Next 12, TS 4.5) and was never published anywhere, so there's no upstream to
pull fixes from — you'd own 100% of future maintenance (React 18/19 upgrades, security patches,
browser compat) yourselves. Upstream tldraw has since released a completely different, actively
maintained v2/v3 SDK with official Next.js support and a much larger ecosystem, but it does *not*
have this fork's Deck/slide feature built in.

**Recommendation:** treat `packages/core` + `packages/tldraw` as the canvas engine to vendor via
Option A above and heavily customize — the Deck/slide layer is exactly the differentiator you
want and doesn't exist upstream — but budget real time for the "Canva" product layer (templates,
brand kit, export formats, presenter mode) as net-new work, and go in accepting you're forking a
frozen, unpublished 2021 codebase rather than adopting a maintained library. Worth a quick spike
comparing against building the slide layer on top of *current* tldraw (v2/v3) before committing,
since that trades away the existing Deck feature but buys back a maintained, modern foundation.
