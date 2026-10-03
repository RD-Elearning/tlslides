import { tlsCKineticTitle } from './index'
import { showcaseSuite, tplCtx } from '../showcase-test'
import { titleWords, titleSize } from './schema'
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
