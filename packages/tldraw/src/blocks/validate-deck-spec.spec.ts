/**
 * Q19 — `validateDeckSpec` tests.
 *
 * The 20+ adversarial cases required by the task brief are each their own `it()` below,
 * labelled "Adversarial N —" so they are easy to count against the acceptance list. Every one
 * of them asserts two things: (1) a *specific* finding fires (right rule, informative message),
 * and (2) the call never throws — `validateDeckSpec` itself never needs a try/catch at the call
 * site, which is the whole point.
 */

import { validateDeckSpec, defaultBlockRegistry, type DeckFinding } from './validate-deck-spec'
import { BlockRegistry } from './registry'
import { AnimationTrigger } from '~types'
import type { BlockSpec, DeckSpec } from './types'

/* ── helpers ───────────────────────────────────────────────────────────────── */

function findingsOf(spec: unknown, registry?: BlockRegistry): DeckFinding[] {
  return validateDeckSpec(spec as DeckSpec, registry)
}

function hasRule(findings: DeckFinding[], rule: string): boolean {
  return findings.some((f) => f.rule === rule)
}

function byRule(findings: DeckFinding[], rule: string): DeckFinding[] {
  return findings.filter((f) => f.rule === rule)
}

/** A minimal, fully valid deck — the baseline every adversarial case perturbs one field of. */
function validDeck(): DeckSpec {
  return {
    version: 1,
    id: 'deck1',
    title: 'A valid deck',
    theme: 'mono-grid',
    aspect: 'widescreen',
    slides: [
      {
        id: 'sl1',
        layout: 'two-column',
        regions: {
          title: [{ id: 'b1', type: 'tls.t.title', props: { text: 'Hello' } }],
          left: [
            {
              id: 'b2',
              type: 'tls.d.bar',
              props: { categories: ['Q1', 'Q2'], series: [1, 2] },
            },
          ],
          right: [{ id: 'b3', type: 'tls.t.takeaway', props: { text: 'Insight' } }],
        },
      },
    ],
  }
}

/** Deep-clone via JSON so mutations in one test never leak into another test's fixture. */
function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

/* ── sanity: the happy path produces no errors ────────────────────────────── */

describe('validateDeckSpec — happy path', () => {
  it('a fully valid deck produces zero error-level findings', () => {
    const findings = findingsOf(validDeck())
    const errors = findings.filter((f) => f.level === 'error')
    expect(errors).toEqual([])
  })

  it("the capability digest's own worked example (BACKLOG-demo.md §2.4) validates clean", () => {
    const deck: DeckSpec = {
      version: 1,
      id: 'd1',
      title: 'Q3 Business Review',
      theme: 'mono-grid',
      aspect: 'widescreen',
      slides: [
        {
          id: 'sl_03',
          layout: 'two-column',
          role: 'content',
          rhythm: 'dense',
          regions: {
            title: [
              {
                id: 'b1',
                type: 'tls.t.title',
                props: { text: { runs: [{ text: 'Margin fell on ' }, { text: 'infrastructure', bold: true }] } },
              },
            ],
            left: [
              {
                id: 'b2',
                type: 'tls.d.bar',
                props: { categories: ['Q1', 'Q2', 'Q3'], series: [64, 64, 61], highlightIndex: 2 },
                motion: { preset: 'bars-grow', order: 2, trigger: AnimationTrigger.OnClick },
              },
            ],
            right: [
              {
                id: 'b3',
                type: 'tls.t.takeaway',
                props: { text: 'Compute spend grew 2.4x while revenue grew 1.2x.' },
                motion: { preset: 'fade-up', order: 3 },
              },
              { id: 'b4', type: 'tls.t.caption', props: { text: 'Source: internal Q3 financials' } },
            ],
          },
          notes: 'Land on the 61 — this is the hinge slide.',
        },
      ],
    }
    const errors = findingsOf(deck).filter((f) => f.level === 'error')
    expect(errors).toEqual([])
  })
})

/* ── never throws, no matter how malformed ────────────────────────────────── */

