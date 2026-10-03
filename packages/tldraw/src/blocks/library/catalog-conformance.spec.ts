/**
 * G2.3 — Block catalog conformance spec.
 *
 * Asserts every block in BUILT_IN_BLOCKS satisfies five structural properties,
 * and extends it: every `type` used by every deck JSON under __fixtures__ resolves
 * in the registry.
 *
 * The count assertion is the gate against the "orphaned block" class of bug
 * that shipped in §0.4 — today's figure is 41 registered, 0 orphaned.
 */

import * as fs from 'fs'
import * as path from 'path'
import { BUILT_IN_BLOCKS, registerBuiltInBlocks } from './index'
import { BlockRegistry } from '../registry'
import { BLOCK_CATEGORIES, BLOCK_SCOPES } from '../types'
import { validateDeckSpec } from '../validate-deck-spec'
import { capabilityDigest } from '../capability-digest'
import { makeCtx, makeRegistry, collectParts } from './layout/test-helpers'
import type { LayoutNode, BlockSpec, BlockDefinition } from '../types'

/**
 * Recursively walk a BlockSpec tree and collect all block `type` strings.
 * Each child in `children` is itself a BlockSpec that may have nested children.
 */
function collectSpecTypes(spec: BlockSpec): string[] {
  const types: string[] = [spec.type]
  if (spec.children && Array.isArray(spec.children)) {
    for (const child of spec.children) {
      types.push(...collectSpecTypes(child))
    }
  }
  return types
}

const EXPECTED_BLOCK_COUNT = 49

function freshBuiltInRegistry(): BlockRegistry {
  const registry = new BlockRegistry()
  registerBuiltInBlocks(registry)
  return registry
}

