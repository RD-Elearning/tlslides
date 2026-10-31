/**
 * A chosen answer must look chosen BEFORE it is checked (spro deck a51aeac7 s10: the ✓/✗ buttons already
 * had an accent border, so the pressed state — a border colour — changed nothing the eye could see).
 */
import { css } from './live-kit'
import { TEST_TOKENS, makeCtx } from '../library/layout/test-helpers'
import { registry } from '../library/composite/composite-test'

describe('live-kit css — the chosen state', () => {
  const ctx = { ...makeCtx({ width: 1500, height: 900 }, registry()), tokens: TEST_TOKENS } as never
  const out = css('true-false', ctx, 60)
  const rule = (sel: string) => out.split('}').find((r) => r.includes(sel)) ?? ''

  it('a pressed ✓/✗ button is filled, not only outlined', () => {
    expect(rule('.tlsa-btn[aria-pressed="true"]')).toMatch(/background:/)
    expect(rule('.tlsa-btn[aria-pressed="true"]')).toMatch(/color:/)
  })

  it('a pressed option row is tinted', () => {
    expect(rule('.tlsa-cell[aria-pressed="true"]')).toMatch(/background:color-mix/)
  })

  it('a checked answer (data-state) still wins over the pressed tint', () => {
    expect(out.indexOf('[data-state="correct"]{')).toBeGreaterThan(out.indexOf('.tlsa-cell[aria-pressed="true"]'))
  })
})
