/**
 * A small, self-contained static import-graph walker, built for `import-graph.spec.ts`'s Q14
 * acceptance check ("`<DeckViewer>` has no `TldrawApp`, no MobX, no canvas, no session system
 * anywhere in the transitive import graph — assert this structurally").
 *
 * The previous Q14 attempt's "import-graph assertion" read `DeckViewer.tsx` as a string and
 * grepped for the literal substring `state/TldrawApp` in its own import lines — not the modules it
 * transitively pulls in, and not real anywhere else in the tree. This walker actually resolves and
 * follows every value-carrying `import`/`export ... from` statement, recursively, the way Node's
 * CommonJS `require()` (what Jest + `@swc-node/jest` actually run) would.
 *
 * Two things make a naive regex walker wrong for this repo specifically, and both bit an earlier
 * draft of this file before this comment was written:
 *
 * 1. **This codebase writes no semicolons.** A regex like `/import[^;]*from '...'/` will happily
 *    run past the end of one import statement and swallow real code (or several unrelated
 *    statements) looking for the next `from '...'` if it doesn't stop at a newline-terminated
 *    statement boundary. This walker scans line-by-line instead: it recognizes a statement start
 *    (`import`/`export` at the start of a trimmed line) and accumulates lines only until that
 *    statement's own `from '...'` clause closes, with a small safety cap.
 * 2. **`import type { X } from 'y'` (whole-clause type-only) is erased by the TypeScript/swc
 *    compiler and produces NO runtime `require()` call at all** — regardless of what `y` itself
 *    imports. A walker that treats every `from` clause as a real edge produces false positives:
 *    an early (buggy) version of this walker reported that `blocks/render-dom.tsx` — which has
 *    exactly one import, `import type {...} from './types'` — transitively reached
 *    `state/TldrawApp.ts`, which is impossible for a file with zero runtime imports of its own
 *    module graph beyond `react`. This walker only follows edges from statements that are not
 *    whole-clause type-only (`import type ...` / `export type ...`); a *mixed* named import like
 *    `import { type A, B } from 'x'` still counts as a real edge, because `B` is a genuine runtime
 *    binding and the compiler still emits `require('x')` for it.
 *
 * Alias resolution reads `tsconfig.json`'s own `compilerOptions.paths` (which is also what
 * `jest`'s `moduleNameMapper` mirrors — see `package.json`'s `jest.moduleNameMapper`:
 * `"\\~(.*)": "<rootDir>/src/$1"`) rather than hardcoding `~` → `src/`.
 */

import * as fs from 'fs'
import * as path from 'path'

export interface ImportEdge {
  specifier: string
  /** False for a statement that is entirely `import type .../export type ...` — erased at
   *  compile time, so it never becomes a real `require()` call. */
  isValueEdge: boolean
}

export interface WalkResult {
  /** Every source file reached, including the entry point, as resolved absolute paths. */
  visited: Set<string>
  /** Every bare (non-relative, non-aliased) specifier reached via a value edge — e.g. `react`,
   *  `mobx`, `@tlslides/core`. Not resolved to files (that would mean walking into
   *  `node_modules`), just recorded by name. */
  externals: Set<string>
  /** `resolvedFile -> the file that imported it` — first writer wins — for tracing why a given
   *  file was reached. */
  parent: Map<string, string>
}

/** Read `tsconfig.json`'s `compilerOptions.paths` and return `{ aliasPrefix: targetDir }` pairs,
 *  e.g. `{ '~': '<pkg>/src' }` for this package's `"~*": ["./src/*"]`. Generic over however many
 *  wildcard path entries a tsconfig declares — nothing here is specific to `~`. */
export function readPathAliases(tsconfigPath: string): Array<{ prefix: string; target: string }> {
  const raw = fs.readFileSync(tsconfigPath, 'utf-8')
  const config = JSON.parse(raw) as {
    compilerOptions?: { baseUrl?: string; paths?: Record<string, string[]> }
  }
  const baseUrl = config.compilerOptions?.baseUrl ?? '.'
  const paths = config.compilerOptions?.paths ?? {}
  const tsconfigDir = path.dirname(tsconfigPath)
  const baseDir = path.resolve(tsconfigDir, baseUrl)

  const aliases: Array<{ prefix: string; target: string }> = []
  for (const [key, values] of Object.entries(paths)) {
    if (!key.endsWith('*') || values.length === 0) continue
    const prefix = key.slice(0, -1) // '~*' -> '~'
    const value = values[0]
    const target = path.resolve(baseDir, value.endsWith('*') ? value.slice(0, -1) : value)
    aliases.push({ prefix, target })
  }
  // Longest prefix first, so a more specific alias (if two ever overlapped) wins.
  aliases.sort((a, b) => b.prefix.length - a.prefix.length)
  return aliases
}

