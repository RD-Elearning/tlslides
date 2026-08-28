import { FontStyle, SizeStyle, AlignStyle, ShapeStyles, ColorStyle, DashStyle } from '~types'
import { getTextSvgElement } from './getTextSvgElement'
import { getFontSize } from './shape-styles'

const baseStyle: ShapeStyles = {
  color: ColorStyle.Black,
  size: SizeStyle.Large,
  dash: DashStyle.Solid,
  font: FontStyle.Sans,
  textAlign: AlignStyle.Middle,
}

const bounds = { minX: 0, minY: 0, maxX: 400, maxY: 100, width: 400, height: 100 }

describe('getTextSvgElement — Phase 15 regression: `style.scale` must be applied to font size', () => {
  // Found by screenshotting `renderPageToSvg`'s output (a template with `scale: 0.55` on its
  // title rendered nearly double width and spilled off-frame) — see that module's own comment.
  // This function is the pre-existing shared helper both the live `copySvg` export path
  // (`TDShapeUtil.getSvgElement`/`TextUtil.getSvgElement`) and the headless renderer's own
  // `renderTextLines` are built on/mirror, so the fix belongs here, once, not duplicated.
  it('renders at the unscaled font size when scale is 1 (the default) — no behaviour change', () => {
    const elm = getTextSvgElement('Hello', baseStyle, bounds)
    expect(elm.getAttribute('font-size')).toBe(String(getFontSize(baseStyle.size, baseStyle.font)))
  })

  it('multiplies the font size by an explicit scale', () => {
    const scaled = { ...baseStyle, scale: 0.55 }
    const elm = getTextSvgElement('Hello', scaled, bounds)
    expect(elm.getAttribute('font-size')).toBe(String(getFontSize(baseStyle.size, baseStyle.font) * 0.55))
  })

  it('a Middle-aligned line still centers on the *given* bounds width regardless of scale', () => {
    const scaled = { ...baseStyle, scale: 1.3 }
    const elm = getTextSvgElement('Hi', scaled, bounds)
    const text = elm.querySelector('text')
    expect(text?.getAttribute('x')).toBe(String(bounds.width / 2))
  })
})
