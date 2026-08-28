# 1. Current State Audit

What exists in this repo today, verified by reading source. This is the baseline every other
document builds on.

## 1.1 What you get for free

These are real, working, and expensive to rebuild from scratch. Do not underestimate their
value.

| Capability | Status | Evidence |
|---|---|---|
| Infinite pan/zoom canvas | ✅ | `packages/core/src/hooks/useCameraCss.tsx:39-42` |
| Selection, multi-select, marquee | ✅ | `packages/core/src/components/Brush/` |
| Transform handles (resize, rotate) | ✅ | `packages/core/src/components/Bounds/` |
| Snapping + snap lines | ✅ | `packages/core/src/components/SnapLines/`, `settings.isSnapping` |
| Grid | ✅ | `settings.showGrid`, `app.toggleGrid()` (`TldrawApp.ts:1104`) |
| Grouping / ungrouping | ✅ | `app.group()` `TldrawApp.ts:2903`, `ungroup()` `:2925` |
| Z-order controls | ✅ | `moveToBack/moveBackward/moveForward/moveToFront` `:2768-2795` |
| Align / distribute / stretch | ✅ | `:2704`, `:2714`, `:2724` |
| Lock / hide / aspect-ratio lock | ✅ | `:2844-2872` |
| Undo / redo | ✅ | `StateManager.ts:348, 363` |
| Copy / paste with id remapping | ✅ | `TldrawApp.ts:1805-1877` |
| Keyboard shortcuts | ✅ | `hooks/useKeyboardShortcuts.tsx` |
| Dark mode | ✅ | `settings.isDarkMode`, palettes at `shape-styles.ts:43-71` |
| Multi-page decks ("slides") | ✅ | `components/Deck/Deck.tsx` |
| Present mode (read-only + arrow keys) | ✅ | `TldrawApp.ts:976-991`, `BottomPanel.tsx` |
| Local persistence (IndexedDB) | ✅ | `StateManager.ts:127-137` (idb-keyval) |
| `.tldr` file save/open | ✅ | `state/data/filesystem.ts:27-66` |
| Schema migrations | ✅ | `state/data/migrate.ts:4-132`, version `15.3` |
| Asset upload hook | ✅ | `onAssetCreate`/`onAssetDelete` props |
| Multiplayer (Liveblocks) pattern | ✅ | `apps/www/hooks/useMultiplayerState.ts` |
| Mobile/touch UI work | ✅ | fork commits `e1120038`, `9eb1d82f` |
| Test suite | ✅ | 71 `*.spec.ts(x)` files under `packages/tldraw/src` |

## 1.2 The shape inventory

Ten implemented shape types (`packages/tldraw/src/state/shapes/index.ts:25-36`):

`Rectangle`, `Triangle`, `Ellipse`, `Draw` (freehand), `Arrow`, `Text`, `Group`, `Sticky`,
`Image`, `Video`.

**Notable inconsistency:** `TDShapeType.Line = 'line'` is declared in the enum
(`types.ts:286`) and has a `LineTool` (`state/tools/LineTool/LineTool.ts`), but there is **no
`LineUtil`** in the registry. `LineTool` works around this by creating an *Arrow* with both
decorations set to `undefined` (`LineTool.ts:25-34`). So there is no true line primitive.

**Missing shapes a slide product needs:** star, polygon, rounded-rect as a distinct type,
speech bubble, table, chart, icon, connector with routing, frame/artboard.

## 1.3 The Deck (slide) layer — what the fork actually added

The fork's entire contribution over stock tldraw 1.9 is a thin slide layer. It adds **zero new
data types**.

A slide **is** a tldraw page: `export type TDPage = TLPage<TDShape, TDBinding>`
(`types.ts:144`). The Deck list is just the document's pages sorted by `childIndex`
(`Deck.tsx:20-21`), and the deck buttons call the page commands verbatim — `app.createPage()`,
`app.duplicatePage()`, `app.deletePage()` (`Deck.tsx:26-36`).

The only new persisted state is two booleans: `settings.showDeck` and
`settings.isPresentationMode` (`types.ts:82, 93`). The rename is cosmetic — `createPage` names
new pages `` `Slide ${nextChildIndex}` `` (`state/commands/createPage/createPage.ts:19`).

**Slide operations that exist:** create, duplicate, delete, rename, next, prev, move shapes
between slides.

**Slide operations that do NOT exist:**
- **Reorder.** There is no `movePage`/`reorderPages` command, no drag-and-drop in `Deck.tsx`,
  and `childIndex` is only ever written by `createPage.ts:18`. Reordering slides is impossible
  in both the UI and the API.
- Rename from the Deck (only reachable via the legacy page dropdown,
  `PageOptionsDialog.tsx:66`; `DeckContextMenu` has only Duplicate/Delete).
- Speaker notes, per-slide metadata, transitions, timing.

### Slide thumbnails do not scale

