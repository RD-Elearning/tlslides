import { useEffect, useRef, useState } from 'react'
import {
  Tldraw,
  Deck,
  DeckEmbed,
  TldrawApp,
  renderPageToSvg,
  renderSvgToPng,
  BUILT_IN_DECK_THEMES,
  DEFAULT_DECK_THEME,
  activeDeckTheme,
  BUILT_IN_TEMPLATES,
  getTemplate,
  stopKeyPropagationUnlessEscape,
} from '@tlslides/tldraw'
import type {
  TDDocument,
  SlideBackground,
  DeckTheme,
  ShapeStyles,
  Template,
  DeckSlide,
} from '@tlslides/tldraw'

// Compile-time-only reachability check for the type-only exports. If any of these stopped
// resolving through plain node_modules resolution (the whole point of this project — see
// tsconfig.json and vite.config.ts, neither of which know this repo's monorepo layout exists),
// `tsc --noEmit` (run by `npm run build`, see package.json) fails here, not silently.
function assertTypesReachable(): {
  doc: TDDocument
  background: SlideBackground
  theme: DeckTheme
  styles: ShapeStyles
  template: Template
  slide: DeckSlide
} {
  throw new Error('type-only helper — never called')
}
void assertTypesReachable

// Every one of these is a value export a real host would reach for outside an editor being
// mounted at all (a template/theme picker page, a Node-side thumbnail worker, a standalone
// slide-manager UI next to a mounted editor). If the build (`import { ... } from
// '@tlslides/tldraw'`) didn't throw and this component renders, every one of them is genuinely
// importable from the published package, not just from this repo's own source tree.
const reachability = {
  Deck: typeof Deck,
  DeckEmbed: typeof DeckEmbed,
  renderPageToSvg: typeof renderPageToSvg,
  renderSvgToPng: typeof renderSvgToPng,
  builtInThemeCount: BUILT_IN_DECK_THEMES.length,
  defaultThemeId: DEFAULT_DECK_THEME.id,
  activeThemeIdWhenUndefined: activeDeckTheme(undefined).id,
  builtInTemplateCount: BUILT_IN_TEMPLATES.length,
  titleTemplateId: getTemplate('title')?.id,
  stopKeyPropagationUnlessEscape: typeof stopKeyPropagationUnlessEscape,
}

export function App() {
  const appRef = useRef<TldrawApp | undefined>(undefined)
  const [status, setStatus] = useState('booting')

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[consumer-smoke] reachability:', reachability)
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Tldraw
        onMount={(app) => {
          appRef.current = app
          setStatus('mounted')
        }}
      />
      {/* A fixed, always-present marker the smoke script's headless check reads via its text
          content and a `data-status` attribute — proof the whole import chain (React mount →
          Tldraw's own TldrawApp construction → onMount firing) actually ran, not just that the
          bundle parsed. */}
      <div
        id="consumer-smoke-status"
        data-status={status}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 9999,
          background: 'white',
          padding: '2px 6px',
          fontFamily: 'monospace',
          fontSize: 12,
        }}
      >
        {status}
      </div>
    </div>
  )
}
