import type { TDPage } from '~types'

// Returns the next available childIndex, one higher than the highest
// childIndex currently in use among the given pages.
export function getNextChildIndex(pages: Record<string, TDPage>): number {
  const topPage = Object.values(pages).sort((a, b) => (b.childIndex || 0) - (a.childIndex || 0))[0]

  return topPage?.childIndex ? topPage.childIndex + 1 : 1
}