`Deck.tsx:64-73` renders a **live `<ReadOnlyEditor>` per slide** — a full `<Renderer>` from
`@tlslides/core` with real shape components (`ReadOnlyEditor.tsx:73-79`). There is no
rasterization, no cached image, no memoized snapshot, and no virtualization. Every slide in the
deck is a mounted React shape tree that re-renders on store changes.

Worse, `boringPageState` (`Deck.tsx:38-51`) fakes the preview by scaling the page's **live
camera** (`zoom: camera.zoom * 100 / (DECK_WIDTH * 4)`) using the author's last pan position.
The thumbnail therefore shows arbitrary framing, not the slide.

## 1.4 The critical structural gap: no slide frame

**`TDPage` has no width, height, bounds, size, or aspect ratio.** Neither does `TDDocument`
(`types.ts:134-141`). Grepping `frame|artboard|aspectRatio` across `packages/tldraw/src` returns
only `isAspectRatioLocked` on individual *shapes*. There is no Frame shape type.

The "viewport" is purely the DOM element size — `TldrawApp.rendererBounds` is initialized to a
placeholder `[0,0]→[100,100]` and overwritten by the renderer's resize observer
(`TldrawApp.ts:226-229, 883`).

Consequences, all verified:

- **Export size varies per slide.** `exportAllShapesAs` computes size from the content bounding
  box plus 64px padding (`TldrawApp.ts:3608-3619`). Two slides with different content export at
  different resolutions and aspect ratios.
- **Present mode never auto-fits.** `changePage` only swaps `currentPageId`
  (`state/commands/changePage/changePage.ts`); each page keeps whatever camera was left in its
  `TLPageState`.
- **Templates are impossible to define** without a coordinate space.

This is elaborated as backlog item **F-01** in [06-feature-backlog.md](06-feature-backlog.md).

## 1.5 Text is plain strings — no rich text

`TextShape` is `{ text: string }` (`types.ts:378-381`). `StickyShape` is `{ text, size }`
(`:384-388`). Editing is a real `<textarea>` overlay (`TextUtil.tsx:166-195`,
`StickyUtil.tsx:216-235`) — there is no `contentEditable` and no rich-text model anywhere.

This means **no bold, no italic, no underline, no bullet or numbered lists, no inline links, no
mixed font sizes within one text block, no per-character color**. Style applies to the whole
shape only.

Text sizing is also constrained:
- `TextShape` has **no width** — bounds come from DOM measurement with `white-space: pre`
  (`state/shapes/shared/getTextSize.ts:6-70`), so text **does not wrap**. Long AI-generated
  lines run off the slide.
- `StickyShape` does wrap (`whiteSpace: 'pre-wrap'`, `StickyUtil.tsx:340-341`) but has no
  shrink-to-fit — overflowing text is simply clipped.
- Under SSR, `getTextLabelSize` returns a hardcoded `[10, 10]` (`getTextSize.ts:54-57`).

For an AI-generation product this is a first-order problem, covered in
[05-ai-templates-animation.md](05-ai-templates-animation.md).

## 1.6 Export

Declared formats (`types.ts:496-503`): `png`, `jpeg`, `webp`, `pdf`, `svg`, `json`.

| Format | Reality |
|---|---|
| SVG | ✅ client-side, real vector (`TldrawApp.ts:1928-1990`) |
| JSON | ✅ client-side (`copyJson`, `:2021`) |
| PNG / JPG / WEBP | ✅ server-side headless-Chrome screenshot (`apps/www/pages/api/export.ts`) |
| **PDF** | ❌ **offered in the File menu but returns `500 'Not implemented yet.'`** (`apps/www/pages/api/export.ts:41`) — and the handler does not `return`, so it falls through and writes the response twice |
| **PPTX** | ❌ zero references anywhere in the repo |

**Every export path is scoped to `this.currentPageId`.** There is no whole-deck export — no
"export all slides as PDF", no "export deck as N PNGs". For a presentation product this is the
single most important missing output.

Also note `apps/www/utils/export.ts:5-6` hardcodes the production endpoint to
`https://www.tldraw.com/api/export`, and `apps/www/pages/api/export.ts:23-25` points
`FRONTEND_URL` at `https://www.tldraw.com/?exportMode` — stale upstream URLs left over from the
fork. Production export would call tldraw's servers, not yours.

## 1.7 What does not exist at all

Verified by grep; each returned zero relevant hits.

| Capability | Notes |
|---|---|
| **Animation / transitions** | No animation system. The only `easing` code is arrow-curve *geometry* (`arrowHelpers.ts:59`) and freehand smoothing (`drawHelpers.ts:8-13`); the only `transition` is CSS hover/ghosting. |
| **Templates / masters / presets** | Every `template` hit is CSS `gridTemplateColumns`. No template gallery, no starter decks, no reusable element groups, no theme presets. |
| **Embed / iframe / component shape** | No `EmbedUtil`, no `TDShapeType.Embed`. |
| **i18n** | No i18n library, no locale files. All UI strings are hardcoded English (`TopPanel.tsx:47-66`). Relevant if you ship in Vietnamese. |
| **Comments / annotations** | Liveblocks *presence* exists; comment threads do not. |
| **Version history UI** | Undo stack only; no named versions or restore points. |
| **Brand kit** | No stored fonts/colors/logos concept. |
| **Image cropping / masking / filters** | Images render as plain `<img>` (`ImageUtil.tsx:86-92`). |
| **Charts / tables** | No shape types. |
| **Icon / illustration library** | None. |
| **Layers panel** | Z-order *methods* exist; there is no layers UI. |
| **Opacity / gradients / shadows** | See [02-visual-fidelity-and-style-system.md](02-visual-fidelity-and-style-system.md). |
| **Headless render** | No way to rasterize a slide in Node without launching a browser. |
| **PDF / PPTX / Markdown import** | Only `.tldr` (its own JSON) is importable (`filesystem.ts:58, 79`). |

