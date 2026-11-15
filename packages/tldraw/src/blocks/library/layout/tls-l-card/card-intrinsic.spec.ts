/**
 * spro sprint 2026-11c (MĂM p1 s05): a content-sized stack of one-line cards. Each card measured the
 * whole stack's box (its root keeps the cell; only its background hugs), so six cards were laid
 * 758 units apart and five fell off the slide.
 */
import { analyzeSlide } from '../../../layout-report'

const card = (k: number, text: string) => ({ id: `r${k}`, type: 'tls.l.card', props: { children: [{ id: `n${k}`, type: 'tls.t.body', props: { size: 'body', text } }] } })

it('cards in a content-sized stack take their own height, and all of them fit', () => {
  const texts = ['Tomato Red · #E94B35 · CTA', 'Mustard Yellow · #FFC83D · badge', 'Warm Cream · #FFF8EC · nền app', 'Surface · #FFFFFF · cards', 'Ink · #24211F · chữ chính', 'Muted · #817A73 · chữ phụ']
  const slide = {
    id: 's',
    layout: 'two-column',
    regions: {
      title: [{ id: 't', type: 'tls.t.title', props: { text: 'Bảng token màu' } }],
      left: [{ id: 'b', type: 'tls.t.body', props: { text: 'Người bạn sành ăn: thân thiện, vui, năng động.' } }],
      right: [{ id: 'tok', type: 'tls.l.stack', props: { gap: 'sm', sizing: 'content', children: texts.map((t, k) => card(k + 1, t)) } }],
    },
  }
  const r = analyzeSlide(slide as never)
  const tok = r.blocks.find((b) => b.id === 'tok')!
  const cards = (tok.children ?? []).filter((c) => /^tok\/r\d$/.test(c.path))
  expect(cards).toHaveLength(6)
  for (const c of cards) expect(c.box.height).toBeLessThan(200)
  expect(r.findings.filter((f) => f.code === 'slide/overflow' || f.code === 'text/overflow')).toEqual([])
})