describe('validateDeckSpec — never throws on malformed input', () => {
  it('Adversarial 1 — spec is null', () => {
    expect(() => findingsOf(null)).not.toThrow()
    const findings = findingsOf(null)
    expect(findings.length).toBeGreaterThan(0)
    expect(findings[0].level).toBe('error')
  })

  it('Adversarial 2 — spec is undefined', () => {
    expect(() => findingsOf(undefined)).not.toThrow()
    expect(findingsOf(undefined).length).toBeGreaterThan(0)
  })

  it('Adversarial 3 — spec is a non-object primitive (string)', () => {
    expect(() => findingsOf('not a deck')).not.toThrow()
    expect(findingsOf('not a deck').length).toBeGreaterThan(0)
  })

  it('Adversarial 4 — spec is a number', () => {
    expect(() => findingsOf(42)).not.toThrow()
  })

  it('Adversarial 5 — spec is an array, not an object', () => {
    expect(() => findingsOf([1, 2, 3])).not.toThrow()
  })
})

/* ── deck-level rules ──────────────────────────────────────────────────────── */

describe('validateDeckSpec — deck-level rules', () => {
  it('Adversarial 6 — empty object: every required top-level field is named', () => {
    const findings = findingsOf({})
    for (const field of ['id', 'title', 'theme', 'aspect', 'slides']) {
      const f = findings.find((x) => x.rule === 'deck/missing-field' && x.path === field)
      expect(f).toBeDefined()
      expect(f!.message).toContain(field)
    }
    expect(hasRule(findings, 'deck/version')).toBe(true)
  })

  it('Adversarial 7 — wrong version number', () => {
    const deck = clone(validDeck())
    ;(deck as any).version = 2
    const findings = findingsOf(deck)
    const f = byRule(findings, 'deck/version')[0]
    expect(f).toBeDefined()
    expect(f.path).toBe('version')
    expect(f.message).toMatch(/version must be exactly 1/)
  })

  it('Adversarial 8 — unknown theme id, with a nearest-name suggestion', () => {
    const deck = clone(validDeck())
    deck.theme = 'mno-grid' // typo of 'mono-grid'
    const findings = findingsOf(deck)
    const f = byRule(findings, 'deck/unknown-theme')[0]
    expect(f).toBeDefined()
    expect(f.message).toContain('mno-grid')
    expect(f.suggestion).toBe('mono-grid')
    expect(f.message).toContain('mono-grid')
  })

  it('Adversarial 9 — invalid aspect value', () => {
    const deck = clone(validDeck())
    ;(deck as any).aspect = 'cinematic'
    const findings = findingsOf(deck)
    expect(hasRule(findings, 'deck/invalid-aspect')).toBe(true)
  })

  it('Adversarial 10 — slides is not an array', () => {
    const deck = clone(validDeck())
    ;(deck as any).slides = 'nope'
    const findings = findingsOf(deck)
    const f = byRule(findings, 'deck/missing-field').find((x) => x.path === 'slides')
    expect(f).toBeDefined()
  })
})

/* ── slide-level rules ─────────────────────────────────────────────────────── */

