/**
 * RVM5 — motion smoothness for G09 media / people / brand and G10 slide composites
 * (reviews/blocks/block-review/MOTION.md §1, criteria J1–J8).
 *
 * Pinned per block without a browser.
 * Layout blocks — from the layout tree (document order = the order the motion engine staggers the
 * elements one recipe part matches) and the resolved expressive recipe:
 * - every recipe part exists in the example or one of its variants, and every drawn leaf (in every
 *   variant) sits under an animated part;
 * - J5 with the example, each variant *and* the maximum item count: each part 150–900 ms on an
 *   out ease, a stagger of at most 120 ms, the whole chain within 2.5 s (3.5 s for slide scope);
 *   `subtle` is opacity only (J7);
 * - photos never slide or scale from small (opacity / clip only), brand furniture is opacity only;
 * - choreography: photo, then name, then role (people); a caption / note / bio never starts
 *   before its own item, also with an earlier one missing; kicker / title first, then subtitle,
 *   body / list, CTA and decoration last (slide composites).
 * Html blocks (testimonial, hero, kinetic-title) — their GSAP timeline and driver steps: every
 * tween 150–900 ms (a ≤ 100 ms container show is the J1 exemption) on an out ease, only opacity /
 * transform / clip (no letter-spacing, no filter), every part revealed by its own tween (no part
 * relies on the viewer's untouched-part guard), the chain within `expressiveMs` and the budget,
 * also with the longest content.
 */

import type { BlockDefinition, BlockMotionRuntime, LayoutNode } from '../types'
import { BUILT_IN_BLOCKS } from './index'
import { layoutAt } from './composite/composite-test'
import { styleBlockMotion } from '../motion/motion-style'
import { resolveBlockMotion, resolvePartMotion, type ResolvedPartMotion } from '../motion/resolve-motion'
import { tplCtx, recordingDriver } from './composite/showcase-test'

const G09 = [
  'tls.c.image-text', 'tls.m.image', 'tls.m.icon', 'tls.m.icon-label', 'tls.m.image-grid', 'tls.m.image-compare', 'tls.m.device-mock',
  'tls.c.testimonial', 'tls.c.profile-card', 'tls.c.team', 'tls.m.avatar', 'tls.m.avatar-group',
  'tls.m.logo', 'tls.m.logo-wall',
]
const G10 = [
  'tls.c.hero', 'tls.c.cover', 'tls.c.kinetic-title', 'tls.c.divider', 'tls.c.agenda', 'tls.c.objectives',
  'tls.c.closing', 'tls.c.recap', 'tls.c.contact', 'tls.t.qa', 'tls.c.quiz',
]
const HTML = ['tls.c.testimonial', 'tls.c.hero', 'tls.c.kinetic-title']
const LAYOUT = [...G09, ...G10].filter((t) => !HTML.includes(t))

const def = (type: string): BlockDefinition => {
  const d = BUILT_IN_BLOCKS.find((b) => b.type === type)
  if (!d) throw new Error(`not in BUILT_IN_BLOCKS: ${type}`)
  return d
}
const example = (d: BlockDefinition) => (d.describe?.example?.props ?? {}) as Record<string, unknown>

const w = (n: number, base: string) => Array.from({ length: n }, (_, i) => `${base} ${i + 1}`)
const photo = (i: number) => `/demo/photo-${(i % 3) + 1}.svg`
const portrait = (i: number) => `/demo/portrait-${(i % 4) + 1}.svg`

/** Variants whose parts the example does not draw (merged onto the example props). */
const VARIANTS: Record<string, Record<string, unknown>[]> = {
  'tls.m.image-grid': [{ captions: 'overlay' }, { captions: 'none' }],
  'tls.m.image-compare': [{ mode: 'split' }, { mode: 'side' }],
  'tls.m.logo-wall': [{ plates: true, dividers: true }],
  'tls.c.profile-card': [{ image: '' }, { layout: 'side' }],
  'tls.c.team': [{ card: 'plain' }],
  'tls.m.avatar': [{ image: '' }],
  'tls.c.cover': [{ variant: 'centered' }, { variant: 'split' }, { variant: 'bleed' }, { variant: 'bleed', showImage: false }, { variant: 'split', showImage: false }],
  'tls.c.divider': [{ variant: 'numeral' }, { variant: 'field' }, { variant: 'minimal' }, { variant: 'field', align: 'center' }],
  'tls.c.closing': [{ variant: 'centered' }, { variant: 'split' }, { ctaStyle: 'link' }],
  'tls.c.recap': [{ style: 'numbered' }, { style: 'cards' }],
  'tls.t.qa': [{ marker: 'numbered' }, { marker: 'none' }],
}

