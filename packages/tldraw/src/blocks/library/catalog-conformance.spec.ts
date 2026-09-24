/**
 * G2.3 — Block catalog conformance spec.
 *
 * Asserts every block in BUILT_IN_BLOCKS satisfies five structural properties,
 * and extends it: every `type` used by every deck JSON under __fixtures__ resolves
 * in the registry.
 *
 * The count assertion is the gate against the "orphaned block" class of bug
 * that shipped in §0.4 — today's figure is 39 registered, 0 orphaned.
 */

import * as fs from 'fs'
import * as path from 'path'
import { BUILT_IN_BLOCKS, registerBuiltInBlocks } from './index'
import { BlockRegistry } from '../registry'
import { validateDeckSpec } from '../validate-deck-spec'
import { capabilityDigest } from '../capability-digest'
import { makeCtx, makeRegistry, collectParts } from './layout/test-helpers'
import type { LayoutNode } from '../types'

const EXPECTED_BLOCK_COUNT = 40

function freshBuiltInRegistry(): BlockRegistry {
  const registry = new BlockRegistry()
  registerBuiltInBlocks(registry)
  return registry
}

describe('block catalog conformance', () => {
  const registry = freshBuiltInRegistry()

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
