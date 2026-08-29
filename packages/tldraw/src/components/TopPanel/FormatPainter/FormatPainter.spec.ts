import { ColorStyle, DashStyle, SizeStyle, TDShapeType } from '~types'
import { TldrawTestApp } from '~test'
import { copyableStyle, FORMAT_PAINTER_STYLE_KEYS } from './FormatPainter'
import { defaultStyle } from '~state/shapes/shared/shape-styles'

describe('copyableStyle', () => {
  it('excludes `scale`', () => {
    expect(FORMAT_PAINTER_STYLE_KEYS).not.toContain('scale')
  })

  it('copies every present key verbatim', () => {
    const style = { ...defaultStyle, color: ColorStyle.Red, opacity: 0.5, stroke: '#123456' }
    const patch = copyableStyle(style)
    expect(patch.color).toBe(ColorStyle.Red)
    expect(patch.opacity).toBe(0.5)
    expect(patch.stroke).toBe('#123456')
  })

  it('writes an explicit `undefined` for every key absent on the source, not merely omitting it', () => {
    const style = { ...defaultStyle } // no opacity/stroke/fill overrides at all
    const patch = copyableStyle(style)
    // The key must actually be present (with value undefined), not missing — `in` distinguishes
    // the two; a naive `{ ...style }` would fail this because the key was never set on `style`.
    expect('opacity' in patch).toBe(true)
    expect(patch.opacity).toBeUndefined()
    expect('stroke' in patch).toBe(true)
    expect(patch.stroke).toBeUndefined()
  })

  it('never includes `scale` even when the source shape has one set', () => {
    const style = { ...defaultStyle, scale: 2 }
    const patch = copyableStyle(style)
    expect('scale' in patch).toBe(false)
  })
})

describe('format painter, end to end through app.style', () => {
  it('makes the target match the source exactly, clearing an override the source never had', () => {
    const app = new TldrawTestApp().createShapes(
      {
        type: TDShapeType.Rectangle,
        id: 'source',
        style: { ...defaultStyle, color: ColorStyle.Green, size: SizeStyle.Large, dash: DashStyle.Dotted },
      },
      {
        type: TDShapeType.Rectangle,
        id: 'target',
        style: { ...defaultStyle, color: ColorStyle.Red, stroke: '#ff0000', strokeWidth: 40 },
      }
    )

    const sourceStyle = app.getShape('source').style
    app.select('target')
    app.style(copyableStyle(sourceStyle))

    const targetStyle = app.getShape('target').style
    expect(targetStyle.color).toBe(ColorStyle.Green)
    expect(targetStyle.size).toBe(SizeStyle.Large)
    expect(targetStyle.dash).toBe(DashStyle.Dotted)
    // The target's own pre-existing overrides, absent on the source, must be cleared — this is
    // the coherence bug the format painter would otherwise reintroduce (see FormatPainter.tsx's
    // module comment).
    expect(targetStyle.stroke).toBeUndefined()
    expect(targetStyle.strokeWidth).toBeUndefined()
  })

  it('is a single undo step', () => {
    const app = new TldrawTestApp().createShapes(
      { type: TDShapeType.Rectangle, id: 'source', style: { ...defaultStyle, color: ColorStyle.Blue } },
      { type: TDShapeType.Rectangle, id: 'target', style: { ...defaultStyle, color: ColorStyle.Red } }
    )
    app.select('target')
    app.style(copyableStyle(app.getShape('source').style))
    expect(app.getShape('target').style.color).toBe(ColorStyle.Blue)
    app.undo()
    expect(app.getShape('target').style.color).toBe(ColorStyle.Red)
  })
})
