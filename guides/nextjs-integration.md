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

## Driving slides from the host: `app.deck.*` (Phase 14)

The minimal example above only mounts the editor. A real host app — a "my presentations"
dashboard, a slide-manager sidebar, a save-to-your-own-backend flow — drives slide management
imperatively, and **`app.deck` is the only surface built for that.** Don't reach into `TldrawApp`
directly for page/slide operations (`createPage`, `movePage`, `setPageBackground`, ...) from host
code — those exist so `app.deck` can be implemented as a thin wrapper over them, not so a host has
two ways to do the same thing. `guides/documentation.md` has the full method-by-method reference;
this section is the walkthrough. The reference implementation is
`examples/nextjs-sample/components/Editor.tsx` + `SlideManager.tsx` — copy-pasteable, and exercised
end to end by `tools/visual/scenarios/deckapi.js`.

### 1. Get the `app` reference, the same way as before

```tsx
'use client'
import * as React from 'react'
import { Tldraw, TldrawApp } from '@tlslides/tldraw'
import type { TDDocument } from '@tlslides/tldraw'

export default function Editor({ initialDocument }: { initialDocument: TDDocument }) {
  const appRef = React.useRef<TldrawApp | null>(null)

  const onMount = React.useCallback((app: TldrawApp) => {
    appRef.current = app
    app.deck.loadDeck(initialDocument) // not app.loadDocument — see below
  }, [initialDocument])

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <Tldraw onMount={onMount} />
    </div>
  )
}
```

