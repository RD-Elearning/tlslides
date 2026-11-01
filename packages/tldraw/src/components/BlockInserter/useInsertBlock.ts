/**
 * B7 — `useInsertBlock` hook.
 *
 * Encapsulates the "insert a block from the gallery" logic so that click and
 * drag-and-drop share one code path. Produces a deep-cloned `BlockSpec` from the
 * block definition's `describe.example` (falling back to `defaults`), regenerates
 * all nested ids, strips the instance `style` (so the block lands on the deck's
 * theme colours), then converts it to a `ComponentShape` via `blockToShape` and
 * inserts it through the app.
 */

import * as React from 'react'
import { useTldrawApp, useBlockRegistry } from '~hooks'
import { insertBlockShape, type InsertResult } from '~state/block-edit/insert'

export { buildInsertSpec, insertBlockShape, type InsertResult } from '~state/block-edit/insert'

export function useInsertBlock() {
  const app = useTldrawApp()
  const blockRegistry = useBlockRegistry()

  return React.useCallback(
    (type: string, point?: [number, number]): InsertResult | null => {
      const def = blockRegistry?.get(type)
      if (!def) return null
      return insertBlockShape(app, def, { point })
    },
    [app, blockRegistry],
  )
}