describe('validateDeckSpec — slide-level rules', () => {
  it('Adversarial 11 — a slide entry that is not an object', () => {
    const deck = clone(validDeck())
    ;(deck.slides as any[]).push(null)
    expect(() => findingsOf(deck)).not.toThrow()
    const findings = findingsOf(deck)
    expect(hasRule(findings, 'slide/malformed')).toBe(true)
  })

  it('Adversarial 12 — slide missing id', () => {
    const deck = clone(validDeck())
    delete (deck.slides[0] as any).id
    const findings = findingsOf(deck)
    expect(findings.some((f) => f.rule === 'deck/missing-field' && f.path === 'slides[0].id')).toBe(true)
  })

  it('Adversarial 13 — duplicate slide ids', () => {
    const deck = clone(validDeck())
    const second = clone(deck.slides[0])
    deck.slides.push(second) // same id 'sl1'
    const findings = findingsOf(deck)
    expect(hasRule(findings, 'slide/duplicate-id')).toBe(true)
  })

  it('Adversarial 14 — slide missing layout', () => {
    const deck = clone(validDeck())
    delete (deck.slides[0] as any).layout
    const findings = findingsOf(deck)
    expect(findings.some((f) => f.rule === 'deck/missing-field' && f.path === 'slides[0].layout')).toBe(true)
  })

  it('Adversarial 15 — unknown layout, with a nearest-name suggestion', () => {
    const deck = clone(validDeck())
    deck.slides[0].layout = 'twocolum' // typo of 'two-column'
    const findings = findingsOf(deck)
    const f = byRule(findings, 'slide/unknown-layout')[0]
    expect(f).toBeDefined()
    expect(f.suggestion).toBe('two-column')
    expect(f.message).toContain('two-column')
  })

  it('Adversarial 16 — wrong region name lists the layout\'s real regions and suggests the closest one', () => {
    const deck = clone(validDeck())
    deck.slides[0].regions = { ...deck.slides[0].regions, lft: deck.slides[0].regions.left }
    delete (deck.slides[0].regions as any).left
    const findings = findingsOf(deck)
    const f = byRule(findings, 'region/unknown')[0]
    expect(f).toBeDefined()
    expect(f.suggestion).toBe('left')
    expect(f.message).toContain('two-column')
    expect(f.message).toContain('title')
    expect(f.message).toContain('right')
  })

  it('Adversarial 17 — a region value that is not an array', () => {
    const deck = clone(validDeck())
    ;(deck.slides[0].regions as any).title = { not: 'an array' }
    const findings = findingsOf(deck)
    expect(hasRule(findings, 'slide/malformed')).toBe(true)
  })
})

/* ── block-level rules ─────────────────────────────────────────────────────── */

describe('validateDeckSpec — block-level rules', () => {
  it('Adversarial 18 — unknown block type, suggested by edit distance', () => {
    const deck = clone(validDeck())
    deck.slides[0].regions.title[0].type = 'tls.t.titel' // typo of 'tls.t.title'
    const findings = findingsOf(deck)
    const f = byRule(findings, 'block/unknown-type')[0]
    expect(f).toBeDefined()
    expect(f.suggestion).toBe('tls.t.title')
    expect(f.message).toContain('tls.t.titel')
    expect(f.message).toContain('tls.t.title')
  })

  it('Adversarial 19 — missing required slot names the slot', () => {
    const deck = clone(validDeck())
    delete (deck.slides[0].regions.title[0].props as any).text
    const findings = findingsOf(deck)
    const f = byRule(findings, 'slot/missing')[0]
    expect(f).toBeDefined()
    expect(f.path).toBe('slides[0].regions.title[0].props.text')
    expect(f.message).toContain('"text"')
  })

  it('Adversarial 20 — unknown prop not declared on the schema', () => {
    const deck = clone(validDeck())
    ;(deck.slides[0].regions.title[0].props as any).nonsense = 'x'
    const findings = findingsOf(deck)
    const f = byRule(findings, 'slot/unknown')[0]
    expect(f).toBeDefined()
    expect(f.level).toBe('warning')
    expect(f.message).toContain('nonsense')
  })

  it('Adversarial 21 — a 400-character caption blows its 200-char budget by exactly 200', () => {
    const deck = clone(validDeck())
    const longText = 'x'.repeat(400)
    deck.slides[0].regions.right.push({ id: 'cap1', type: 'tls.t.caption', props: { text: longText } })
    const findings = findingsOf(deck)
    const capFinding = findings.find(
      (x) => x.rule === 'budget/overflow' && x.path.includes('props.text') && x.message.includes('400')
    )
    expect(capFinding).toBeDefined()
    expect(capFinding!.message).toContain('400')
    expect(capFinding!.message).toContain('200')
  })

  it('Adversarial 22 — a 60-item category list blows tls.d.bar\'s 20-item budget by 40', () => {
    const deck = clone(validDeck())
    const categories = Array.from({ length: 60 }, (_, i) => `C${i}`)
    deck.slides[0].regions.left[0].props.categories = categories
    const findings = findingsOf(deck)
    const f = findings.find(
      (x) => x.rule === 'budget/overflow' && x.path.endsWith('.props.categories')
    )
    expect(f).toBeDefined()
    expect(f!.message).toContain('60')
    expect(f!.message).toContain('40')
    expect(f!.message).toContain('20')
  })

  it('Adversarial 23 — a 10-value series blows tls.d.bar\'s 6-series budget', () => {
    const deck = clone(validDeck())
    deck.slides[0].regions.left[0].props.series = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const findings = findingsOf(deck)
    const f = findings.find((x) => x.rule === 'budget/overflow' && x.path.endsWith('.props.series'))
    expect(f).toBeDefined()
    expect(f!.message).toContain('10')
    expect(f!.message).toContain('6')
  })

  it('Adversarial 24 — a number slot below its declared minimum', () => {
    const deck = clone(validDeck())
    deck.slides[0].regions.left[0].props.highlightIndex = -5 // min is -1
    const findings = findingsOf(deck)
    const f = findings.find((x) => x.rule === 'budget/overflow' && x.path.endsWith('.props.highlightIndex'))
    expect(f).toBeDefined()
    expect(f!.message).toContain('-5')
    expect(f!.message).toContain('-1')
  })

  it('Adversarial 25 — an enum value not in the declared set', () => {
    const deck = clone(validDeck())
    ;(deck.slides[0].regions.title[0].props as any).size = 'gigantic'
    const findings = findingsOf(deck)
    expect(hasRule(findings, 'slot/invalid-enum')).toBe(true)
  })

  it('Adversarial 26 — a non-object block entry inside a region array', () => {
    const deck = clone(validDeck())
    ;(deck.slides[0].regions.title as any[]).push(null)
    expect(() => findingsOf(deck)).not.toThrow()
    const findings = findingsOf(deck)
    expect(hasRule(findings, 'block/malformed')).toBe(true)
  })

  it('Adversarial 27 — props is a string instead of an object', () => {
    const deck = clone(validDeck())
    ;(deck.slides[0].regions.title[0] as any).props = 'not an object'
    expect(() => findingsOf(deck)).not.toThrow()
    const findings = findingsOf(deck)
    expect(hasRule(findings, 'block/malformed')).toBe(true)
  })

  it('Adversarial 28 — duplicate block ids across the deck', () => {
    const deck = clone(validDeck())
    deck.slides[0].regions.right[0].id = deck.slides[0].regions.title[0].id // both 'b1'
    const findings = findingsOf(deck)
    expect(hasRule(findings, 'block/duplicate-id')).toBe(true)
  })
})

