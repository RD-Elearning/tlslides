/** tls.d.annotated-line — spro creative CR13 (the shared wave suite + the event/x check). */
import { tlsDAnnotatedLine, buildAnnotatedLine } from './index'
import { wave1Suite } from '../wave1-test'
import { layoutAt } from '../composite-test'
import { absoluteLeaves } from '../../text/standard-suite'

const notes = (t: any) => absoluteLeaves(t).filter((l: any) => String(l.part).startsWith('note')).map((l: any) => (l.node as any).lines?.map((x: any) => x.text).join(' ')).join('|')

wave1Suite({
  def: tlsDAnnotatedLine, build: buildAnnotatedLine, category: 'chart', scope: 'slide',
  overflow: { events: [1, 2, 3, 4, 5].map((n) => ({ x: '2021', label: `e${n}` })) },
  variants: { slot: 'variant', values: ['notes-below', 'notes-inline'] },
  long: { events: [{ x: '2022', label: 'Lorem ipsum dolor sit amet consectetur adip' }, { x: '2024', label: 'Lorem ipsum dolor sit amet' }] }, parts: ['chart'],
})

describe('tls.d.annotated-line events', () => {
  it('an event whose x is not a category is not shown, and capacity says so', () => {
    const props = { ...(tlsDAnnotatedLine.defaults as Record<string, unknown>), events: [{ x: '2021', label: 'Real' }, { x: '1999', label: 'Not on the axis' }] }
    const t = layoutAt(tlsDAnnotatedLine, props, 1600, 800)
    expect(notes(t)).toContain('Real')
    expect(notes(t)).not.toContain('Not on the axis')
    expect(tlsDAnnotatedLine.capacity!(props as never, { width: 1600, height: 800 }, undefined as never).fits).toBe(false)
  })
})
