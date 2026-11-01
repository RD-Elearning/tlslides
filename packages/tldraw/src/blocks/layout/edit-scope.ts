/**
 * Editor E02 — every inline-editable text leaf carries a `propPath` that is valid in the
 * slide-level block's own props, or none.
 *
 * A leaf gets its path from the block that draws it, relative to *that* block's props. When a
 * block lays out a child (`ctx.layoutChild`), the child's paths are mapped one level out, into the
 * calling block's props:
 *  - the child spec is an object of the parent's props (a container's `children[i]`): exact,
 *    `children.2.props.<path>`;
 *  - the child spec was built by the layout with an explicit `bound(spec, { text: 'title' })`:
 *    exact, through the bind;
 *  - else, by value: the child's value at the path is found in the parent's props — a **unique**
 *    match only. A value found twice (or not at all, or transformed) is ambiguous and the leaf loses
 *    its path: not inline-editable is safe, editing the wrong card is not (README D4).
 * The top call (`layoutBlock` at depth 0) finally drops every path that does not resolve.
 *
 * Pure apart from mutating the freshly laid-out child tree it is handed.
 */
import type { BlockSpec, LayoutNode } from '../types'
import { getAtPath, hasPath, parsePropPath } from '../prop-path'

/* ── the props of the block currently laying out ──────────────────────────────────────────── */

// Layout is synchronous: `layoutBlock` pushes the props it lays out, so while a block runs its
// layout (and calls `ctx.layoutChild`) the top of the stack is that block's props — whatever
// derived context object (`withBox`, a probe) the call went through.
const STACK: Array<Record<string, unknown>> = []

export function withCurrentProps<T>(props: Record<string, unknown>, run: () => T): T {
  STACK.push(props)
  try {
    return run()
  } finally {
    STACK.pop()
  }
}

export function currentProps(): Record<string, unknown> | undefined {
  return STACK[STACK.length - 1]
}

/* ── explicit binds for built children ────────────────────────────────────────────────────── */

const BINDS = new WeakMap<object, Record<string, string>>()

/** A composite states where a built child's props come from: `bound(spec, { text: 'title' })`. */
export function bound<T extends BlockSpec>(spec: T, bind: Record<string, string>): T {
  BINDS.set(spec, bind)
  return spec
}

export function bindOf(spec: BlockSpec): Record<string, string> | undefined {
  return BINDS.get(spec)
}

/* ── search in props ──────────────────────────────────────────────────────────────────────── */

const MAX_DEPTH = 8

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object'
}

/** Paths (dot form) where `target` sits in `obj`, by reference. */
export function findRef(obj: unknown, target: unknown): string[] {
  const out: string[] = []
  const walk = (v: unknown, path: string, depth: number) => {
    if (v === target && path) out.push(path)
    if (!isObj(v) || depth > MAX_DEPTH) return
    for (const [k, c] of Object.entries(v)) if (k !== '$block') walk(c, path ? `${path}.${k}` : k, depth + 1)
  }
  walk(obj, '', 0)
  return out
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (!isObj(a) || !isObj(b)) return false
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

/** Paths where a value equal to `value` sits in `obj` (strings and rich text objects only). */
export function findValue(obj: unknown, value: unknown): string[] {
  const out: string[] = []
  const rich = isObj(value) && Array.isArray((value as { runs?: unknown }).runs)
  if (!(typeof value === 'string' && value.trim() !== '') && !rich) return out
  const walk = (v: unknown, path: string, depth: number) => {
    if (path && sameValue(v, value)) {
      out.push(path)
      return
    }
    if (!isObj(v) || depth > MAX_DEPTH) return
    for (const [k, c] of Object.entries(v)) if (k !== '$block') walk(c, path ? `${path}.${k}` : k, depth + 1)
  }
  walk(obj, '', 0)
  return out
}

/* ── mapping one level out ────────────────────────────────────────────────────────────────── */

/** The child's path `p` expressed in the parent's props, or undefined when it cannot be known. */
export function mapOut(
  spec: BlockSpec,
  childProps: Record<string, unknown>,
  p: string,
  parentProps: Record<string, unknown>
): string | undefined {
  const refs = findRef(parentProps, spec)
  if (refs.length === 1) return `${refs[0]}.props.${p}`
  const bind = bindOf(spec)
  if (bind) {
    const [head, ...tail] = p.split('.')
    const to = bind[head]
    if (to) return tail.length ? `${to}.${tail.join('.')}` : to
  }
  const matches = findValue(parentProps, getAtPath(childProps, p))
  return matches.length === 1 ? matches[0] : undefined
}

function eachText(node: LayoutNode, fn: (leaf: Extract<LayoutNode, { k: 'text' }>) => void): void {
  if (node.k === 'text') fn(node)
  const kids = (node as { children?: LayoutNode[] }).children
  if (Array.isArray(kids)) for (const c of kids) eachText(c, fn)
}

/** The list item a path sits in: the prefix up to its last numeric segment (`items.2.title` → `items.2`). */
export function itemPrefix(path: string): string | undefined {
  const keys = parsePropPath(path)
  for (let i = keys.length - 1; i >= 0; i--) if (typeof keys[i] === 'number') return keys.slice(0, i + 1).join('.')
  return undefined
}

/**
 * Called by `layoutChild` on the child it just laid out: every text leaf's path is mapped from the
 * child's props into the parent's (or dropped). Returns the item path the whole child sits in, when
 * every mapped leaf agrees on one (the wrapper group's `itemPath`).
 */
export function mapChildPaths(
  child: LayoutNode,
  spec: BlockSpec,
  childProps: Record<string, unknown>,
  parentProps: Record<string, unknown> | undefined
): string | undefined {
  if (!parentProps) return undefined
  const refs = findRef(parentProps, spec)
  const items = new Set<string>()
  eachText(child, (leaf) => {
    if (!leaf.propPath) return
    const out = mapOut(spec, childProps, leaf.propPath, parentProps)
    if (out) {
      leaf.propPath = out
      items.add(itemPrefix(out) ?? '')
    } else delete leaf.propPath
  })
  // item paths set by deeper levels follow: exactly through a reference, else from their leaves
  eachGroup(child, (g) => {
    if (!g.itemPath) return
    if (refs.length === 1) g.itemPath = `${refs[0]}.props.${g.itemPath}`
    else {
      const prefixes = new Set<string>()
      eachText(g, (leaf) => prefixes.add(leaf.propPath ? itemPrefix(leaf.propPath) ?? '' : ''))
      const only = prefixes.size === 1 ? [...prefixes][0] : ''
      if (only) g.itemPath = only
      else delete g.itemPath
    }
  })
  // an authored child is an item of its parent's list exactly (`children.2`)
  if (refs.length === 1 && /\.\d+$/.test(refs[0])) return refs[0]
  return items.size === 1 && [...items][0] ? [...items][0] : undefined
}

type GroupNode = Extract<LayoutNode, { k: 'group' }>

function eachGroup(node: LayoutNode, fn: (g: GroupNode) => void): void {
  if (node.k === 'group') fn(node)
  const kids = (node as { children?: LayoutNode[] }).children
  if (Array.isArray(kids)) for (const c of kids) eachGroup(c, fn)
}

/** `layoutBlock` at depth 0: drop every path that does not resolve in the block's own props. */
export function dropUnresolved(node: LayoutNode, props: Record<string, unknown>): void {
  eachText(node, (leaf) => {
    if (leaf.propPath && !hasPath(props, leaf.propPath)) delete leaf.propPath
  })
  eachGroup(node, (g) => {
    if (g.itemPath && !hasPath(props, g.itemPath)) delete g.itemPath
  })
}
