/**
 * spro demo T9 — the inline editor draws the edited text in its own type at the canvas zoom.
 */
import * as React from 'react'
import { render, cleanup } from '@testing-library/react'
import { InlineEditor, editorStyleOf } from './InlineEditor'

afterEach(cleanup)

const rect = (width: number, height: number) => ({ left: 10, top: 20, width, height, right: 10 + width, bottom: 20 + height, x: 10, y: 20, toJSON: () => ({}) }) as DOMRect

function textEl(): HTMLElement {
  const el = document.createElement('span')
  el.style.fontSize = '40px'
  el.style.lineHeight = '48px'
  el.style.fontWeight = '700'
  el.style.color = 'rgb(255, 255, 255)'
  el.style.textAlign = 'center'
  el.style.fontFamily = '"Crimson Pro", serif'
  Object.defineProperty(el, 'offsetWidth', { value: 400 })
  document.body.appendChild(el)
  return el
}

describe('InlineEditor (spro demo T9)', () => {
  it('editorStyleOf scales the computed type by the canvas zoom (shown width / laid-out width)', () => {
    const s = editorStyleOf(textEl(), rect(200, 30)) // the canvas shows it at half size
    expect(s.size).toBe(20)
    expect(s.lineHeight).toBe(24)
    expect(s).toMatchObject({ weight: '700', color: 'rgb(255, 255, 255)', align: 'center', family: '"Crimson Pro", serif' })
  })

  it('draws its text in that style, on a transparent background', () => {
    render(<InlineEditor propPath="text" initialValue="Cảm ơn" rect={rect(200, 30)} style={{ size: 20, lineHeight: 24, weight: '700', align: 'center' }} onSave={() => undefined} onCancel={() => undefined} />)
    const el = document.querySelector('[contenteditable]') as HTMLElement
    expect(el.style.fontSize).toBe('20px')
    expect(el.style.lineHeight).toBe('24px')
    expect(el.style.fontWeight).toBe('700')
    expect(el.style.textAlign).toBe('center')
    expect(el.textContent).toBe('Cảm ơn')
  })
})
