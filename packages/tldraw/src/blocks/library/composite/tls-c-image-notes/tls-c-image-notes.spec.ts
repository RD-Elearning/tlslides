/** tls.c.image-notes — spro sprint 2026-11b S09 (wave-1 suite; pins stay inside the picture for any fx/fy). */
import { tlsCImageNotes, pinCentres } from './index'
import { richBuilder } from '../_rich-block'
import { wave1Suite } from '../wave1-test'
import { layoutAt } from '../composite-test'
import { absoluteLeaves } from '../../text/standard-suite'

const V = ('Học sinh tự đọc phần này ở nhà, ghi lại những ý chưa hiểu và mang câu hỏi tới lớp để cả nhóm cùng thảo luận, đối chiếu với ví dụ trong sách giáo khoa' + ' ').repeat(4)

wave1Suite({
  def: tlsCImageNotes, build: richBuilder(tlsCImageNotes), category: 'media', scope: 'slide',
  overflow: { notes: [0, 1, 2, 3, 4, 5].map(() => ({ text: 'a' })) },
  variants: { slot: 'variant', values: ['notes-right', 'notes-below'] },
  long: { notes: [0, 1, 2, 3, 4].map((i) => ({ text: V.slice(i, i + 120), fx: i / 4, fy: 1 - i / 4 })), aspect: 1.5 },
  parts: ['image', 'pin', 'item'],
})

describe('tls.c.image-notes (S09)', () => {
  it('a pin stays inside the picture for any fx / fy in [0, 1], and absent ones stand on the right edge', () => {
    const pic = { x: 10, y: 20, width: 600, height: 400 }
    const grid = [0, 0.25, 0.5, 0.75, 1]
    const notes = grid.flatMap((fx) => grid.map((fy) => ({ fx, fy })))
    for (const c of pinCentres(pic, [...notes, {}, {}], 56)) {
      expect(c.x - 28).toBeGreaterThanOrEqual(pic.x)
      expect(c.x + 28).toBeLessThanOrEqual(pic.x + pic.width)
      expect(c.y - 28).toBeGreaterThanOrEqual(pic.y)
      expect(c.y + 28).toBeLessThanOrEqual(pic.y + pic.height)
    }
    const right = pinCentres(pic, [{}, {}], 56)
    expect(right[0].x).toBe(right[1].x)
    expect(right[0].x).toBeGreaterThan(pic.x + pic.width * 0.85)
  })

  it('a picture of known shape is drawn whole (contain, at its aspect) and the pins land on it', () => {
    for (const variant of ['notes-right', 'notes-below']) {
      const t = layoutAt(tlsCImageNotes, { variant, aspect: 2, notes: [{ text: 'a', fx: 0, fy: 0 }, { text: 'b', fx: 1, fy: 1 }] }, 1600, 760)
      const leaves = absoluteLeaves(t)
      const img = leaves.find((l) => (l.part ?? '').startsWith('image'))!
      const pins = leaves.filter((l) => /^pin\[\d\]/.test(l.part ?? '') && l.k !== 'text')
      expect(pins.length).toBeGreaterThan(0)
      for (const p of pins) {
        expect(p.x).toBeGreaterThanOrEqual(img.x - 1)
        expect(p.x + p.width).toBeLessThanOrEqual(img.x + img.width + 1)
      }
    }
  })
})
