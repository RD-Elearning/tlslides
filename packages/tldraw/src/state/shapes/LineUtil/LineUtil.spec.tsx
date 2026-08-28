/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Line } from '..'

describe('Line shape', () => {
  it('Creates a shape', () => {
    expect(Line.create({ id: 'line' })).toMatchSnapshot('line')
  })

  it('Has no bend handle, decorations, or label, unlike an arrow', () => {
    const shape = Line.create({ id: 'line' })
    expect(shape.handles).toEqual({
      start: { id: 'start', index: 0, point: [0, 0] },
      end: { id: 'end', index: 1, point: [1, 1] },
    })
    expect('bend' in shape).toBe(false)
    expect('decorations' in shape).toBe(false)
    expect('label' in shape).toBe(false)
  })

  it('Never sets canBind on its handles, so it cannot bind to other shapes', () => {
    const shape = Line.create({ id: 'line' })
    expect(shape.handles.start.canBind).toBeUndefined()
    expect(shape.handles.end.canBind).toBeUndefined()
  })

  it('Computes bounds from its start and end handles', () => {
    const shape = Line.create({
      id: 'line',
      point: [10, 10],
      handles: {
        start: { id: 'start', index: 0, point: [0, 0] },
        end: { id: 'end', index: 1, point: [100, 50] },
      },
    })
    expect(Line.getBounds(shape)).toMatchObject({
      minX: 10,
      minY: 10,
      maxX: 110,
      maxY: 60,
      width: 100,
      height: 50,
    })
  })

  it('Hit tests near the line segment but not far from it', () => {
    const shape = Line.create({
      id: 'line',
      point: [0, 0],
      handles: {
        start: { id: 'start', index: 0, point: [0, 0] },
        end: { id: 'end', index: 1, point: [100, 0] },
      },
    })
    expect(Line.hitTestPoint(shape, [50, 0])).toBe(true)
    expect(Line.hitTestPoint(shape, [50, 50])).toBe(false)
  })

  it('onHandleChange normalizes negative handle points into the shape point', () => {
    const shape = Line.create({
      id: 'line',
      point: [10, 10],
      handles: {
        start: { id: 'start', index: 0, point: [0, 0] },
        end: { id: 'end', index: 1, point: [10, 10] },
      },
    })
    const change = Line.onHandleChange!(shape, {
      start: { ...shape.handles.start, point: [-20, -20] },
    })
    expect(change).toBeTruthy()
    // The shape's point should have moved to absorb the negative handle offset.
    expect(change!.point).toEqual([-10, -10])
  })

  it('onHandleChange returns nothing for a zero-length line', () => {
    const shape = Line.create({ id: 'line' })
    const change = Line.onHandleChange!(shape, {
      end: { ...shape.handles.end, point: shape.handles.start.point },
    })
    expect(change).toBeUndefined()
  })
})
