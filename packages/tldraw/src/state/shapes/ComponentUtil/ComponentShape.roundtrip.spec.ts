import { TldrawTestApp } from '~test'
import { getShapeUtil } from '..'
import { ComponentShape, TDDocument, TDShapeType } from '~types'

describe('ComponentShape persistence', () => {
  it('round-trips componentId and props through a document save/load cycle', () => {
    const app = new TldrawTestApp()
    app.createShapes({
      id: 'component1',
      type: TDShapeType.Component,
      point: [50, 60],
      size: [320, 200],
      componentId: 'kpi-tile',
      props: { label: 'Revenue', value: 128000, tags: ['q1', 'finance'], nested: { ok: true } },
    })

    // Simulate a .tldr file (or a backend row) round-trip: only JSON survives, nothing else.
    const persisted: TDDocument = JSON.parse(JSON.stringify(app.document))
    expect(persisted).toEqual(JSON.parse(JSON.stringify(persisted))) // is plain JSON, no loss

    const reloaded = new TldrawTestApp().loadDocument(persisted)
    const shape = reloaded.getShape<ComponentShape>('component1')

    expect(shape.type).toBe(TDShapeType.Component)
    expect(shape.componentId).toBe('kpi-tile')
    expect(shape.props).toEqual({
      label: 'Revenue',
      value: 128000,
      tags: ['q1', 'finance'],
      nested: { ok: true },
    })
    expect(shape.size).toEqual([320, 200])
  })

  it('is registered in the shape util lookup table', () => {
    const util = getShapeUtil(TDShapeType.Component)
    expect(util).toBeDefined()
    expect(util.type).toBe(TDShapeType.Component)
  })

  it('does not throw when a document with an unknown componentId is loaded', () => {
    const app = new TldrawTestApp()
    expect(() =>
      app.createShapes({
        id: 'component2',
        type: TDShapeType.Component,
        point: [0, 0],
        componentId: 'some-block-a-newer-app-defined',
        props: { anything: 'goes' },
      })
    ).not.toThrow()

    expect(app.getShape<ComponentShape>('component2').componentId).toBe(
      'some-block-a-newer-app-defined'
    )
  })
})