/* ── nesting / cycles ──────────────────────────────────────────────────────── */

function containerChain(depth: number): BlockSpec {
  let leaf: BlockSpec = { id: `n${depth}`, type: 'tls.l.stack', props: { gap: 'md' } }
  for (let i = depth - 1; i >= 1; i--) {
    leaf = { id: `n${i}`, type: 'tls.l.stack', props: { gap: 'md' }, children: [leaf] }
  }
  return leaf
}

describe('validateDeckSpec — nesting depth and cycles', () => {
  it('Adversarial 29 — a chain nested 7 levels deep (over the 6-level cap) fires exactly once', () => {
    const deck = clone(validDeck())
    deck.slides[0].regions.title = [containerChain(7)]
    const findings = findingsOf(deck)
    const nestingFindings = byRule(findings, 'block/nesting-depth')
    expect(nestingFindings.length).toBe(1)
    expect(nestingFindings[0].message).toMatch(/nested 7 levels deep/)
  })

  it('Adversarial 30 — a 60-deep chain never crashes and is bounded to one finding', () => {
    const deck = clone(validDeck())
    deck.slides[0].regions.title = [containerChain(60)]
    expect(() => findingsOf(deck)).not.toThrow()
    const findings = findingsOf(deck)
    expect(byRule(findings, 'block/nesting-depth').length).toBe(1)
  })

  it('Adversarial 31 — a real object-reference cycle in children never loops forever', () => {
    const cyclic: any = { id: 'c1', type: 'tls.l.stack', props: { gap: 'md' }, children: [] }
    cyclic.children.push(cyclic) // a.children = [a]
    const deck = clone(validDeck())
    ;(deck.slides[0].regions.title as any[]) = [cyclic]

    let findings: DeckFinding[] = []
    expect(() => {
      findings = findingsOf(deck)
    }).not.toThrow()
    expect(hasRule(findings, 'block/cyclic')).toBe(true)
  })

  it('Adversarial 32 — a logical cycle via a reused id (distinct objects, same id)', () => {
    const inner: BlockSpec = { id: 'dup', type: 'tls.l.stack', props: { gap: 'md' } }
    const outer: BlockSpec = { id: 'dup', type: 'tls.l.stack', props: { gap: 'md' }, children: [inner] }
    const deck = clone(validDeck())
    deck.slides[0].regions.title = [outer]
    const findings = findingsOf(deck)
    expect(hasRule(findings, 'block/cyclic')).toBe(true)
  })
})

