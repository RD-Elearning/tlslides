import { TLDR } from '~state/TLDR'
import { mockDocument, TldrawTestApp } from '~test'
import { ColorStyle, SizeStyle, TDShapeType } from '~types'

describe('Style command', () => {
  it('does, undoes and redoes command', () => {
    const app = new TldrawTestApp().loadDocument(mockDocument).select('rect1')
    expect(app.getShape('rect1').style.size).toEqual(SizeStyle.Medium)

    app.style({ size: SizeStyle.Small })

    expect(app.getShape('rect1').style.size).toEqual(SizeStyle.Small)

    app.undo()

    expect(app.getShape('rect1').style.size).toEqual(SizeStyle.Medium)

    app.redo()

    expect(app.getShape('rect1').style.size).toEqual(SizeStyle.Small)
  })

  describe('When styling groups', () => {
    it('applies style to all group children', () => {
      const app = new TldrawTestApp()
      app
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'groupA')
        .select('groupA')
        .style({ size: SizeStyle.Small })

      expect(app.getShape('rect1').style.size).toEqual(SizeStyle.Small)
      expect(app.getShape('rect2').style.size).toEqual(SizeStyle.Small)

      app.undo()

      expect(app.getShape('rect1').style.size).toEqual(SizeStyle.Medium)
      expect(app.getShape('rect2').style.size).toEqual(SizeStyle.Medium)

      app.redo()

      expect(app.getShape('rect1').style.size).toEqual(SizeStyle.Small)
      expect(app.getShape('rect2').style.size).toEqual(SizeStyle.Small)
    })
  })

  describe('When styling text', () => {
    it('recenters the shape if the size changed', () => {
      const app = new TldrawTestApp().createShapes({
        id: 'text1',
        type: TDShapeType.Text,
        text: 'Hello world',
      })

      const centerA = TLDR.getShapeUtil(TDShapeType.Text).getCenter(app.getShape('text1'))

      app.select('text1').style({ size: SizeStyle.Large })

      const centerB = TLDR.getShapeUtil(TDShapeType.Text).getCenter(app.getShape('text1'))

      app.style({ size: SizeStyle.Small })

      const centerC = TLDR.getShapeUtil(TDShapeType.Text).getCenter(app.getShape('text1'))

      app.style({ size: SizeStyle.Medium })

      const centerD = TLDR.getShapeUtil(TDShapeType.Text).getCenter(app.getShape('text1'))

      expect(centerA).toEqual(centerB)
      expect(centerA).toEqual(centerC)
      expect(centerB).toEqual(centerD)
    })
  })
})

describe('when running the command', () => {
  it('restores selection on undo', () => {
    const app = new TldrawTestApp()
      .loadDocument(mockDocument)
      .select('rect1')
      .style({ size: SizeStyle.Small })
      .selectNone()
      .undo()

    expect(app.selectedIds).toEqual(['rect1'])

    app.selectNone().redo()

    expect(app.selectedIds).toEqual(['rect1'])
  })
})

// Phase 8b — the style panel calls `app.style(...)` for every new field exactly like it does for
// the pre-existing ones, so there's no new command-layer code to test in isolation; what's worth
// pinning down here is that the generic patch mechanism really does round-trip these fields
// through undo/redo, and that the two "discrete control clears the arbitrary override" coherence
// rules the style panel relies on (StyleMenu's handleSizeChange/handleColorChange) actually work
// the way the panel assumes — an explicit `undefined` in the same patch clears the field via
// Utils.deepMerge, rather than being dropped as a no-op.
describe('Phase 8b — opacity, stroke width, corner radius, and custom stroke/fill', () => {
  it('sets, undoes and redoes every new field', () => {
    const app = new TldrawTestApp().loadDocument(mockDocument).select('rect1')

    app.style({
      opacity: 0.4,
      strokeWidth: 12,
      cornerRadius: 20,
      stroke: '#3a7bd5',
      fill: '#f5a623',
    })

    expect(app.getShape('rect1').style).toMatchObject({
      opacity: 0.4,
      strokeWidth: 12,
      cornerRadius: 20,
      stroke: '#3a7bd5',
      fill: '#f5a623',
    })

    app.undo()

    expect(app.getShape('rect1').style.opacity).toBeUndefined()
    expect(app.getShape('rect1').style.strokeWidth).toBeUndefined()
    expect(app.getShape('rect1').style.cornerRadius).toBeUndefined()
    expect(app.getShape('rect1').style.stroke).toBeUndefined()
    expect(app.getShape('rect1').style.fill).toBeUndefined()

    app.redo()

    expect(app.getShape('rect1').style).toMatchObject({
      opacity: 0.4,
      strokeWidth: 12,
      cornerRadius: 20,
      stroke: '#3a7bd5',
      fill: '#f5a623',
    })
  })

  it('picking a size clears an arbitrary stroke-width override in the same command, and one undo restores both', () => {
    const app = new TldrawTestApp().loadDocument(mockDocument).select('rect1')

    app.style({ strokeWidth: 30 })
    expect(app.getShape('rect1').style.strokeWidth).toBe(30)

    // Mirrors StyleMenu's handleSizeChange.
    app.style({ size: SizeStyle.Large, strokeWidth: undefined })
    expect(app.getShape('rect1').style.size).toBe(SizeStyle.Large)
    expect(app.getShape('rect1').style.strokeWidth).toBeUndefined()

    app.undo()
    expect(app.getShape('rect1').style.size).not.toBe(SizeStyle.Large)
    expect(app.getShape('rect1').style.strokeWidth).toBe(30)

    app.redo()
    expect(app.getShape('rect1').style.size).toBe(SizeStyle.Large)
    expect(app.getShape('rect1').style.strokeWidth).toBeUndefined()
  })

  it('picking a color swatch clears arbitrary stroke/fill overrides in the same command', () => {
    const app = new TldrawTestApp().loadDocument(mockDocument).select('rect1')

    app.style({ stroke: '#3a7bd5', fill: '#f5a623' })
    expect(app.getShape('rect1').style.stroke).toBe('#3a7bd5')
    expect(app.getShape('rect1').style.fill).toBe('#f5a623')

    // Mirrors StyleMenu's handleColorChange.
    app.style({ color: ColorStyle.Red, stroke: undefined, fill: undefined })
    expect(app.getShape('rect1').style.color).toBe(ColorStyle.Red)
    expect(app.getShape('rect1').style.stroke).toBeUndefined()
    expect(app.getShape('rect1').style.fill).toBeUndefined()

    app.undo()
    expect(app.getShape('rect1').style.stroke).toBe('#3a7bd5')
    expect(app.getShape('rect1').style.fill).toBe('#f5a623')
  })
})
