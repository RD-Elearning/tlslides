import { tlsCKineticTitle } from './index'
import { showcaseSuite, tplCtx } from '../showcase-test'
import { orbsFor, PANEL_PAD, titleWords, titleSize } from './schema'
import { TEST_TOKENS } from '../../text/standard-suite'

showcaseSuite(tlsCKineticTitle, { textProp: 'title', noCapacity: true })

describe('tls.c.kinetic-title — specifics', () => {
  it('wraps every title word in its own mask and colours the highlight', () => {
    const html = tlsCKineticTitle.html!.template({ title: 'Dữ liệu kể chuyện', highlight: 'kể chuyện' } as any, tplCtx())
    expect(html.match(/data-word-inner/g)).toHaveLength(4)
    expect(titleWords({ title: 'Dữ liệu kể chuyện', highlight: 'kể chuyện' }).map((w) => w.accent)).toEqual([false, false, true, true])
    expect(titleWords({ title: 'A B', highlight: 'Z' }).every((w) => !w.accent)).toBe(true)
  })

  it('steps the title size down for long titles', () => {
    expect(titleSize('Short', TEST_TOKENS)).toBe(TEST_TOKENS.type.display.size)
    expect(titleSize('x'.repeat(60), TEST_TOKENS)).toBeLessThan(titleSize('x'.repeat(30), TEST_TOKENS))
  })

  it('decoration none drops the decor part; optional parts drop when empty', () => {
    const html = tlsCKineticTitle.html!.template({ title: 'T', decoration: 'none' } as any, tplCtx())
    expect(html).not.toContain('data-part="decor"')
    expect(html).not.toContain('data-part="kicker"')
    expect(html).not.toContain('data-part="subtitle"')
    expect(html).toContain('data-part="rule"')
  })
})

describe('AC2 — look knob (tone: accent)', () => {
  const DEF = tlsCKineticTitle
  const { makeCtx } = require('../../layout/test-helpers')
  const props = { ...(DEF.defaults as any), ...(DEF.describe!.example.props as any) }
  const leaves = (n: any, out: any[] = []): any[] => {
    if (n.k === 'group') n.children.forEach((c: any) => leaves(c, out))
    else out.push(n)
    return out
  }

  it('declares the knob as an enum', () => {
    expect((DEF.schema.tone.type as any).values).toEqual(['plain', 'accent'])
  })

  for (const align of ['center', 'start']) {
    it.each([
      ['preferred', DEF.size.preferred],
      ['min', DEF.size.min],
    ])(`tone accent, align ${align}, fits size.%s with nothing escaping it`, (_l, [w, h]) => {
      const node = DEF.poster!({ ...props, tone: 'accent', align }, makeCtx({ width: w, height: h }))
      expect(node.box.height).toBeLessThanOrEqual(h + 0.5)
      for (const l of leaves(node)) {
        expect(l.box.x).toBeGreaterThanOrEqual(-0.5)
        expect(l.box.x + l.box.width).toBeLessThanOrEqual(w + 0.5)
        expect(l.box.y + l.box.height).toBeLessThanOrEqual(h + 0.5)
      }
    })
  }

  it('paints an accent panel; every text in one on-accent ink; start-aligned text keeps the panel padding', () => {
    const c = makeCtx({ width: 1728, height: 888 })
    const node = DEF.poster!({ ...props, tone: 'accent', align: 'start' }, c)
    const panel = (node as any).children[0]
    expect(panel.fill.color).toBe(c.resolveColor('accent').color)
    const texts = leaves(node).filter((l) => l.k === 'text')
    const inks = new Set(texts.map((t) => t.style.color))
    expect(inks.size).toBe(1)
    expect([c.resolveColor('surface').color, c.resolveColor('text').color]).toContain([...inks][0])
    for (const t of texts) expect(t.box.x).toBeGreaterThanOrEqual(PANEL_PAD - 0.5)
    // the start-aligned panel drops the bottom-left disc
    expect(orbsFor({ ...props, tone: 'accent', align: 'start' }, 1728, 888).some((o) => o.kind === 'disc')).toBe(false)
  })

  it('template: the panel background and padding, the poster ink on the title; defaults unchanged', () => {
    const c = makeCtx({ width: 1728, height: 888 })
    const p = { ...props, tone: 'accent' }
    const poster = DEF.poster!(p, c)
    const ink = leaves(poster).find((l) => l.part === 'title').style.color
    const html = DEF.html!.template(p, { ...tplCtx(), poster } as any)
    expect(html).toMatch(/^<div data-kinetic-title style="[^"]*background:var\(--tls-accent\);/)
    expect(html).toContain(`padding:0px ${PANEL_PAD}px;`)
    expect(html).toMatch(new RegExp(`data-part="title"[^>]*color:${ink};`))
    const plain = DEF.html!.template(props, tplCtx())
    expect(plain).not.toMatch(/^<div data-kinetic-title style="[^"]*background:/)
    expect(plain).toMatch(/data-part="title"[^>]*color:var\(--tls-on\);/)
  })
})
