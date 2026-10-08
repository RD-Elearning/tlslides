/**
 * RVM2 — motion smoothness for G01 structure, G02 heading/text/emphasis, G03 list and G11
 * chrome/decoration (reviews/blocks/block-review/MOTION.md §1, criteria J1–J8).
 *
 * What the frame probe measures in the viewer, pinned here per block without a browser:
 * - furniture (chrome, background field/pattern, spacer, grid guide) never animates under a style;
 * - every recipe part exists in the block's own example and every drawn leaf is covered by one
 *   (an uncovered leaf shows with the block fade, still, before its neighbours rise: J2-like);
 * - the `expressive` timing stays in tokens (J5): each part 150–900 ms on an out ease, a stagger
 *   of at most 120 ms, the whole block done within 2.5 s; `subtle` is opacity only (J7);
 * - the containers tag their children `child/<i>` in reading order, so they stagger in;
 * - the two html blocks keep `subtle` to a fade and their expressive parts inside 900 ms.
 */

import type { BlockDefinition, BlockMotionRuntime, LayoutNode } from '../types'
import { BUILT_IN_BLOCKS } from './index'
import { layoutAt } from './composite/composite-test'
import { tplCtx, recordingDriver, fakeGsap } from './composite/showcase-test'
import { styleBlockMotion } from '../motion/motion-style'
import { resolveBlockMotion, resolvePartMotion } from '../motion/resolve-motion'
import { FEATURE_REVEAL_MS } from './composite/tls-c-feature-reveal/animate'

const G01 = ['tls.l.stack', 'tls.l.row', 'tls.l.grid', 'tls.l.split', 'tls.l.overlay', 'tls.l.card', 'tls.l.section', 'tls.l.repeater', 'tls.l.spacer', 'tls.l.safe-area', 'tls.l.grid-guide', 'tls.l.sidebar', 'tls.l.footer']
const G02 = ['tls.t.title', 'tls.t.subtitle', 'tls.t.kicker', 'tls.t.body', 'tls.t.caption', 'tls.t.footnote', 'tls.t.definition', 'tls.t.quote', 'tls.t.takeaway', 'tls.t.statement', 'tls.t.callout', 'tls.c.quote-image']
const G03 = ['tls.t.bullets', 'tls.t.numbered', 'tls.t.checklist', 'tls.t.kv-list', 'tls.t.tags', 'tls.c.feature-grid', 'tls.c.cards', 'tls.c.feature-reveal', 'tls.m.icon-list']
const G11 = ['tls.x.page-number', 'tls.x.footer-text', 'tls.x.logo-mark', 'tls.x.header', 'tls.x.watermark', 'tls.l.field', 'tls.g.arrow', 'tls.m.decoration', 'tls.m.pattern', 'tls.x.rule']
const ALL = [...G01, ...G02, ...G03, ...G11]

/** Slide furniture: static under every motion style. */
const STATIC = ['tls.x.page-number', 'tls.x.footer-text', 'tls.x.logo-mark', 'tls.x.header', 'tls.x.watermark', 'tls.l.field', 'tls.m.pattern', 'tls.l.spacer', 'tls.l.grid-guide']

/** Recipe parts the block's example legitimately lacks (shown only for some props). */
const OPTIONAL: Record<string, RegExp> = {
  'tls.t.title': /^rule$/,
  'tls.x.rule': /^rule-v$/, // the vertical rule's part (M1b/E7); the example is horizontal
  'tls.t.kicker': /^marker$/,
  'tls.t.definition': /^(pronunciation|meta|example\.bar|example)$/,
  'tls.t.takeaway': /^(icon|label)$/,
  'tls.t.callout': /^(icon|title)$/,
  'tls.t.statement': /^(mark|text\[\*\]|emphasis|attribution)$/,
  'tls.t.quote': /^attribution$/,
  'tls.c.quote-image': /^(name|role)$/,
  'tls.c.cards': /^lead\[\*\]$/,
  'tls.g.arrow': /^arrow\[head-start\]$/,
  'tls.t.bullets': /^item\[\*\]\.marker$/,
  'tls.t.numbered': /^item\[\*\]\.(badge|marker)$/,
  'tls.t.checklist': /^item\[\*\]\.strike$/,
  'tls.t.kv-list': /^(leader|rule)\[\*\]$/,
  'tls.m.icon-list': /^(iconbg|text)\[\*\]$/,
}

