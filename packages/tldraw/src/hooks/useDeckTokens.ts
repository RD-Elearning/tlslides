import * as React from 'react'
import { useTldrawApp } from './useTldrawApp'
import { resolveTokens } from '~blocks/tokens'
import { activeDeckTheme } from '~state/shapes/shared/deck-theme'
import type { ResolvedTokens } from '~blocks/types'

/**
 * Derive the deck's resolved design tokens from the live document (`TDDocument.theme` +
 * `TDDocument.tokens`). This replaces the old `DEFAULT_TOKENS` constant that hardcoded a second
 * scale system disagreeing with `scales.ts` (P19).
 *
 * Memoised on `doc.theme` / `doc.tokens` *identity* — `resolveTokens` allocates a fresh object
 * each call, so memoising on the resolved value would defeat the purpose (an unmemoised call
 * re-lays-out every block on every store tick).
 */
export function useDeckTokens(): ResolvedTokens {
  const app = useTldrawApp()
  const doc = app.useStore((s) => s.document)
  return React.useMemo(
    () => resolveTokens(activeDeckTheme(doc.theme), doc.tokens),
    [doc.theme, doc.tokens],
  )
}
