import { markHtmlEditPaths } from './html-edit-paths'
import type { LayoutNode } from './types'

const text = (propPath: string | undefined, ...lines: string[]) =>
  ({ k: 'text', part: 'x', propPath, box: { x: 0, y: 0, width: 1, height: 1 }, lines: lines.map((t) => ({ text: t })), style: {} }) as unknown as LayoutNode

describe('markHtmlEditPaths', () => {
  it('marks poster leaves (lines joined by <br>) and unique props, innermost first, in paint order', () => {
    const root = document.createElement('div')
    root.innerHTML =
      '<div data-part="label[0]"><div>2024</div><div>Học quy<br>luật</div></div>' +
      '<div data-part="label[1]"><div>2025</div><div>Học quy<br>luật</div></div>' +
      '<p>Chú thích</p><svg><text>2024</text></svg>'
    const poster = {
      k: 'group',
      part: 'root',
      box: { x: 0, y: 0, width: 1, height: 1 },
      children: [text('milestones.0.title', 'Học quy ', 'luật'), text('milestones.1.title', 'Học quy ', 'luật')],
    } as unknown as LayoutNode
    const props = {
      milestones: [
        { when: '2024', title: 'Học quy luật' },
        { when: '2025', title: 'Học quy luật' },
      ],
      caption: '**Chú** thích',
    }
    expect(markHtmlEditPaths(root, props, poster)).toBe(5)
    const paths = Array.from(root.querySelectorAll('[data-prop-path]')).map((e) => `${e.tagName}:${e.getAttribute('data-prop-path')}`)
    expect(paths).toEqual(['DIV:milestones.0.when', 'DIV:milestones.0.title', 'DIV:milestones.1.when', 'DIV:milestones.1.title', 'P:caption'])
  })

  it('leaves ambiguous prop texts unmarked when the poster does not name them', () => {
    const root = document.createElement('div')
    root.innerHTML = '<div>A</div><div>A</div>'
    expect(markHtmlEditPaths(root, { items: ['A', 'A'] }, undefined)).toBe(0)
  })
})