/* ── free[] ────────────────────────────────────────────────────────────────── */

describe('validateDeckSpec — free[] aspect risk', () => {
  it('Adversarial 33 — a non-empty free[] always warns about aspect risk', () => {
    const deck = clone(validDeck())
    deck.slides[0].free = [
      { block: { id: 'f1', type: 'tls.t.caption', props: { text: 'hi' } }, box: { x: 0, y: 0, width: 100, height: 40 } },
    ]
    const findings = findingsOf(deck)
    const f = byRule(findings, 'free/aspect-risk')[0]
    expect(f).toBeDefined()
    expect(f.level).toBe('warning')
    expect(f.message).toMatch(/aspect/i)
  })

  it('Adversarial 34 — a free[] entry missing its box', () => {
    const deck = clone(validDeck())
    ;(deck.slides[0] as any).free = [{ block: { id: 'f2', type: 'tls.t.caption', props: { text: 'hi' } } }]
    const findings = findingsOf(deck)
    expect(findings.some((f) => f.rule === 'block/malformed' && f.path.endsWith('.box'))).toBe(true)
  })

  it('Adversarial 35 — a free[] entry that is not an object at all', () => {
    const deck = clone(validDeck())
    ;(deck.slides[0] as any).free = [null]
    expect(() => findingsOf(deck)).not.toThrow()
    const findings = findingsOf(deck)
    expect(hasRule(findings, 'block/malformed')).toBe(true)
  })
})

/* ── custom registry ───────────────────────────────────────────────────────── */

describe('validateDeckSpec — custom registry', () => {
  it('accepts a caller-supplied registry instead of the built-in default', () => {
    const registry = new BlockRegistry()
    registry.register({
      type: 'acme.card',
      name: 'Acme Card',
      family: 'text',
      tier: 'A',
      summary: 'A custom host block.',
      keywords: ['card'],
      schema: { text: { type: { kind: 'text' }, role: 'content', label: 'Text', required: true } },
      defaults: { text: '' },
      size: { preferred: [400, 200], min: [100, 60] },
      layout: () => ({ k: 'group', box: { x: 0, y: 0, width: 400, height: 200 }, children: [] }),
      motion: {},
    } as any)

    const deck: DeckSpec = {
      version: 1,
      id: 'd1',
      title: 'Custom registry deck',
      theme: 'mono-grid',
      aspect: 'widescreen',
      slides: [
        {
          id: 'sl1',
          layout: 'blank',
          regions: { content: [{ id: 'ac1', type: 'acme.card', props: {} }] },
        },
      ],
    }

    // Against the default registry, 'acme.card' is unknown.
    expect(hasRule(findingsOf(deck), 'block/unknown-type')).toBe(true)

    // Against the custom registry, it's known — but missing its required "text" slot.
    const findings = findingsOf(deck, registry)
    expect(hasRule(findings, 'block/unknown-type')).toBe(false)
    expect(hasRule(findings, 'slot/missing')).toBe(true)
  })

  it('defaultBlockRegistry() is populated from BUILT_IN_BLOCKS and is memoised', () => {
    const a = defaultBlockRegistry()
    const b = defaultBlockRegistry()
    expect(a).toBe(b)
    expect(a.has('tls.t.title')).toBe(true)
    expect(a.has('tls.d.bar')).toBe(true)
    expect(a.has('tls.l.stack')).toBe(true)
  })
})