`app.deck.loadDeck(document)` is preferred over `app.loadDocument(document)` for one concrete
reason: it's the call that resets the event-stream baseline described below, so the *next* real
change is reported correctly. (`app.loadDocument` still works underneath — `loadDeck` just calls
it — so nothing breaks if some other code path calls it directly, e.g. the editor's own
IndexedDB-restore-on-mount; that path is resynced too, from the `TldrawApp` side, precisely so
this isn't a trap for a host that forgets to use `loadDeck`.)

### 2. Slide CRUD — list, add, duplicate, delete, reorder

```tsx
const id = app.deck.addSlide({ name: 'New slide' }) // -> new slide id, and switches to it
app.deck.addSlideFromTemplate('bullets', { title: 'Q3 Review' }) // starter-pack layout, filled in
app.deck.duplicateSlide(id)
app.deck.moveSlide(id, 0) // move to the front
app.deck.deleteSlide(id)
app.deck.listSlides() // DeckSlide[], in current order — the read side of all of the above
```

Every one of these returns the id/state it produced (never `void`), so you can chain without a
follow-up `listSlides()` call. `addSlide`/`duplicateSlide`/`addSlideFromTemplate` all accept an
optional `id` in their options — mint your own (e.g. your database's primary key for a new slide
row) instead of taking the generated one:

```tsx
const dbRow = await createSlideRow() // your own backend, returns { id: 'row_123', ... }
app.deck.addSlide({ id: dbRow.id, name: dbRow.title })
```

A colliding id throws, rather than silently overwriting a different slide — uniqueness within the
deck is the caller's responsibility, the same as any other primary key.

### 3. Adding content — your own React components, or raw shape data

Rendering a host's own React component as a slide element is this fork's headline capability
(Phase 5's `ComponentShape` + `components` registry). `app.deck.addBlock` is how a host reaches it
without touching anything below the facade:

```tsx
app.deck.addBlock(
  slideId,
  { componentId: 'kpi-tile', props: { label: 'Monthly active users', value: '128.4K' } },
  { point: [80, 120], size: [260, 160] }
)
```

`componentId` must match an entry in the `components` registry passed to `<Tldraw components=
{...}>` (see the F-02/custom-component-blocks material this repo already has) — an unregistered
id renders a placeholder instead of crashing, so a document can outlive a smaller registry.

For anything that isn't a single component block — a host's own full shape JSON, a paste, a
future AI-generated slide — `app.deck.insertContent` is the general escape hatch `addBlock` itself
is built on:

```tsx
const insertedIds = app.deck.insertContent(
  slideId,
  { shapes: myShapeArray }, // TDInsertableContent — shapes[, bindings, assets]
  { center: false } // keep each shape's own authored coordinates
)
```

Both matter for the same reason a hidden slide matters: **`slideId` never has to be the slide
currently open in the editor, and calling either never switches to it or moves the viewport** —
content lands on the requested slide even if the user is looking at a different one. Two things
that are *not* true of the page-level methods above, though:
- **Neither takes a caller-supplied shape id.** The underlying command always mints a fresh id for
  collision safety (the same reason pasting the same content twice never collides). `insertContent`
  returns every id it actually assigned (`string[]`); `addBlock` returns the one it created.
- **`opts.center` defaults to `true`, and that default only makes sense for the slide currently
  open.** It centers against *that slide's own stored camera* — pass `center: false` (what
  `addBlock` always does internally) with explicit coordinates when targeting a slide the user
  isn't looking at.

### 4. Keeping a host panel in sync — events, not polling

A slide-manager sidebar needs to know when the deck changes underneath it. Don't poll
`app.document` from `onPersist`; subscribe to the typed event stream instead, and unsubscribe on
unmount:

```tsx
React.useEffect(() => {
  const app = appRef.current
  if (!app) return
  const refresh = () => setSlides(app.deck.listSlides())
  const offAdded = app.deck.on('slideAdded', refresh)
  const offRemoved = app.deck.on('slideRemoved', refresh)
  const offReordered = app.deck.on('slideReordered', refresh)
  const offChanged = app.deck.onDeckChange(refresh) // catches background/notes/theme updates too
  refresh()
  return () => {
    offAdded()
    offRemoved()
    offReordered()
    offChanged()
  }
}, [])
```

`selectionChanged` (slide/shape selection) is the other event, useful for highlighting whichever
slide is currently open in your sidebar.

### 5. Backgrounds, theme, and templates

```tsx
app.deck.setSlideBackground(id, { type: 'solid', color: '#0f172a' })
app.deck.setTheme(app.deck.listThemes().find((t) => t.id === 'mono-grid'))
app.deck.listTemplates() // built-in layout pack, for a template picker
```

`listThemes()`/`listTemplates()` return the built-in palettes/layouts (also exported directly as
`BUILT_IN_DECK_THEMES`/`BUILT_IN_TEMPLATES`, for a picker rendered before an editor even mounts) —
`setTheme`/`addSlideFromTemplate` happily accept your own `DeckTheme`/`Template` object instead.

### 6. Thumbnails — now for any slide, in a browser or on the server (Phase 15)

```tsx
const dataUrl = app.deck.getThumbnail(secondSlideId) // any slide, not just app.currentPageId
```

`getThumbnail` is routed through `renderPageToSvg` — a pure function of the document, no mounted
editor, no `document`/`window` required — so it works for every slide in the deck, from a browser
or from Node, without switching the user's own view. A slide grid showing all N slides is just:

```tsx
{app.deck.listSlides().map((slide) => (
  <img key={slide.id} src={app.deck.getThumbnail(slide.id)} alt={slide.name} />
))}
```

See section 9 below for generating the same thumbnails **server-side**, with no `<Tldraw>`
mounted at all.

### 7. A read-only view: `<DeckViewer>`

For a page that only displays a deck (a share link, a "preview" pane) rather than editing it:

```tsx
import { DeckViewer } from '@tlslides/tldraw'

<DeckViewer document={deck} slideId={currentSlideId} style={{ height: 480 }} />
```

It's a real, self-contained `<Tldraw readOnly showUI={false}>` instance — not the internal
`ReadOnlyEditor` component, which requires an already-mounted editor's own context (see
`guides/documentation.md`'s `DeckViewer` section for why).

### 8. Free-typed fields in your own UI need `stopKeyPropagationUnlessEscape`

If your slide-manager panel has any text input (rename, a hex colour box, ...), wire this up on
`onKeyDown`/`onKeyUp`:

```tsx
import { stopKeyPropagationUnlessEscape } from '@tlslides/tldraw'

<input onKeyDown={stopKeyPropagationUnlessEscape} onKeyUp={stopKeyPropagationUnlessEscape} ... />
```

Without it, pressing Tab in that field — even though it's outside the editor's own React tree —
bubbles up to the editor's global keyboard shortcut listener and clones whatever shape is
currently selected on the canvas. `examples/nextjs-sample/components/SlideManager.tsx`'s hex
colour field is a working example, and `tools/visual/scenarios/deckapi.js` asserts the shape count
doesn't change after pressing Tab in it.

### 9. Server-side thumbnails and PDF export (Phase 15)

`renderPageToSvg` (`@tlslides/tldraw`'s package root) is a pure function of a `TDPage` — no React,
no DOM, no mounted editor — so it runs in a Next.js API route / server action exactly as well as
in the browser. This is what actually unblocks "generate a thumbnail without paying for a mounted
canvas per slide," e.g. a Next.js Route Handler that thumbnails every slide of a stored deck:

```ts
// app/api/decks/[id]/thumbnails/route.ts
import { renderPageToSvg } from '@tlslides/tldraw'
import { loadDeckDocument } from '@/lib/decks' // however you persist a TDDocument

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const doc = await loadDeckDocument(params.id) // a plain TDDocument, from your DB/store
  const thumbnails = Object.values(doc.pages)
    .sort((a, b) => (a.childIndex ?? 0) - (b.childIndex ?? 0))
    .map((page) => ({
      id: page.id,
      svg: renderPageToSvg(page, {
        assets: doc.assets,
        theme: doc.theme,
        defaultPageSize: doc.defaultPageSize,
      }),
    }))
  return Response.json({ thumbnails })
}
```

No `<Tldraw>`, no `jsdom`, no headless browser — just the document you already have. Send the raw
`<svg>` strings straight to the client (an `<img src="data:image/svg+xml;base64,...">`, or inline
them directly) and let the browser do the rasterizing, exactly like `Deck.getThumbnail` does
client-side.

**What this cannot do, and why:** two things are honest limitations, not oversights — see
`renderPageToSvg`'s own doc comment (`packages/tldraw/src/state/render/renderPageToSvg.ts`) for
the full reasoning:
- **Text layout is an approximation**, not a measurement — there is no headless DOM to measure
  glyph widths against, so a label's centering or a bare text shape's own size is a hand-tuned
  average-character-width heuristic. Good enough for a thumbnail; don't rely on it for pixel-exact
  positioning.
- **A `ComponentShape` block and a `VideoShape`'s live frame both render as an honest placeholder**
  (a labelled dashed box; a neutral grey rect), never a fabricated image of your actual React
  component or a captured video frame — neither can be serialized to static SVG from a server that
  never mounted your component tree.

**PNG is browser-only, deliberately.** `renderSvgToPng` (also exported from the package root)
rasterizes via `<canvas>`, which doesn't exist in Node. Rather than pull in a native-binding
dependency (`sharp`, the `canvas` npm package) or a full headless browser (`puppeteer`,
`playwright`) just to cover a server-side PNG need this package can't predict, that decision is
left to you — `renderPageToSvg`'s output is a plain, complete SVG string, so any of the following
work against it unchanged:

```ts
// Option A — sharp (native binding, fast, no browser)
import sharp from 'sharp'
const png = await sharp(Buffer.from(svg)).png().toBuffer()

// Option B — a headless browser you already run for other reasons (Puppeteer/Playwright)
const page = await browser.newPage()
await page.setContent(`<!doctype html><body style="margin:0">${svg}</body>`)
await page.setViewportSize({ width, height })
const png = await page.screenshot({ type: 'png' })
```

**PDF is not implemented in this package, and here's exactly what it would need.** The roadmap
called PDF "the most-requested export... straightforward once headless SVG exists" — headless SVG
existing was necessary but turned out not to be sufficient on its own: producing a real PDF still
needs either (a) a vector SVG→PDF converter (nothing lightweight and dependency-free does this
well — `svg2pdf.js` exists but pulls in `jsPDF` and expects a `DOMParser`/canvas for text
measurement, i.e. it wants a browser-like environment anyway), or (b) rasterizing each slide to
PNG first (using one of the two options above) and assembling a PDF of full-page images with a
small, pure-JS, dependency-light library like `pdf-lib` (no native bindings, works in Node and the
browser). Concretely, a whole-deck PDF is:

```ts
import { PDFDocument } from 'pdf-lib' // add this yourself — not a dependency of @tlslides/tldraw
import { renderPageToSvg } from '@tlslides/tldraw'

async function exportDeckPdf(doc: TDDocument, rasterize: (svg: string, w: number, h: number) => Promise<Uint8Array>) {
  const pdf = await PDFDocument.create()
  for (const page of Object.values(doc.pages)) {
    const [w, h] = page.size ?? doc.defaultPageSize ?? [1920, 1080]
    const svg = renderPageToSvg(page, { assets: doc.assets, theme: doc.theme })
    const pngBytes = await rasterize(svg, w, h) // your sharp/Puppeteer call from above
    const pdfPage = pdf.addPage([w, h])
    const image = await pdf.embedPng(pngBytes)
    pdfPage.drawImage(image, { x: 0, y: 0, width: w, height: h })
  }
  return pdf.save()
}
```

This is deliberately left as a recipe, not a shipped `Deck.exportPdf()` method: which rasterizer
you already have (or want) in your deployment is exactly the kind of "prefer something that works
in both browser and Node, and don't force a heavyweight dependency on a caller who doesn't need
it" decision this package can't make on your behalf.

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
top of this): richer typography controls, slide transitions/animations, a presenter mode, a stock
asset/stickers library, PPTX export, comments, version history UI, and the actual product shell —
accounts, projects/dashboard, billing. (A template/theme library and headless SVG/PNG export do
now exist, per Phases 12/13/15 — see section 9 above for what's still a recipe, not a shipped
method: whole-deck PDF.) `apps/www` is a demo/marketing site for the editor, not a SaaS app shell.

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
