import * as React from 'react'
import { render, screen } from '@testing-library/react'
import { Component } from '..'
import { TldrawComponentsContext } from '~hooks'
import { ComponentShape, TDShapeType } from '~types'

function noopEvents() {
  return {
    onPointerDown: () => void 0,
    onPointerUp: () => void 0,
    onPointerEnter: () => void 0,
    onPointerMove: () => void 0,
    onPointerLeave: () => void 0,
  }
}

function renderComponentShape(shape: ComponentShape, registry: Record<string, React.ComponentType<any>>) {
  return render(
    <TldrawComponentsContext.Provider value={registry}>
      <Component.Component
        shape={shape}
        isEditing={false}
        isBinding={false}
        isHovered={false}
        isSelected={false}
        isGhost={false}
        bounds={{ minX: 0, minY: 0, maxX: shape.size[0], maxY: shape.size[1], width: shape.size[0], height: shape.size[1] }}
        meta={{ isDarkMode: false }}
        events={noopEvents()}
      />
    </TldrawComponentsContext.Provider>
  )
}

describe('Component shape', () => {
  it('Creates a shape', () => {
    expect(Component.create({ id: 'component' })).toMatchSnapshot('component')
  })

  it('defaults to an empty componentId and props bag', () => {
    const shape = Component.create({ id: 'component' })
    expect(shape.componentId).toBe('')
    expect(shape.props).toEqual({})
    expect(shape.type).toBe(TDShapeType.Component)
  })

  it('renders the registered component, spreading shape.props onto it', () => {
    const KpiTile = ({ label, value }: { label: string; value: string }) => (
      <div data-testid="kpi-tile">
        {label}: {value}
      </div>
    )

    const shape = Component.create({
      id: 'component1',
      componentId: 'kpi-tile',
      props: { label: 'Revenue', value: '$1.2M' },
    })

    renderComponentShape(shape, { 'kpi-tile': KpiTile })

    expect(screen.getByTestId('kpi-tile')).toHaveTextContent('Revenue: $1.2M')
  })

  it('renders a placeholder, and does not throw, when componentId is not in the registry', () => {
    const shape = Component.create({
      id: 'component2',
      componentId: 'does-not-exist',
      props: {},
    })

    expect(() => renderComponentShape(shape, {})).not.toThrow()
    expect(screen.getByText('Unknown block')).toBeInTheDocument()
    expect(screen.getByText('does-not-exist')).toBeInTheDocument()
  })

  it('renders a placeholder when no registry is provided at all', () => {
    const shape = Component.create({ id: 'component3', componentId: 'kpi-tile', props: {} })

    render(
      <Component.Component
        shape={shape}
        isEditing={false}
        isBinding={false}
        isHovered={false}
        isSelected={false}
        isGhost={false}
        bounds={{ minX: 0, minY: 0, maxX: shape.size[0], maxY: shape.size[1], width: shape.size[0], height: shape.size[1] }}
        meta={{ isDarkMode: false }}
        events={noopEvents()}
      />
    )

    expect(screen.getByText('Unknown block')).toBeInTheDocument()
  })

  it('does not crash the shape tree when a registered component throws while rendering', () => {
    const Boom = () => {
      throw new Error('boom')
    }
    const shape = Component.create({ id: 'component4', componentId: 'boom', props: {} })

    // eslint-disable-next-line no-console
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => void 0)
    expect(() => renderComponentShape(shape, { boom: Boom })).not.toThrow()
    errorSpy.mockRestore()

    expect(screen.getByText('Block crashed')).toBeInTheDocument()
  })

  it('emits a labelled placeholder rect for SVG export instead of dropping the block', () => {
    const shape = Component.create({ id: 'component5', componentId: 'bar-chart', size: [300, 150] })
    const svg = Component.getSvgElement(shape)

    expect(svg.querySelector('rect')).toBeTruthy()
    expect(svg.querySelector('rect')?.getAttribute('width')).toBe('300')
    expect(svg.querySelector('rect')?.getAttribute('height')).toBe('150')
    expect(svg.textContent).toContain('bar-chart')
  })
})