/** Props at the schema's maximum item count, with optional pieces missing on some items. */
const MAX_PROPS: Record<string, Record<string, unknown>> = {
  'tls.m.image-grid': { images: Array.from({ length: 9 }, (_, i) => ({ image: photo(i), alt: `Photo ${i}`, caption: i % 2 ? '' : `Caption ${i}` })) },
  'tls.m.logo-wall': { logos: Array.from({ length: 16 }, (_, i) => ({ image: '/demo/logo-1.svg', alt: `Logo ${i}` })), plates: true, dividers: true },
  'tls.m.avatar-group': { people: Array.from({ length: 20 }, (_, i) => ({ name: `Person ${i}`, image: i % 2 ? portrait(i) : '' })), max: 12, caption: 'Our reviewers' },
  'tls.c.team': { people: Array.from({ length: 8 }, (_, i) => ({ name: `Member ${i + 1}`, role: i === 1 ? '' : 'Role', bio: i % 3 === 0 ? '' : 'Short bio line.', image: i % 2 ? portrait(i) : '' })) },
  'tls.c.cover': { title: 'A deliberately long cover title that wraps over several lines here', variant: 'split' },
  'tls.c.divider': { title: 'A long section title that wraps over two lines', variant: 'field' },
  'tls.c.agenda': { items: w(12, 'Topic').map((title, i) => ({ title, note: i % 3 === 1 ? '' : 'Note' })) },
  'tls.c.objectives': { items: w(6, 'Explain the idea') },
  'tls.c.closing': { contacts: ['a@b.edu', 'site.edu', '@handle', '+84 123'], variant: 'split' },
  'tls.c.recap': { points: w(5, 'Point'), style: 'numbered' },
  'tls.c.contact': { items: ['email', 'phone', 'web', 'linkedin', 'github', 'location'].map((kind, i) => ({ kind, value: `value ${i}` })) },
  'tls.t.qa': { items: w(5, 'Question?').map((q) => ({ q, a: 'An answer of one sentence.' })) },
  'tls.c.quiz': { options: w(5, 'Option'), answer: 3, explanation: 'Because.' },
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** The same part matching as `partElements` in motion/play-reveal.ts. */
const matcher = (p: string) =>
  p.includes('[*]')
    ? (x: string) => new RegExp('^' + p.split('[*]').map(esc).join('\\[\\d+\\]') + '$').test(x)
    : (x: string) => x === p || x.startsWith(p + '/') || (x.startsWith(p) && /^\[\d+\]/.test(x.slice(p.length)))

const expressive = (d: BlockDefinition) => {
  const spec = styleBlockMotion('expressive', d.motion, 1)!
  return { block: resolveBlockMotion(spec, d.motion), parts: resolvePartMotion(spec, d.motion) }
}

const treeOf = (d: BlockDefinition, props?: Record<string, unknown>): LayoutNode =>
  layoutAt(d, { ...example(d), ...(props ?? {}) }, d.size.preferred[0], d.size.preferred[1])

interface Timed {
  chain: string[]
  start: number
  end: number
  k: LayoutNode['k']
}

/** Every drawn leaf with its start / end under the expressive recipe (document-order stagger;
 *  an exact part name matches all its elements at once, like `partElements`). */
function timeline(d: BlockDefinition, tree: LayoutNode): Timed[] {
  const pms = expressive(d).parts
  const all: string[] = []
  const collect = (n: LayoutNode) => {
    if (n.part) all.push(n.part)
    if (n.k === 'group') n.children.forEach(collect)
  }
  collect(tree)
  const counters = new Map<ResolvedPartMotion, number>()
  const out: Timed[] = []
  const walk = (n: LayoutNode, chain: string[], start: number, end: number) => {
    let s = start
    let e = end
    if (n.part) {
      for (const pm of pms) {
        const exact = all.includes(pm.partName)
        if (exact ? n.part !== pm.partName : !matcher(pm.partName)(n.part)) continue
        const i = exact ? 0 : counters.get(pm) ?? 0
        if (!exact) counters.set(pm, i + 1)
        const t = pm.delayMs + i * (pm.staggerMs ?? 0)
        s = Math.max(s, t)
        e = Math.max(e, t + pm.durationMs)
      }
    }
    const next = n.part ? [...chain, n.part] : chain
    if (n.k === 'group') n.children.forEach((c) => walk(c, next, s, e))
    else out.push({ chain: next, start: s, end: e, k: n.k })
  }
  walk(tree, [], 0, 0)
  return out
}

const last = (t: Timed) => t.chain[t.chain.length - 1] ?? ''
/** Leaves whose chain contains a part matching `re` (a leaf inside slot `name[3]` matches /^name\[3\]$/). */
const under = (tl: Timed[], re: RegExp) => tl.filter((x) => x.chain.some((p) => re.test(p)))
const startOf = (tl: Timed[], re: RegExp) => {
  const hit = under(tl, re)
  if (hit.length === 0) throw new Error(`no leaf under ${re}`)
  return Math.min(...hit.map((x) => x.start))
}
const has = (tl: Timed[], re: RegExp) => under(tl, re).length > 0

const propSets = (type: string): Array<[string, Record<string, unknown> | undefined]> => [
  ['example', undefined],
  ...(VARIANTS[type] ?? []).map((v, i) => [`variant ${i}`, v] as [string, Record<string, unknown>]),
  ...(MAX_PROPS[type] ? ([['max items', MAX_PROPS[type]]] as Array<[string, Record<string, unknown>]>) : []),
]

describe('RVM5 — the two groups are real blocks', () => {
  it('25 blocks, all in BUILT_IN_BLOCKS', () => {
    expect(G09.length + G10.length).toBe(25)
    for (const t of [...G09, ...G10]) expect(def(t).type).toBe(t)
  })
})

describe.each(LAYOUT.map((t) => [t]))('RVM5 %s', (type) => {
  const d = def(type)
  const recipe = d.motion.parts ?? []

  it('every recipe part exists in the example or a variant; every drawn leaf is animated in each', () => {
    const seen = new Set<string>()
    for (const [which, props] of propSets(type)) {
      const tree = treeOf(d, props)
      const walk = (n: LayoutNode) => {
        if (n.part) seen.add(n.part)
        if (n.k === 'group') n.children.forEach(walk)
      }
      walk(tree)
      const ms = recipe.map(matcher)
      const uncovered = timeline(d, tree)
        .filter((t) => !t.chain.some((x) => ms.some((m) => m(x))))
        .map((t) => last(t) || '(no part)')
        .filter((p) => p !== 'root')
      expect([type, which, 'uncovered', [...new Set(uncovered)]]).toEqual([type, which, 'uncovered', []])
    }
    for (const p of recipe) expect([type, p, [...seen].some(matcher(p))]).toEqual([type, p, true])
    for (const k of Object.keys(d.motion.partMotion ?? {})) expect([type, k, recipe.includes(k)]).toEqual([type, k, true])
  })

  it.each(propSets(type))('expressive J5 (%s): 150–900 ms, out ease, stagger <= 120 ms, in budget', (_which, props) => {
    const { block, parts: pms } = expressive(d)
    expect(block.effect).toBe('fadeIn')
    for (const pm of pms) {
      expect([type, pm.partName, pm.durationMs >= 150 && pm.durationMs <= 900]).toEqual([type, pm.partName, true])
      expect([type, pm.partName, pm.easing]).not.toEqual([type, pm.partName, 'linear'])
      expect([type, pm.partName, (pm.staggerMs ?? 0) <= 120]).toEqual([type, pm.partName, true])
    }
    const tl = timeline(d, treeOf(d, props))
    const end = Math.max(block.durationMs, ...tl.map((t) => t.end))
    const budget = d.scope === 'slide' ? 3500 : 2500
    expect([type, end <= budget]).toEqual([type, true])
  })

  it('subtle is a calm fade: opacity only (J7)', () => {
    const spec = styleBlockMotion('subtle', d.motion, 1)!
    for (const pm of resolvePartMotion(spec, d.motion)) expect([type, pm.partName, Object.keys(pm.keyframes)]).toEqual([type, pm.partName, ['opacity']])
  })
})

/* ── photos, brand furniture ─────────────────────────────────────────────────────────────────── */

const keysOf = (type: string, part: string) => {
  const pm = expressive(def(type)).parts.find((p) => p.partName === part)
  if (!pm) throw new Error(`${type}: no part ${part}`)
  return pm
}

describe('RVM5 photos never slide or scale from small; brand is calm', () => {
  it.each([
    ['tls.m.image', 'image'],
    ['tls.c.image-text', 'image'],
    ['tls.m.image-grid', 'img[*]'],
    ['tls.m.image-compare', 'before'],
    ['tls.m.image-compare', 'after'],
    ['tls.m.device-mock', 'screen'],
    ['tls.m.avatar', 'photo'],
    ['tls.m.avatar-group', 'seq[*]'],
    ['tls.c.profile-card', 'photo'],
    ['tls.c.team', 'face[*]'],
    ['tls.c.cover', 'image'],
    ['tls.c.closing', 'person'],
    ['tls.c.contact', 'person'],
  ])('%s %s: opacity or a clip only', (type, part) => {
    const pm = keysOf(type, part)
    for (const k of Object.keys(pm.keyframes)) expect([type, part, k]).toEqual([type, part, expect.stringMatching(/^(opacity|clipPath)$/)])
  })

  it.each([['tls.m.logo'], ['tls.m.logo-wall']])('%s: every part fades in place (opacity only)', (type) => {
    for (const pm of expressive(def(type)).parts) expect([type, pm.partName, Object.keys(pm.keyframes)]).toEqual([type, pm.partName, ['opacity']])
  })

  it('device mock: the shadow group keeps its authored opacity (its inner rect fades)', () => {
    const d = def('tls.m.device-mock')
    expect(d.motion.parts).not.toContain('frame.shadow')
    expect(d.motion.parts).toContain('frame.shadow.rect')
  })
})

/* ── choreography ────────────────────────────────────────────────────────────────────────────── */

describe('RVM5 reading order', () => {
  it('avatar and profile card: photo, then name, then role', () => {
    for (const type of ['tls.m.avatar', 'tls.c.profile-card']) {
      const d = def(type)
      for (const props of [undefined, { image: '' }]) {
        const tl = timeline(d, treeOf(d, props))
        const ph = startOf(tl, /^photo$/)
        const name = startOf(tl, /^name$/)
        expect([type, ph < name]).toEqual([type, true])
        expect([type, name < startOf(tl, /^role$/)]).toEqual([type, true])
      }
    }
    const pc = def('tls.c.profile-card')
    const tl = timeline(pc, treeOf(pc))
    expect(startOf(tl, /^background$/)).toBeLessThan(startOf(tl, /^photo$/))
    expect(startOf(tl, /^role$/)).toBeLessThan(startOf(tl, /^bio$/))
    expect(startOf(tl, /^bio$/)).toBeLessThan(startOf(tl, /^contact$/))
  })

  it('team: members in reading order <= 120 ms apart; each reads card, photo, name, role, bio (some missing)', () => {
    const d = def('tls.c.team')
    const tl = timeline(d, treeOf(d, MAX_PROPS['tls.c.team']))
    const people = MAX_PROPS['tls.c.team'].people as Array<{ role: string; bio: string }>
    let prevFace = -1
    people.forEach((m, i) => {
      const card = startOf(tl, new RegExp(`^card\\[${i}\\]$`))
      const face = startOf(tl, new RegExp(`^face\\[${i}\\]$`))
      const name = startOf(tl, new RegExp(`^name\\[${i}\\]$`))
      expect(card).toBeLessThan(face)
      expect(face).toBeLessThan(name)
      if (prevFace >= 0) expect(face - prevFace).toBe(120)
      prevFace = face
      if (m.role) expect(startOf(tl, new RegExp(`^role\\[${i}\\]$`))).toBeGreaterThan(name)
      else expect(has(tl, new RegExp(`^role\\[${i}\\]$`))).toBe(false)
      // (eight members at the preferred size drop the bios: the block's own fit rule)
      if (m.bio && has(tl, new RegExp(`^about\\[${i}\\]$`))) expect(startOf(tl, new RegExp(`^about\\[${i}\\]$`))).toBeGreaterThan(name)
    })
  })

  it('image grid: each caption after its own photo, also with every other caption missing (both caption modes)', () => {
    const d = def('tls.m.image-grid')
    for (const captions of ['below', 'overlay']) {
      const tl = timeline(d, treeOf(d, { ...MAX_PROPS['tls.m.image-grid'], captions }))
      const imgs = MAX_PROPS['tls.m.image-grid'].images as Array<{ caption: string }>
      imgs.forEach((im, i) => {
        if (!im.caption || !has(tl, new RegExp(`^caption\\[${i}\\]$`))) return
        expect([captions, i, startOf(tl, new RegExp(`^caption\\[${i}\\]$`)) > startOf(tl, new RegExp(`^img\\[${i}\\]$`))]).toEqual([captions, i, true])
      })
      // the overlay pill rides its caption slot, never the block fade
      for (const s of tl.filter((x) => /\.scrim$/.test(last(x)))) expect(s.chain.some((p) => /^caption\[\d+\]$/.test(p))).toBe(true)
    }
  })

  it('avatar group: faces left to right 80 ms apart, the +N bubble and the caption after the last face', () => {
    const d = def('tls.m.avatar-group')
    for (const [n, props] of [[12, MAX_PROPS['tls.m.avatar-group']], [5, { ...MAX_PROPS['tls.m.avatar-group'], people: (MAX_PROPS['tls.m.avatar-group'].people as unknown[]).slice(0, 8), max: 5 }]] as const) {
      const tl = timeline(d, treeOf(d, props as Record<string, unknown>))
      const faces = Array.from({ length: n }, (_, i) => startOf(tl, new RegExp(`^avatar\\[${i}\\]$`)))
      faces.forEach((t, i) => expect(t).toBe(i * 80))
      expect(startOf(tl, /^more$/)).toBeGreaterThan(faces[n - 1])
      // the caption sits right of the row when it has room (not beside twelve faces at 640 wide)
      if (n === 5) expect(startOf(tl, /^caption$/)).toBeGreaterThan(startOf(tl, /^more$/))
    }
  })

  it('image compare: before, after, divider, handle, labels (both modes)', () => {
    const d = def('tls.m.image-compare')
    for (const mode of ['split', 'side']) {
      const tl = timeline(d, treeOf(d, { mode }))
      const seq = [/^before$/, /^after$/, /^divider$/, /^before\.label$/, /^after\.label$/].map((re) => startOf(tl, re))
      expect([mode, seq]).toEqual([mode, [...seq].sort((a, b) => a - b)])
    }
  })

  it('logo wall: heading first, logos in reading order 60 ms apart, each plate with its logo', () => {
    const d = def('tls.m.logo-wall')
    const tl = timeline(d, treeOf(d, MAX_PROPS['tls.m.logo-wall']))
    for (let i = 0; i < 16; i++) {
      const logo = startOf(tl, new RegExp(`^logo\\[${i}\\]$`))
      expect(logo).toBe(120 + i * 60)
      if (has(tl, new RegExp(`^plate\\[${i}\\]$`))) expect(startOf(tl, new RegExp(`^plate\\[${i}\\]$`))).toBe(logo)
    }
  })

  it('cover: image / field / logo, then kicker, title lines, subtitle, then meta and decoration (every variant)', () => {
    const d = def('tls.c.cover')
    for (const props of VARIANTS['tls.c.cover'].concat([MAX_PROPS['tls.c.cover']])) {
      const tl = timeline(d, treeOf(d, props))
      const kicker = startOf(tl, /^kicker/)
      const titleEnd = Math.max(...under(tl, /^title/).map((x) => x.start))
      const subtitle = startOf(tl, /^subtitle/)
      for (const bg of [/^image$/, /^field$/, /^scrim$/, /^logo$/]) if (has(tl, bg)) expect(startOf(tl, bg)).toBeLessThan(kicker)
      expect(kicker).toBeLessThan(startOf(tl, /^title/))
      expect(titleEnd).toBeLessThan(subtitle)
      for (const tail of [/^meta$/, /^decoration/]) if (has(tl, tail)) expect(startOf(tl, tail)).toBeGreaterThan(subtitle)
    }
  })

  it('divider: field wipes first, then number, title, subtitle', () => {
    const d = def('tls.c.divider')
    expect(keysOf('tls.c.divider', 'field').presetId).toBe('wipe-x')
    for (const props of VARIANTS['tls.c.divider']) {
      const tl = timeline(d, treeOf(d, props))
      const seq = [/^field$/, /^number/, /^title/, /^subtitle/].filter((re) => has(tl, re)).map((re) => startOf(tl, re))
      expect(seq).toEqual([...seq].sort((a, b) => a - b))
    }
  })

  it('agenda: rows 120 ms apart; in each row number, title, then its note (every third note missing)', () => {
    const d = def('tls.c.agenda')
    const props = MAX_PROPS['tls.c.agenda']
    const tl = timeline(d, treeOf(d, props))
    ;(props.items as Array<{ note: string }>).forEach((it, i) => {
      const index = startOf(tl, new RegExp(`^item\\[${i}\\]\\.index$`))
      const title = startOf(tl, new RegExp(`^item\\[${i}\\]\\.title$`))
      expect(index).toBe(i * 120)
      expect(title).toBeGreaterThan(index)
      if (it.note) expect(startOf(tl, new RegExp(`^note\\[${i}\\]$`))).toBeGreaterThan(title)
    })
  })

  it('objectives, recap, contact: per item marker, number, text 40 ms apart, items 120 ms apart; recap takeaway after the last point', () => {
    for (const [type, part, n] of [['tls.c.objectives', 'list', 6], ['tls.c.recap', 'points', 5], ['tls.c.contact', 'items', 6]] as const) {
      const d = def(type)
      const tl = timeline(d, treeOf(d, MAX_PROPS[type]))
      const leaves = under(tl, new RegExp(`^${part}\\[\\d+\\]$`))
      expect([type, leaves.length]).toEqual([type, n * 3])
      leaves.forEach((l, k) => expect(l.start - leaves[0].start).toBe(k * 40))
      if (type === 'tls.c.recap') expect(startOf(tl, /^takeaway/)).toBeGreaterThan(Math.max(...leaves.map((l) => l.start)))
      if (type === 'tls.c.objectives') expect(startOf(tl, /^intro$/)).toBeLessThan(leaves[0].start)
    }
    const r = def('tls.c.recap')
    const tl = timeline(r, treeOf(r, { points: w(5, 'Point'), style: 'cards' }))
    for (let i = 0; i < 5; i++) {
      const card = startOf(tl, new RegExp(`^card\\[${i}\\]$`))
      expect(card).toBe(i * 120)
      expect(startOf(tl, new RegExp(`^number\\[${i}\\]$`))).toBeGreaterThan(card)
      expect(startOf(tl, new RegExp(`^point\\[${i}\\]$`))).toBeGreaterThan(startOf(tl, new RegExp(`^number\\[${i}\\]$`)))
    }
    expect(startOf(tl, /^takeaway/)).toBeGreaterThan(startOf(tl, /^point\[4\]$/))
  })

  it('closing: title, text, person, contacts, CTA last (both variants, both CTA styles)', () => {
    const d = def('tls.c.closing')
    for (const props of [...VARIANTS['tls.c.closing'], MAX_PROPS['tls.c.closing']]) {
      const tl = timeline(d, treeOf(d, props))
      const seq = [/^title/, /^text/, /^person/, /^contacts/, /^cta/].filter((re) => has(tl, re)).map((re) => startOf(tl, re))
      expect(seq).toEqual([...seq].sort((a, b) => a - b))
      expect(startOf(tl, /^cta/)).toBe(Math.max(...seq))
    }
  })

  it('qa: question then its answer, pair after pair', () => {
    const d = def('tls.t.qa')
    for (const marker of ['qa', 'numbered', 'none']) {
      const tl = timeline(d, treeOf(d, { ...MAX_PROPS['tls.t.qa'], marker }))
      let prev = -1
      for (let i = 0; i < 5; i++) {
        const q = startOf(tl, new RegExp(`^q\\[${i}\\]$`))
        const a = startOf(tl, new RegExp(`^a\\[${i}\\]$`))
        expect([marker, i, q > prev, a > q]).toEqual([marker, i, true, true])
        if (has(tl, new RegExp(`^qmark\\[${i}\\]`))) expect(startOf(tl, new RegExp(`^qmark\\[${i}\\]`))).toBeLessThan(q)
        prev = a - 1
      }
    }
  })

  it('quiz: question, option rows in order (the answer panel with its row), check mark, explanation last', () => {
    const d = def('tls.c.quiz')
    const tl = timeline(d, treeOf(d, MAX_PROPS['tls.c.quiz']))
    const question = startOf(tl, /^question/)
    const rows = Array.from({ length: 5 }, (_, i) => startOf(tl, new RegExp(`^row\\[${i}\\]$`)))
    rows.forEach((t, i) => expect(t).toBe(rows[0] + i * 120))
    expect(question).toBeLessThan(rows[0])
    expect(under(tl, /^answer$/)[0].chain).toContain('row[3]')
    expect(startOf(tl, /^answermark$/)).toBeGreaterThan(rows[4])
    expect(startOf(tl, /^explanation/)).toBeGreaterThan(startOf(tl, /^answermark$/))
  })
})

/* ── html blocks ─────────────────────────────────────────────────────────────────────────────── */

interface Tw {
  op: string
  targets: Element[]
  from: Record<string, unknown>
  to: Record<string, unknown>
  at: number
}

/** A GSAP-shaped timeline that records each tween with its position (s). */
function positionalGsap() {
  const tweens: Tw[] = []
  const list = (t: unknown): Element[] => (Array.isArray(t) ? (t as Element[]) : t instanceof Element ? [t] : t && typeof (t as ArrayLike<Element>).length === 'number' ? Array.from(t as ArrayLike<Element>) : [])
  const tl = {
    fromTo: (t: unknown, from: Record<string, unknown>, to: Record<string, unknown>, at?: number) => (tweens.push({ op: 'fromTo', targets: list(t), from, to, at: at ?? NaN }), tl),
    to: (t: unknown, to: Record<string, unknown>, at?: number) => (tweens.push({ op: 'to', targets: list(t), from: {}, to, at: at ?? NaN }), tl),
    set: (t: unknown, to: Record<string, unknown>, at?: number) => (tweens.push({ op: 'set', targets: list(t), from: {}, to, at: at ?? NaN }), tl),
    kill: () => undefined,
    then: (cb?: () => void) => (cb?.(), Promise.resolve()),
  }
  return { gsap: { timeline: () => tl }, tweens }
}

const LONG_QUOTE = Array.from({ length: 80 }, (_, i) => `word${i}`).join(' ').slice(0, 495)
const HTML_CASES: Array<[string, string, Record<string, unknown>]> = [
  ['tls.c.testimonial', 'example', {}],
  ['tls.c.testimonial', 'longest quote', { quote: LONG_QUOTE }],
  ['tls.c.testimonial', 'initials', { avatar: '' }],
  ['tls.c.hero', 'classic', { variant: 'classic', cta: 'Start now' }],
  ['tls.c.hero', 'split', { variant: 'split', cta: 'Start now' }],
  ['tls.c.hero', 'gradient-sweep', { variant: 'gradient-sweep', cta: 'Start now' }],
  ['tls.c.kinetic-title', 'example', {}],
  ['tls.c.kinetic-title', 'longest title', { title: 'one two three four five six seven eight nine ten eleven twelve thirteen' }],
]

function mount(type: string, props: Record<string, unknown>) {
  const d = def(type)
  const root = document.createElement('div')
  document.body.appendChild(root)
  root.innerHTML = d.html!.template({ ...(d.defaults as Record<string, unknown>), ...example(d), ...props } as never, tplCtx(1600, 800))
  // the viewer hides every part before animate()
  root.querySelectorAll<HTMLElement>('[data-part]').forEach((p) => (p.style.opacity = '0'))
  return { d, root }
}

const rtOf = (extra: Partial<BlockMotionRuntime>): BlockMotionRuntime =>
  ({
    driver: recordingDriver().driver,
    timing: { delayMs: 0, durationMs: 400, staggerMs: 40, ease: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    reducedMotion: false,
    style: 'expressive',
    onComplete: () => undefined,
    ...extra,
  }) as BlockMotionRuntime

describe('RVM5 html blocks (GSAP timeline)', () => {
  it.each(HTML_CASES)('%s (%s): tweens 150–900 ms on an out ease, compositor-only, every part revealed, within expressiveMs and budget', (type, _which, props) => {
    const { d, root } = mount(type, props)
    const g = positionalGsap()
    d.html!.animate!(root, rtOf({ gsap: g.gsap }))
    expect(g.tweens.length).toBeGreaterThan(2)
    let end = 0
    for (const t of g.tweens) {
      expect([type, t.op, Number.isFinite(t.at)]).toEqual([type, t.op, true]) // explicit positions: no sequential append
      expect([type, t.op]).not.toEqual([type, 'set'])
      const dur = Number(t.to.duration ?? 0)
      const showOnly = dur <= 0.1 && Object.keys(t.to).every((k) => k === 'opacity' || k === 'duration')
      if (!showOnly) {
        expect([type, dur >= 0.15 && dur <= 0.9]).toEqual([type, true])
        expect([type, String(t.to.ease)]).toEqual([type, expect.stringMatching(/\.out$/)])
      }
      for (const k of [...Object.keys(t.from), ...Object.keys(t.to)]) expect([type, k]).toEqual([type, expect.stringMatching(/^(opacity|x|y|xPercent|yPercent|scale|scaleX|scaleY|rotation|clipPath|transformOrigin|duration|ease|stagger)$/)])
      const n = t.targets.length
      end = Math.max(end, t.at + (n > 1 ? (n - 1) * Number(t.to.stagger ?? 0) : 0) + dur)
      if (t.to.stagger !== undefined) expect(Number(t.to.stagger)).toBeLessThanOrEqual(0.12)
    }
    // every part is revealed by a tween of its own that ends at opacity 1
    for (const part of Array.from(root.querySelectorAll('[data-part]'))) {
      const own = g.tweens.some((t) => t.targets.includes(part) && Number(t.to.opacity) === 1)
      expect([type, part.getAttribute('data-part'), own]).toEqual([type, part.getAttribute('data-part'), true])
    }
    expect(end * 1000).toBeLessThanOrEqual(d.motion.expressiveMs! + 1)
    expect(d.motion.expressiveMs!).toBeLessThanOrEqual(d.scope === 'slide' ? 3500 : 2500)
    root.remove()
  })

  it('hero: kicker, title, subtitle, CTA in that order in every variant; split slides the halves in', () => {
    for (const variant of ['classic', 'split', 'gradient-sweep']) {
      const { d, root } = mount('tls.c.hero', { variant, cta: 'Start now' })
      const g = positionalGsap()
      d.html!.animate!(root, rtOf({ gsap: g.gsap }))
      const at = (p: string) => Math.min(...g.tweens.filter((t) => t.targets.some((e) => e.getAttribute('data-part') === p)).map((t) => t.at))
      const seq = ['kicker', 'title', 'subtitle', 'cta'].map(at)
      expect([variant, seq]).toEqual([variant, [...seq].sort((a, b) => a - b)])
      expect(new Set(seq).size).toBe(4)
      if (variant === 'split') expect(g.tweens.filter((t) => t.targets.some((e) => e.hasAttribute('data-half')))).toHaveLength(2)
      if (variant === 'gradient-sweep') expect(g.tweens.some((t) => t.targets.some((e) => e.hasAttribute('data-gradient-bg')))).toBe(true)
      root.remove()
    }
  })

  it('testimonial: words first, then portrait, name, role; the portrait settles in place (scale <= 1.04, no slide)', () => {
    const { d, root } = mount('tls.c.testimonial', {})
    const g = positionalGsap()
    d.html!.animate!(root, rtOf({ gsap: g.gsap }))
    const tw = (p: string) => g.tweens.find((t) => t.targets.some((e) => e.getAttribute('data-part') === p))!
    expect(tw('avatar').at).toBeLessThan(tw('name').at)
    expect(tw('name').at).toBeLessThan(tw('role').at)
    const words = g.tweens.find((t) => t.targets.some((e) => e.hasAttribute('data-word')))!
    expect(words.at).toBeLessThan(tw('avatar').at)
    expect(tw('avatar').from).toEqual({ opacity: 0, scale: 1.04 })
    root.remove()
  })
})

describe('RVM5 html blocks (driver fallback)', () => {
  it.each(HTML_CASES)('%s (%s): every step 150–900 ms, compositor-only, every part revealed, within expressiveMs', async (type, _which, props) => {
    const { d, root } = mount(type, props)
    const rec = recordingDriver()
    d.html!.animate!(root, rtOf({ driver: rec.driver, gsap: undefined }))
    await Promise.resolve()
    expect(rec.sets.filter((s) => (s.target as Element).hasAttribute?.('data-part'))).toHaveLength(0)
    let end = 0
    for (const p of rec.plays) {
      const dur = Number(p.opts.duration ?? 0)
      expect([type, dur >= 150 && dur <= 900]).toEqual([type, true])
      expect([type, String(p.opts.easing)]).not.toEqual([type, expect.stringMatching(/linear|in-out/)])
      for (const k of Object.keys(p.keyframes)) expect([type, k]).toEqual([type, expect.stringMatching(/^(opacity|translate|scale|clipPath)$/)])
      end = Math.max(end, Number(p.opts.delay ?? 0) + dur)
    }
    for (const part of Array.from(root.querySelectorAll('[data-part]'))) {
      const own = rec.plays.some((p) => p.target === part && Array.isArray(p.keyframes.opacity) && p.keyframes.opacity[p.keyframes.opacity.length - 1] === 1)
      expect([type, part.getAttribute('data-part'), own]).toEqual([type, part.getAttribute('data-part'), true])
    }
    expect(end).toBeLessThanOrEqual(d.motion.expressiveMs! + 1)
    root.remove()
  })
})
