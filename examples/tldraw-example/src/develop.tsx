/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import {
  BUILT_IN_DECK_THEMES,
  Box,
  ColorRole,
  DeckTheme,
  RenderPageToSvgOptions,
  ResolvedColor,
  ResolvedTokens,
  SlideBackground,
  SurfaceContext,
  TDPage,
  Tldraw,
  TldrawApp,
  renderPageToSvg,
  resolveColor,
  resolveTokens,
  surfaceFromBackground,
  useFileSystem,
} from '@tlslides/tldraw'

// Phase 15 — `tools/visual/scenarios/export.js` needs to call the headless renderer from inside
// the page (via Playwright's `page.evaluate`, which can only reach `window`-scoped values), the
// same reason `window.app` exists at all on this dev-only route. Exposed as a plain function, not
// bundled onto `window.app`, since `renderPageToSvg` takes a `TDPage` directly and has nothing to
// do with a mounted editor instance — that's the whole point of it being pure.
//
// P19 — `tools/visual/scenarios/tokens.js` needs the same thing for the design-tokens role-swatch
// matrix: `resolveTokens`/`resolveColor`/`surfaceFromBackground` are pure, DOM-free functions with
// no UI surface yet (P20 is what wires them into an actual renderer), so there is nothing to click
// — the scenario calls them directly, the same way `export.js` calls `renderPageToSvg` directly.
// `BUILT_IN_DECK_THEMES` is exposed too so the scenario doesn't have to hardcode the 5 palettes.
declare const window: Window & {
  app: TldrawApp
  renderPageToSvg: (page: TDPage, opts?: RenderPageToSvgOptions) => string
  BUILT_IN_DECK_THEMES: DeckTheme[]
  resolveTokens: (theme: DeckTheme) => ResolvedTokens
  resolveColor: (
    role: ColorRole | string,
    ctx: SurfaceContext,
    tokens: ResolvedTokens,
    theme?: DeckTheme
  ) => ResolvedColor
  surfaceFromBackground: (
    background: SlideBackground | string | undefined,
    box: Box,
    pageSize: [number, number],
    theme?: DeckTheme
  ) => SurfaceContext
}

export default function Develop(): JSX.Element {
  const rTldrawApp = React.useRef<TldrawApp>()

  const fileSystemEvents = useFileSystem()

  const handleMount = React.useCallback((app: TldrawApp) => {
    window.app = app
    window.renderPageToSvg = renderPageToSvg
    window.BUILT_IN_DECK_THEMES = BUILT_IN_DECK_THEMES
    window.resolveTokens = resolveTokens
    window.resolveColor = resolveColor
    window.surfaceFromBackground = surfaceFromBackground
    rTldrawApp.current = app
    // app.reset()
    // app.createShapes({
    //   id: 'box1',
    //   type: TDShapeType.Rectangle,
    //   point: [200, 200],
    //   size: [200, 200],
    // })
  }, [])

  const handleSignOut = React.useCallback(() => {
    // noop
  }, [])

  const handleSignIn = React.useCallback(() => {
    // noop
  }, [])

  const handlePersist = React.useCallback(() => {
    // noop
  }, [])

  return (
    <div className="tldraw">
      <Tldraw
        id="develop"
        {...fileSystemEvents}
        onMount={handleMount}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onPersist={handlePersist}
        showSponsorLink={false}
      />
    </div>
  )
}
