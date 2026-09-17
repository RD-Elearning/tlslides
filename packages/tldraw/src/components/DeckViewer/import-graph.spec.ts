/**
 * The REAL import-graph assertion for Q14 (`reviews/blocks/BACKLOG-demo.md` §7).
 *
 * The previous attempt at this test read `DeckViewer.tsx` as a string and grepped the literal
 * substring `state/TldrawApp` in its own import lines. That is vacuous: `DeckViewer.tsx` (then
 * still the Phase-14 editor-backed component) imported `'../../Tldraw'`, which does not contain
 * that substring, so the test passed while the component transitively pulled in `TldrawApp`,
 * MobX, and the whole session system.
 *
 * This test instead walks the *real*, resolved, transitive module graph — see
 * `import-graph-walker.ts` for how it handles this repo's no-semicolon style and `import type`
 * erasure, both of which make a naive regex walker wrong here.
 */

import * as path from 'path'
import { walkImportGraph, traceChain } from './import-graph-walker'

const TSCONFIG_PATH = path.resolve(__dirname, '../../../tsconfig.json')
const DECK_VIEWER_ENTRY = path.resolve(__dirname, './DeckViewer.tsx')
const DECK_EMBED_ENTRY = path.resolve(__dirname, './DeckEmbed.tsx')

const FORBIDDEN_PATH_PATTERNS = [
  'state/TldrawApp', // the mobx-backed editor state class itself
  'state/sessions/', // the whole session system (drag/resize/draw/etc. sessions)
  `${path.sep}Tldraw.tsx`, // the mounted-editor component (this repo's actual "components/Tldraw")
  'components/Tldraw', // named literally in Q14's acceptance text, kept as a second, harmless check
]

function relativePaths(paths: Iterable<string>): string[] {
  return [...paths].map((p) => path.relative(process.cwd(), p))
}

function findForbidden(visited: Set<string>): string[] {
  return [...visited].filter((file) => FORBIDDEN_PATH_PATTERNS.some((pattern) => file.includes(pattern)))
}

function findForbiddenExternals(externals: Set<string>): string[] {
  return [...externals].filter((spec) => spec === 'mobx' || spec === 'mobx-react-lite' || spec.startsWith('mobx-react'))
}

describe('DeckViewer import graph (real, transitive)', () => {
  it('walks a non-trivial graph from DeckViewer.tsx (sanity: the walker actually traverses)', () => {
    const result = walkImportGraph(DECK_VIEWER_ENTRY, TSCONFIG_PATH)
    // If this were small (a handful of files), the walker likely isn't following real edges —
    // DeckViewer alone pulls in the block system, the layout engine, and the motion driver.
    expect(result.visited.size).toBeGreaterThan(20)
  })

  it('never reaches state/TldrawApp, state/sessions/, the Tldraw component, or mobx', () => {
    const result = walkImportGraph(DECK_VIEWER_ENTRY, TSCONFIG_PATH)
    const badPaths = findForbidden(result.visited)
    const badExternals = findForbiddenExternals(result.externals)

    if (badPaths.length > 0) {
      const traces = badPaths
        .map((bad) => traceChain(result, DECK_VIEWER_ENTRY, bad).map((f) => path.relative(process.cwd(), f)).join('\n    -> '))
        .join('\n\n')
      throw new Error(`DeckViewer reaches forbidden module(s):\n\n${traces}`)
    }
    expect(badPaths).toEqual([])
    expect(badExternals).toEqual([])
  })

  it('reaches the block system, the motion driver, and the pure presentation module (proves the walker is not just missing everything)', () => {
    const result = walkImportGraph(DECK_VIEWER_ENTRY, TSCONFIG_PATH)
    const visited = relativePaths(result.visited)
    expect(visited.some((f) => f.includes('blocks/deck-document'))).toBe(true)
    expect(visited.some((f) => f.includes('blocks/deck-context'))).toBe(true)
    expect(visited.some((f) => f.includes('blocks/shape-bridge'))).toBe(true)
    expect(visited.some((f) => f.includes('blocks/render-dom'))).toBe(true)
    expect(visited.some((f) => f.includes('blocks/motion/waapi-driver'))).toBe(true)
    expect(visited.some((f) => f.includes('state/deck/presentation'))).toBe(true)
  })

  it('reports the module count and confirms zero forbidden externals reached', () => {
    const result = walkImportGraph(DECK_VIEWER_ENTRY, TSCONFIG_PATH)
    // eslint-disable-next-line no-console
    console.log(
      `[DeckViewer import graph] ${result.visited.size} modules visited, ` +
        `${result.externals.size} distinct external packages reached: ` +
        `${[...result.externals].sort().join(', ')}`
    )
    expect(findForbiddenExternals(result.externals)).toEqual([])
  })

  it('CONTROL CASE: the walker correctly reports DeckEmbed.tsx (the old editor-backed component) DOES reach TldrawApp', () => {
    // This is the test proving the test can fail. `DeckEmbed` (renamed from Phase 14's
    // `DeckViewer`) mounts a real `<Tldraw readOnly>`, which constructs a real `TldrawApp`. A
    // walker that cannot detect this reaching `TldrawApp` cannot be trusted to detect anything.
    const result = walkImportGraph(DECK_EMBED_ENTRY, TSCONFIG_PATH)
    const badPaths = findForbidden(result.visited)
    expect(badPaths.length).toBeGreaterThan(0)
    expect(badPaths.some((f) => f.endsWith(`${path.sep}Tldraw.tsx`))).toBe(true)
  })
})
