/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { RenderPageToSvgOptions, TDPage, Tldraw, TldrawApp, renderPageToSvg, useFileSystem } from '@tlslides/tldraw'

// Phase 15 — `tools/visual/scenarios/export.js` needs to call the headless renderer from inside
// the page (via Playwright's `page.evaluate`, which can only reach `window`-scoped values), the
// same reason `window.app` exists at all on this dev-only route. Exposed as a plain function, not
// bundled onto `window.app`, since `renderPageToSvg` takes a `TDPage` directly and has nothing to
// do with a mounted editor instance — that's the whole point of it being pure.
declare const window: Window & {
  app: TldrawApp
  renderPageToSvg: (page: TDPage, opts?: RenderPageToSvgOptions) => string
}

export default function Develop(): JSX.Element {
  const rTldrawApp = React.useRef<TldrawApp>()

  const fileSystemEvents = useFileSystem()

  const handleMount = React.useCallback((app: TldrawApp) => {
    window.app = app
    window.renderPageToSvg = renderPageToSvg
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