function resolveAsFile(base: string): string | null {
  const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate
  }
  return null
}

function resolveSpecifier(
  spec: string,
  fromFile: string,
  aliases: Array<{ prefix: string; target: string }>
): string | null {
  if (spec.startsWith('.')) {
    return resolveAsFile(path.resolve(path.dirname(fromFile), spec))
  }
  for (const { prefix, target } of aliases) {
    if (spec === prefix || spec.startsWith(prefix)) {
      const rest = spec.slice(prefix.length)
      return resolveAsFile(path.join(target, rest))
    }
  }
  return null // bare package specifier — not our file tree
}

// Only lines that COULD plausibly be an `import ... from` or a re-export (`export * from` /
// `export { ... } from` / `export type { ... } from`) start a statement scan. Deliberately
// excludes `export function` / `export const` / `export interface` / `export class` / `export
// enum` / `export default function` — an ordinary declaration export never has a `from` clause,
// and treating it as one made an earlier version of this walker scan forward through unrelated
// code (and even a comment containing the literal text `from "this is the answer"` in
// `color-math.ts`) looking for a `from` clause that was never coming.
const IMPORT_STATEMENT_RE = /^import\b/
const EXPORT_FROM_STATEMENT_RE = /^export\s*(\*|\{|type\s*(\*|\{))/
const FROM_CLAUSE_RE = /from\s*(['"])((?:(?!\1).)+)\1/
const BARE_IMPORT_RE = /^import\s*(['"])((?:(?!\1).)+)\1/
const TYPE_ONLY_CLAUSE_RE = /^(import|export)\s+type\b/
// Safety cap on how many lines a single import/export statement may span before we give up on
// finding its `from` clause — generously above anything a real import statement in this repo uses.
const MAX_STATEMENT_LINES = 60

/** Extract every `import`/`export ... from '...'` edge (plus bare `import '...'`) from one file's
 *  source, tagging each with whether it is a real (value) edge or a whole-clause type-only one. */
export function extractEdges(content: string): ImportEdge[] {
  const lines = content.split('\n')
  const edges: ImportEdge[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!IMPORT_STATEMENT_RE.test(line) && !EXPORT_FROM_STATEMENT_RE.test(line)) continue

    const bareMatch = line.match(BARE_IMPORT_RE)
    if (bareMatch) {
      edges.push({ specifier: bareMatch[2], isValueEdge: true })
      continue
    }

    let buf = lines[i]
    let found = FROM_CLAUSE_RE.exec(buf)
    let j = i
    while (!found && j - i < MAX_STATEMENT_LINES && j + 1 < lines.length) {
      j++
      buf += `\n${lines[j]}`
      found = FROM_CLAUSE_RE.exec(buf)
    }

    if (found) {
      const isTypeOnly = TYPE_ONLY_CLAUSE_RE.test(buf)
      edges.push({ specifier: found[2], isValueEdge: !isTypeOnly })
      i = j
    }
  }

  return edges
}

/**
 * Walk the real, value-edge-only import graph starting from `entryFile`. `tsconfigPath` supplies
 * the `~*` (or whatever a given repo uses) alias mapping.
 */
export function walkImportGraph(entryFile: string, tsconfigPath: string): WalkResult {
  const aliases = readPathAliases(tsconfigPath)
  const visited = new Set<string>()
  const externals = new Set<string>()
  const parent = new Map<string, string>()
  const queue: string[] = [path.resolve(entryFile)]

  while (queue.length > 0) {
    const file = queue.shift() as string
    if (visited.has(file)) continue
    visited.add(file)

    let content: string
    try {
      content = fs.readFileSync(file, 'utf-8')
    } catch {
      continue
    }

    for (const { specifier, isValueEdge } of extractEdges(content)) {
      if (!isValueEdge) continue
      if (specifier.startsWith('.') || aliases.some((a) => specifier.startsWith(a.prefix))) {
        const resolved = resolveSpecifier(specifier, file, aliases)
        if (resolved) {
          if (!visited.has(resolved) && !parent.has(resolved)) parent.set(resolved, file)
          if (!visited.has(resolved)) queue.push(resolved)
        }
        // An unresolved relative/aliased specifier is a real problem in the source tree, but not
        // this test's concern — it would already fail typecheck/build elsewhere.
      } else {
        externals.add(specifier)
      }
    }
  }

  return { visited, externals, parent }
}

/** Reconstruct the file chain from `entryFile` to `targetFile`, for a readable failure message. */
export function traceChain(result: WalkResult, entryFile: string, targetFile: string): string[] {
  const chain: string[] = [targetFile]
  let cur = targetFile
  while (result.parent.has(cur) && cur !== path.resolve(entryFile)) {
    cur = result.parent.get(cur) as string
    chain.push(cur)
  }
  return chain.reverse()
}