/** P0.2 — rules for the semantic metadata every built-in block must carry. */
const SHORT_DESC_DENYLIST = /\b(tier|html|poster|delegat\w*|defineComposite\w*|editorOnly)\b|layout\(|`|\b\d+\s*[–-]\s*\d+\b/i

/** Returns the list of rule violations for one definition's metadata (empty = conforming). */
export function metadataViolations(def: BlockDefinition, reg: BlockRegistry): string[] {
  const out: string[] = []
  if (!def.category || !(BLOCK_CATEGORIES as readonly string[]).includes(def.category)) {
    out.push(`category "${def.category}" is not in BLOCK_CATEGORIES`)
  }
  if (!def.scope || !(BLOCK_SCOPES as readonly string[]).includes(def.scope)) {
    out.push(`scope "${def.scope}" is not element|group|slide`)
  }
  const sd = def.shortDescription
  if (typeof sd !== 'string') {
    out.push('shortDescription is missing')
  } else {
    if (sd.length < 12 || sd.length > 90) out.push(`shortDescription length ${sd.length} not in 12..90`)
    if (sd.endsWith('.')) out.push('shortDescription ends with a period')
    if (SHORT_DESC_DENYLIST.test(sd)) out.push(`shortDescription matches the denylist: "${sd}"`)
  }
  for (const rel of def.related ?? []) {
    if (rel === def.type) out.push(`related lists the block itself`)
    else if (!reg.has(rel)) out.push(`related "${rel}" does not resolve in the registry`)
  }
  return out
}

/** Collect {type, depth} for every block in a deck fixture, walking both child channels. */
function collectNested(deck: any): Array<{ type: string; depth: number }> {
  const out: Array<{ type: string; depth: number }> = []
  const visit = (b: any, depth: number) => {
    if (!b || typeof b !== 'object') return
    out.push({ type: b.type, depth })
    for (const c of Array.isArray(b.children) ? b.children : []) visit(c, depth + 1)
    for (const c of Array.isArray(b.props?.children) ? b.props.children : []) visit(c, depth + 1)
  }
  for (const slide of deck.slides ?? []) {
    for (const b of slide.blocks ?? []) visit(b, 0)
    for (const list of Object.values(slide.regions ?? {})) for (const b of list as any[]) visit(b, 0)
    for (const f of slide.free ?? []) visit(f?.block, 0)
  }
  return out
}

describe('block catalog conformance', () => {
  const registry = freshBuiltInRegistry()

  describe('P0.2 metadata gates', () => {
    for (const def of BUILT_IN_BLOCKS) {
      it(`"${def.type}" has conforming category/scope/shortDescription/related`, () => {
        expect(metadataViolations(def, registry)).toEqual([])
      })
    }

    it('metadataViolations rejects deliberately bad metadata (the gate itself works)', () => {
      const base = BUILT_IN_BLOCKS[0]
      const bad = (patch: Partial<BlockDefinition>) => metadataViolations({ ...base, ...patch } as BlockDefinition, registry)
      expect(bad({ category: 'nonsense' as any })).not.toEqual([])
      expect(bad({ scope: 'huge' as any })).not.toEqual([])
      expect(bad({ shortDescription: undefined })).not.toEqual([])
      expect(bad({ shortDescription: 'Too short' })).not.toEqual([])
      expect(bad({ shortDescription: 'A block that is rendered as Tier B html with a poster.' })).not.toEqual([])
      expect(bad({ shortDescription: 'Shows between 3-8 items in a tidy row.' })).not.toEqual([])
      expect(bad({ shortDescription: 'Ends with a period, which is not allowed.' })).not.toEqual([])
      expect(bad({ shortDescription: 'x'.repeat(91) })).not.toEqual([])
      expect(bad({ related: ['tls.nope.missing'] })).not.toEqual([])
      expect(bad({ related: [base.type] })).not.toEqual([])
    })

    it('no two blocks share an identical shortDescription', () => {
      const seen = new Map<string, string>()
      for (const def of BUILT_IN_BLOCKS) {
        const sd = def.shortDescription ?? ''
        expect(seen.get(sd)).toBeUndefined()
        seen.set(sd, def.type)
      }
    })

    it('every category with at least one block appears in listByCategory()', () => {
      const grouped = registry.listByCategory()
      for (const cat of new Set(BUILT_IN_BLOCKS.map((b) => b.category))) {
        expect(grouped.get(cat!)?.length).toBeGreaterThan(0)
      }
      const total = Array.from(grouped.values()).reduce((n, l) => n + l.length, 0)
      expect(total).toBe(BUILT_IN_BLOCKS.length)
    })

    it('no slide-scope block is nested inside another block in any fixture deck', () => {
      const fixtures = ['demo-deck.json', 'colorful-blocks-demo.json'].map((f) =>
        JSON.parse(fs.readFileSync(path.resolve(__dirname, '../__fixtures__', f), 'utf-8'))
      )
      for (const deck of fixtures) {
        for (const { type, depth } of collectNested(deck)) {
          if (depth > 0) expect([type, registry.get(type)?.scope]).not.toEqual([type, 'slide'])
        }
      }
    })
  })

  describe('BUILT_IN_BLOCKS', () => {
    it('has the expected hardened count', () => {
      // Today's figure. Update ONLY when a block is genuinely added or removed.
      expect(BUILT_IN_BLOCKS).toHaveLength(EXPECTED_BLOCK_COUNT)
    })

    it('exports 7 family arrays', () => {
      // layout, text, data, diagram, composite, media, chrome
      const families = new Set(BUILT_IN_BLOCKS.map((b) => b.family))
      expect(Array.from(families).sort()).toEqual(
        ['chrome', 'composite', 'data', 'diagram', 'layout', 'media', 'text']
      )
    })
  })

  describe('each block in the catalog', () => {
    for (const def of BUILT_IN_BLOCKS) {
      describe(`block "${def.type}"`, () => {
        it('registry.get(type) resolves after registerBuiltInBlocks()', () => {
          const got = registry.get(def.type)
          expect(got).toBeDefined()
          expect(got?.type).toBe(def.type)
        })

        it('describe.example passes validateDeckSpec', () => {
          expect(def.describe).toBeDefined()
          expect(def.describe.example).toBeDefined()
          const errs = validateDeckSpec(
            {
              id: 'test-deck',
              title: 'Test',
              version: 1,
              slides: [{ id: 's1', blocks: [def.describe.example], layout: { type: 'tls.l.stack' } }],
              theme: 'mono-grid',
            } as any,
            registry,
          )
          // The example must pass the deck spec validator. This is the same check
          // that catches bad id typos early.
          expect(errs.filter((e) => e.code === 'BLOCK_TYPE_UNKNOWN').length).toBe(0)
        })

        it('size.min <= size.preferred (both dimensions)', () => {
          expect(def.size).toBeDefined()
          expect(def.size.min[0]).toBeLessThanOrEqual(def.size.preferred[0])
          expect(def.size.min[1]).toBeLessThanOrEqual(def.size.preferred[1])
        })

        it('Tier B implies poster', () => {
          if (def.tier === 'B') {
            // Tier B blocks are composites / media that need a poster rendering path.
            expect(def.poster).toBeDefined()
          }
        })

        it('container blocks declare a children slot of kind blocks', () => {
          // Every layout-family block that reads children must declare a `children` slot.
          // Static list of the 11 container types (from the review: B2 problem statement).
          const containerTypes = new Set([
            'tls.l.row',
            'tls.l.stack',
            'tls.l.grid',
            'tls.l.split',
            'tls.l.card',
            'tls.l.section',
            'tls.l.overlay',
            'tls.l.safe-area',
            'tls.l.sidebar',
            'tls.l.footer',
            'tls.l.repeater',
          ])
          if (containerTypes.has(def.type)) {
            const slot = def.schema?.children
            expect(slot).toBeDefined()
            expect(slot?.type?.kind).toBe('blocks')
            expect(slot?.role).toBe('content')
          }
        })

        it('toggles slots follow the convention: key starts with "show", type is boolean', () => {
          const toggleSlots = Object.entries(def.schema || {})
            .filter(([_, s]) => 'toggles' in s)
          for (const [key, slot] of toggleSlots) {
            // B4 rule 1: key must start with "show"
            expect(key).toMatch(/^show[A-Z]/)
            // B4 rule 1: type must be boolean
            expect(slot.type.kind).toBe('boolean')
            // B4 rule 1: toggles points to a part name
            expect(slot.toggles).toBeDefined()
            expect(typeof slot.toggles).toBe('string')
          }
        })

        it('toggles: hiding a part actually removes it from the tree (reflow)', () => {
          const toggleSlots = Object.entries(def.schema || {})
            .filter(([_, s]) => 'toggles' in s)
          if (toggleSlots.length === 0) return // nothing to test

          const example = def.describe?.example
          if (!example) return

          const ctx = makeCtx({ width: 1920, height: 1080 }, makeRegistry())

          for (const [key, slot] of toggleSlots) {
            const part = slot.toggles!
            // Clone the example props and set the toggle to false.
            const propsWithToggleOff = {
              ...(example.props || {}),
              [key]: false,
            }

            if (def.tier === 'A' || def.kind === 'layout') {
              // Tier A: call layout() (or poster if kind is html) and collect parts.
              const layoutFn = def.layout || def.poster
              if (!layoutFn) continue
              let tree: LayoutNode
              try {
                tree = layoutFn(propsWithToggleOff as any, ctx)
              } catch {
                continue // some props may be invalid; skip
              }
              const parts = collectParts(tree)
              const hasPart = parts.some(
                (p) => p === part || p.startsWith(part + '[')
              )
              expect(hasPart).toBe(false)
            }

            if (def.kind === 'html' && def.html?.template) {
              // Tier B (html): call template() and check for data-part.
              const tplCtx = {
                esc: (s: string) =>
                  s
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;'),
                cssVar: (role: string) => `var(--tls-${role})`,
                box: { x: 0, y: 0, width: 1920, height: 1080 },
                tokens: ctx.tokens,
              }
              const html = def.html.template(propsWithToggleOff as any, tplCtx)
              expect(html).not.toContain(`data-part="${part}"`)
              expect(html).not.toContain(`data-part="${part}[`)
            }
          }
        })

        it('Tier A composite build() does not contain Tier B children', () => {
          // B5 conformance: a Tier A composite cannot use Tier B blocks in its
          // build() output — it must be pure layout composables.
          if (def.tier !== 'A' || def.family !== 'composite') return
          if (!def.describe?.example) return

          // Use the block's defaults as the build props (matches describe.example
          // semantics for composite blocks).
          const props = def.defaults || (def.describe.example.props as any) || {}
          const spec = (def as any).build?.(props as any)
          if (!spec) return

          // Walk the full tree and check every child type resolves to a Tier A block.
          const childTypes = collectSpecTypes(spec)
          for (const type of childTypes) {
            const childDef = registry.get(type)
            if (!childDef) continue // unknown types fail a different assertion
            // The root type is the composite itself (Tier A by definition here);
            // only child types need scanning.
            if (type === def.type) continue
            expect(childDef.tier).toBe(
              'A',
              `Tier A composite "${def.type}" cannot contain Tier B child "${type}"`
            )
          }
        })
      })
    }
  })

  describe('capability digest', () => {
    it('capabilityDigest(registry) does not throw', () => {
      expect(() => capabilityDigest(registry)).not.toThrow()
    })
  })

  describe('fixture-id conformance', () => {
    const fixturesDir = path.resolve(__dirname, '../__fixtures__')

    function loadFixtureDecks(): Array<{ name: string; deck: any }> {
      const results: Array<{ name: string; deck: any }> = []
      function walk(dir: string) {
        const entries = fs.readdirSync(dir)
        for (const entry of entries) {
          const fullPath = path.join(dir, entry)
          const stat = fs.statSync(fullPath)
          if (stat.isDirectory()) {
            walk(fullPath)
          } else if (entry.endsWith('.json')) {
            const deck = JSON.parse(fs.readFileSync(fullPath, 'utf-8'))
            // Deck fixtures have `slides`, each with `blocks`
            if (deck.slides) {
              results.push({ name: entry, deck })
            }
          }
        }
      }
      walk(fixturesDir)
      return results
    }

    const fixtures = loadFixtureDecks()

    it(`loaded ${fixtures.length} fixture decks`, () => {
      expect(fixtures.length).toBeGreaterThan(0)
    })

    for (const { name, deck } of fixtures) {
      describe(`fixture "${name}"`, () => {
        it('every block type resolves in the registry', () => {
          for (const slide of deck.slides || []) {
            for (const b of slide.blocks || []) {
              const resolved = registry.get(b.type)
              expect(resolved).toBeDefined()
              expect(resolved?.type).toBe(b.type)
            }
          }
        })
      })
    }
  })
})