const def = (type: string): BlockDefinition => {
  const d = BUILT_IN_BLOCKS.find((b) => b.type === type)
  if (!d) throw new Error(`not in BUILT_IN_BLOCKS: ${type}`)
  return d
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** The same part matching as `partElements` in motion/play-reveal.ts. */
const matcher = (p: string) =>
  p.includes('[*]')
    ? (x: string) => new RegExp('^' + p.split('[*]').map(esc).join('\\[\\d+\\]') + '$').test(x)
    : (x: string) => x === p || x.startsWith(p + '/') || (x.startsWith(p) && /^\[\d+\]/.test(x.slice(p.length)))

const exampleTree = (d: BlockDefinition): LayoutNode =>
  layoutAt(d, (d.describe?.example?.props ?? {}) as Record<string, unknown>, d.size.preferred[0], d.size.preferred[1])

/** Every part in the tree, and every drawn leaf with the part chain above it. */
function partsOf(tree: LayoutNode): { parts: string[]; leaves: string[][] } {
  const parts: string[] = []
  const leaves: string[][] = []
  const walk = (n: LayoutNode, chain: string[]) => {
    const next = n.part ? [...chain, n.part] : chain
    if (n.part) parts.push(n.part)
    if (n.k === 'group') n.children.forEach((c) => walk(c, next))
    else leaves.push(next)
  }
  walk(tree, [])
  return { parts, leaves }
}

const layoutKind = ALL.filter((t) => def(t).kind !== 'html' && !STATIC.includes(t))

describe('RVM2 — the four groups are real blocks', () => {
  it('44 blocks, all in BUILT_IN_BLOCKS', () => {
    expect(ALL).toHaveLength(44)
    for (const t of ALL) expect(def(t).type).toBe(t)
  })
})

describe.each(STATIC.map((t) => [t]))('RVM2 %s is static furniture', (type) => {
  it('no motion style animates it; an explicit preset still can', () => {
    const d = def(type)
    expect(styleBlockMotion('subtle', d.motion, 1)).toBeUndefined()
    expect(styleBlockMotion('expressive', d.motion, 1)).toBeUndefined()
    expect(resolveBlockMotion({ preset: 'fade' }, d.motion).effect).not.toBeNull()
  })
})

describe.each(layoutKind.map((t) => [t]))('RVM2 %s', (type) => {
  const d = def(type)
  const tree = exampleTree(d)
  const { parts, leaves } = partsOf(tree)
  const recipe = d.motion.parts ?? []

  it('every recipe part exists in the example and every drawn leaf is animated', () => {
    expect(recipe.length).toBeGreaterThan(0)
    for (const p of recipe) {
      if (OPTIONAL[type]?.test(p)) continue
      expect([type, p, parts.some(matcher(p))]).toEqual([type, p, true])
    }
    const ms = recipe.map(matcher)
    const uncovered = leaves.filter((chain) => !chain.some((x) => ms.some((m) => m(x)))).map((c) => c[c.length - 1] ?? '(no part)')
    // the block's own root group is not a recipe part: a leaf directly under it rides the block fade
    expect([type, 'uncovered', [...new Set(uncovered)]]).toEqual([type, 'uncovered', []])
  })

  it('expressive: parts 150-900 ms on an out ease, stagger <= 120 ms, done within 2.5 s (J5)', () => {
    const spec = styleBlockMotion('expressive', d.motion, 1)!
    expect(spec).toBeDefined()
    const block = resolveBlockMotion(spec, d.motion)
    expect(block.durationMs).toBeGreaterThanOrEqual(150)
    expect(block.durationMs).toBeLessThanOrEqual(900)
    let end = block.durationMs
    for (const pm of resolvePartMotion(spec, d.motion)) {
      expect([type, pm.partName, pm.durationMs >= 150 && pm.durationMs <= 900]).toEqual([type, pm.partName, true])
      expect([type, pm.partName, pm.easing]).not.toEqual([type, pm.partName, 'linear'])
      expect(pm.staggerMs ?? 0).toBeLessThanOrEqual(120)
      const n = Math.max(1, parts.filter(matcher(pm.partName)).length)
      end = Math.max(end, pm.delayMs + (n - 1) * (pm.staggerMs ?? 0) + pm.durationMs)
    }
    expect([type, end <= 2500]).toEqual([type, true])
  })

  it('subtle is a calm fade: opacity only (J7)', () => {
    const spec = styleBlockMotion('subtle', d.motion, 1)!
    expect(resolveBlockMotion(spec, d.motion).effect).toBe('fadeIn')
    for (const pm of resolvePartMotion(spec, d.motion)) {
      expect([type, pm.partName, Object.keys(pm.keyframes)]).toEqual([type, pm.partName, ['opacity']])
    }
  })
})

describe('RVM2 containers stagger their children in reading order', () => {
  const containers = G01.filter((t) => !STATIC.includes(t))
  it.each(containers.map((t) => [t]))('%s tags each child block child/<i>', (type) => {
    const d = def(type)
    const { parts } = partsOf(exampleTree(d))
    const kids = parts.filter((p) => /^child\/\d+$/.test(p))
    expect(kids.length).toBeGreaterThan(0)
    // a multi-child card/section/safe-area delegates to an inner stack, which does the tagging
    // (a repeater stamps its one template child once per item)
    const ex = d.describe!.example.props as any
    const n = type === 'tls.l.repeater' ? ex.count : ex.children.length
    expect(kids.length).toBe(n)
    expect(kids).toEqual(kids.map((_, i) => `child/${i}`))
  })

  it('a grid tags its children row-major (reading order)', () => {
    const d = def('tls.l.grid')
    const tree = exampleTree(d)
    const kids = (tree as any).children.filter((c: any) => /^child\//.test(c.part ?? ''))
    for (let i = 1; i < kids.length; i++) {
      const a = kids[i - 1].box
      const b = kids[i].box
      expect(b.y > a.y + 1 || (Math.abs(b.y - a.y) <= 1 && b.x > a.x)).toBe(true)
    }
  })
})

describe('RVM2 statement emphasis sweeps in with its words', () => {
  it.each(['highlight', 'underline'])('%s rects sit in one `emphasis` motion part', (emphasis) => {
    const d = def('tls.t.statement')
    const tree = layoutAt(d, { ...(d.describe!.example.props as any), emphasis, text: 'Ship **the smallest thing** that teaches us something' }, 1200, 400)
    const group = (tree as any).children.find((c: any) => c.part === 'emphasis')
    expect(group?.k).toBe('group')
    expect(group.children.length).toBeGreaterThan(0)
    expect(d.motion.parts).toContain('emphasis')
    expect(d.motion.partMotion?.emphasis?.preset).toBe('wipe-x')
  })
})

describe('RVM2 html list blocks', () => {
  const mount = (type: string) => {
    const d = def(type)
    const root = document.createElement('div')
    document.body.appendChild(root)
    root.innerHTML = d.html!.template(JSON.parse(JSON.stringify(d.describe!.example.props)), tplCtx(1200, 400))
    return { d, root }
  }
  const rt = (driver: BlockMotionRuntime['driver'], style: 'subtle' | 'expressive', gsap?: unknown): BlockMotionRuntime => ({
    driver,
    ...(gsap ? { gsap } : {}),
    timing: { delayMs: 0, durationMs: 400, staggerMs: 40, ease: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    reducedMotion: false,
    style,
    onComplete: () => undefined,
  })

  it.each(['tls.c.feature-grid', 'tls.c.feature-reveal'])('%s: subtle fades every part, nothing else (J7)', (type) => {
    const { d, root } = mount(type)
    const rec = recordingDriver()
    d.html!.animate!(root, rt(rec.driver, 'subtle'))
    const n = root.querySelectorAll('[data-part]').length
    expect(rec.plays.length).toBeGreaterThanOrEqual(n)
    for (const p of rec.plays) expect(Object.keys(p.keyframes)).toEqual(['opacity'])
    root.remove()
  })

  it.each(['tls.c.feature-grid', 'tls.c.feature-reveal'])('%s: expressive (driver path) parts last 150-900 ms (J5)', (type) => {
    const { d, root } = mount(type)
    const rec = recordingDriver()
    d.html!.animate!(root, rt(rec.driver, 'expressive'))
    expect(rec.plays.length).toBeGreaterThan(0)
    for (const p of rec.plays) {
      expect(p.opts.duration).toBeGreaterThanOrEqual(150)
      expect(p.opts.duration).toBeLessThanOrEqual(900)
    }
    root.remove()
  })

  it('feature-grid icons pop from 0.7, not 0.4 (no scale snap in the first frames)', () => {
    const { d, root } = mount('tls.c.feature-grid')
    const rec = recordingDriver()
    d.html!.animate!(root, rt(rec.driver, 'expressive'))
    const icons = rec.plays.filter((p) => (p.target.getAttribute('data-part') ?? '').endsWith('.icon'))
    expect(icons.length).toBeGreaterThan(0)
    for (const p of icons) expect(p.keyframes.scale?.[0]).toBe(0.7)
    root.remove()
  })

  it('feature-reveal: gsap tweens stay inside 900 ms and the chain waits at most 2 s', () => {
    const { d, root } = mount('tls.c.feature-reveal')
    const g = fakeGsap()
    d.html!.animate!(root, rt(recordingDriver().driver, 'expressive', g.gsap))
    expect(g.tweens.length).toBeGreaterThan(0)
    for (const t of g.tweens) {
      const to = t.vars[t.op === 'fromTo' ? 1 : 0] as { duration?: number; y?: number }
      if (to.duration !== undefined) expect(to.duration).toBeLessThanOrEqual(0.9)
      const from = t.op === 'fromTo' ? (t.vars[0] as { y?: number }) : undefined
      if (from?.y !== undefined) expect(Math.abs(from.y)).toBeLessThanOrEqual(48)
    }
    expect(FEATURE_REVEAL_MS).toBeLessThanOrEqual(2000)
    expect(d.motion.expressiveMs).toBe(FEATURE_REVEAL_MS)
    root.remove()
  })
})