## 1.8 Dependency and runtime risk

| Fact | Evidence | Why it matters |
|---|---|---|
| React 17 peer dependency | `packages/tldraw/package.json` `peerDependencies` | A Next.js 14/15 app runs React 18/19 |
| `zustand@^3.6.9` | `packages/tldraw/package.json:62` | v3 predates `useSyncExternalStore`; known to tear under React 18 concurrent rendering |
| `mobx-react-lite@^3.2.3` | `packages/core/package.json:43` | Same generation of external-store subscription |
| Next 12, pages router | `apps/www/package.json` | Reference app is two major versions behind |
| TypeScript 4.5, Jest 27, Radix `0.1.x` | root `package.json` | 2021-era toolchain throughout |
| No `engines` field | root `package.json` | No Node version pinned |
| Built `dist` ships raw JSX | `packages/tldraw/dist/index.mjs` | Consumers must transpile — see `guides/nextjs-integration.md` |

Good news: no `ReactDOM.render`, `findDOMNode`, or `unstable_batchedUpdates` calls exist in
`packages/*/src`, so there is no *hard* React 18 blocker — the risk is subscription tearing, not
API removal. This still needs a real spike before you build on it. Tracked as **R-01** in
document 6.

## 1.9 Known bugs found during review

These were found incidentally while auditing. None are blockers, but all are real.

> **All fourteen are now fixed** — B-06 in Phase 1, B-14 in Phase 2, B-01/B-03/B-04/B-12/B-13 in
> Phase 3, B-07 in Phase 6, and B-02/B-05/B-08/B-09/B-10 in Phase 7. The table is kept as the
> record of what was found and where.

| ID | Bug | Location |
|---|---|---|
| B-01 | `FontStyle.Serif = 'erif'` — typo, missing leading `s`. The persisted string is literally `"erif"`. | `types.ts:456` |
| B-02 | PDF export returns 500 without `return`, so the response is written twice. | `apps/www/pages/api/export.ts:41` |
| B-03 | `duplicatePage` does not assign a new `childIndex` — a duplicated slide collides with the original and deck sort order becomes unstable. | `state/commands/duplicatePage/duplicatePage.ts:11-27` |
| B-04 | `defaultDocument` gives both `slide1` and `slide2` `childIndex: 1` — same latent collision. | `TldrawApp.ts:3717, 3724` |
| B-05 | `TDShapeType.Line` declared with a tool but no shape util; `LineTool` creates a decoration-less Arrow instead. | `types.ts:286`, `LineTool.ts:25-34` |
| B-06 | Export endpoints hardcoded to `tldraw.com` in production. | `apps/www/utils/export.ts:5-6`, `apps/www/pages/api/export.ts:23-25` |
| B-07 | `readOnly` has two unaware writers: the prop effect (`Tldraw.tsx:210-213`) and `togglePresentationMode` (`TldrawApp.ts:988`). Since `isPresentationMode` is persisted, a reload can restore present mode with `readOnly` reset to `false`. | as cited |
| B-08 | `patchAssets` mutates `this.document.assets` in place with no store update — assets added this way do not render until something else triggers a re-render. | `TldrawApp.ts:3601` |
| B-09 | `examples/tldraw-example/src/api-control.tsx:50` calls `app.patchShapes`, which does not exist anywhere in `packages/`. The example will not compile. | as cited |
| B-10 | `mergeDocument` writes `nextAppState.pages`, but `TDSnapshot['appState']` has no `pages` field — dead code. | `TldrawApp.ts:1236-1240` |
| B-11 | `FontSize` enum is declared but entirely unused; `ShapeStyles` has no `fontSize` field. | `types.ts:440-445` |
| B-12 | `duplicatePage` spreads the whole **page** (shapes, bindings, name) into the new **pageState**, which has none of those fields. | `duplicatePage.ts:52` |
| B-13 | The `version < 14` migration block is a no-op: it writes `shape.style.font === FontStyle.Script`, a comparison, where an assignment was intended. | `migrate.ts:48-54` |
| B-14 | `<Tldraw>` built its `TldrawApp` in a `useState` initializer, so React StrictMode constructed two apps and `onMount` fired for the discarded one too — leaving a host app's ref bound to a detached store. **Fixed in Phase 2.** | `Tldraw.tsx`, `TldrawApp.ts:295` |
