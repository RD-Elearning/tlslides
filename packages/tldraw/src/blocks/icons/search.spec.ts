/**
 * spro enhance I-1/I-2 — the curated Tabler set joins the Lucide icons, and a slide gets the icons
 * that fit its words, in English or Vietnamese.
 */
import { ICON_GROUPS, ICONS, iconTags } from './index'
import { iconsFor, queryWords } from './search'
import { iconCard } from '../compose-kit'

describe('icon set v2', () => {
  it('has Lucide and Tabler icons, every one in exactly one group', () => {
    expect(Object.keys(ICONS).length).toBeGreaterThan(700)
    const grouped = Object.values(ICON_GROUPS).flat()
    expect(new Set(grouped).size).toBe(grouped.length)
    expect(new Set(grouped)).toEqual(new Set(Object.keys(ICONS)))
    expect(ICONS['binary-tree'].source).toMatch(/Tabler/)
    expect(ICONS['check'].source).toMatch(/Lucide/)
    expect(iconTags('binary-tree')).toContain('tree')
  })

  it('finds icons for a Vietnamese slide about trees and traversal', () => {
    const got = iconsFor('Cây nhị phân và ba phép duyệt cây: nút gốc, nút lá, đệ quy')
    expect(got.length).toBeLessThanOrEqual(40)
    expect(got.slice(0, 15)).toEqual(expect.arrayContaining(['binary-tree']))
    expect(got).toEqual(expect.arrayContaining(['repeat']))
    expect(got.filter((n) => n.startsWith('message-')).length).toBeLessThan(3)
  })

  it('finds icons for an English slide on health and data', () => {
    const got = iconsFor('Patient flow in the hospital: waiting time and bed occupancy statistics')
    expect(got.some((n) => /stethoscope|bed|hospital|medical|heart/.test(n))).toBe(true)
    expect(got.some((n) => /chart|clock|hourglass/.test(n))).toBe(true)
  })

  it('maps toneless Vietnamese too', () => {
    expect(queryWords('cong thuc dao ham').has('function')).toBe(true)
  })

  it('the icon card lists only the slide icons', () => {
    const card = iconCard('Đạo hàm và công thức tính')
    expect(card.split(',').length).toBeLessThan(60)
    expect(card).toMatch(/math/)
    expect(iconCard()).toMatch(/listed with the slide/)
  })
})
