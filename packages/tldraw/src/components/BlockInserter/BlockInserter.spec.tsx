/**
 * B7 — BlockInserter gallery component tests.
 *
 * Tests:
 * 1. The gallery renders one card per registered block (assert against
 *    registry.list().length, not a literal).
 * 2. Search filters cards by name/summary/keywords.
 * 3. Clicking a card calls the insert handler with the block's type.
 * 4. Category tabs (with counts, empty ones hidden) filter by category; a family filter
 *    stays in the search row; cards show shortDescription and a scope badge.
 */
import * as React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

import { BlockInserter } from './BlockInserter'
import { BlockRegistryContext } from '~hooks'
import { BlockRegistry } from '~blocks/registry'
import { CATEGORY_INFO } from '~blocks/types'
import { registerBuiltInBlocks } from '~blocks/library'

const registry = new BlockRegistry()
registerBuiltInBlocks(registry)

const allBlockCount = registry.list().length

describe('BlockInserter gallery', () => {
  beforeEach(() => {
    cleanup()
  })

  it('renders one card per registered block', () => {
    const onInsert = jest.fn()
    const onClose = jest.fn()

    render(
      <BlockInserter onInsert={onInsert} onClose={onClose} visible={true} />,
      {
        wrapper: ({ children }) => (
          <BlockRegistryContext.Provider value={registry}>{children}</BlockRegistryContext.Provider>
        ),
      },
    )

    const cards = screen.getAllByTestId('block-card')
    expect(cards).toHaveLength(allBlockCount)

    // Each card should have the block type as a data attribute
    const cardTypes = cards.map((c) => c.getAttribute('data-block-type'))
    expect(cardTypes).toEqual(expect.arrayContaining(registry.list().map((d) => d.type)))
  })

  it('filters cards by search query', () => {
    render(
      <BlockInserter onInsert={jest.fn()} onClose={jest.fn()} visible={true} />,
      {
        wrapper: ({ children }) => (
          <BlockRegistryContext.Provider value={registry}>{children}</BlockRegistryContext.Provider>
        ),
      },
    )

    const searchInput = screen.getByPlaceholderText('Search blocks...')
    fireEvent.change(searchInput, { target: { value: 'Title' } })

    const cards = screen.getAllByTestId('block-card')
    expect(cards.length).toBeGreaterThan(0)
    expect(cards.length).toBeLessThan(allBlockCount)

    // All visible cards should match the search query
    const cardTypes = cards.map((c) => c.getAttribute('data-block-type'))
    for (const type of cardTypes) {
      const def = registry.get(type as string)
      const query = 'title'
      const matches =
        def!.name.toLowerCase().includes(query) ||
        def!.shortDescription?.toLowerCase().includes(query) ||
        def!.keywords?.some((k) => k.toLowerCase().includes(query))
      expect(matches).toBe(true)
    }
  })

  it('calls onInsert with the block type when a card is clicked', () => {
    const onInsert = jest.fn()
    render(
      <BlockInserter onInsert={onInsert} onClose={jest.fn()} visible={true} />,
      {
        wrapper: ({ children }) => (
          <BlockRegistryContext.Provider value={registry}>{children}</BlockRegistryContext.Provider>
        ),
      },
    )

    const cards = screen.getAllByTestId('block-card')
    const firstCard = cards[0]
    const blockType = firstCard.getAttribute('data-block-type')

    fireEvent.click(firstCard)

    expect(onInsert).toHaveBeenCalledWith(blockType)
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BlockRegistryContext.Provider value={registry}>{children}</BlockRegistryContext.Provider>
  )

  it('renders category tabs with counts and hides empty categories', () => {
    render(<BlockInserter onInsert={jest.fn()} onClose={jest.fn()} visible={true} />, { wrapper })

    expect(screen.getByText('All')).toBeInTheDocument()

    const grouped = registry.listByCategory()
    const tabText = screen.getAllByRole('button').map((btn) => btn.textContent || '')
    for (const [category, defs] of grouped) {
      expect(tabText).toContain(`${CATEGORY_INFO[category].label} (${defs.length})`)
    }
    // A category with no blocks has no tab (no timeline blocks exist yet).
    expect(grouped.has('timeline')).toBe(false)
    expect(tabText.some((t) => t.startsWith('Timeline'))).toBe(false)
    // The old family tabs are gone.
    expect(tabText.some((t) => /^\S?\s?Composite \(/.test(t))).toBe(false)
  })

  it('a category tab shows only that category', () => {
    render(<BlockInserter onInsert={jest.fn()} onClose={jest.fn()} visible={true} />, { wrapper })
    const metrics = registry.listByCategory().get('metric')!
    fireEvent.click(screen.getByText(`Metrics (${metrics.length})`))

    const types = screen.getAllByTestId('block-card').map((c) => c.getAttribute('data-block-type'))
    expect(types.sort()).toEqual(metrics.map((d) => d.type).sort())

    fireEvent.click(screen.getByText('All'))
    expect(screen.getAllByTestId('block-card')).toHaveLength(allBlockCount)
  })

  it('the family filter narrows the list and combines with a category tab', () => {
    render(<BlockInserter onInsert={jest.fn()} onClose={jest.fn()} visible={true} />, { wrapper })
    fireEvent.change(screen.getByLabelText('Filter by family'), { target: { value: 'text' } })

    const expected = registry.list().filter((d) => d.family === 'text')
    expect(screen.getAllByTestId('block-card')).toHaveLength(expected.length)

    const textMetrics = expected.filter((d) => d.category === 'metric')
    fireEvent.click(screen.getByText(/^Metrics \(/))
    expect(screen.getAllByTestId('block-card')).toHaveLength(textMetrics.length)
  })

  it('search matches shortDescription', () => {
    render(<BlockInserter onInsert={jest.fn()} onClose={jest.fn()} visible={true} />, { wrapper })
    fireEvent.change(screen.getByPlaceholderText('Search blocks...'), { target: { value: 'eyebrow' } })
    const types = screen.getAllByTestId('block-card').map((c) => c.getAttribute('data-block-type'))
    expect(types).toContain('tls.t.kicker')
  })

  it('cards show shortDescription as subtitle and a scope badge for slide and group blocks only', () => {
    render(<BlockInserter onInsert={jest.fn()} onClose={jest.fn()} visible={true} />, { wrapper })
    const hero = screen.getAllByTestId('block-card').find((c) => c.getAttribute('data-block-type') === 'tls.c.hero')!
    expect(hero).toHaveTextContent(registry.get('tls.c.hero')!.shortDescription!)
    expect(hero.querySelector('[data-testid="scope-badge"]')).toHaveTextContent('Slide')

    const kpiRow = screen.getAllByTestId('block-card').find((c) => c.getAttribute('data-block-type') === 'tls.c.kpi-row')!
    expect(kpiRow.querySelector('[data-testid="scope-badge"]')).toHaveTextContent('Group')

    const title = screen.getAllByTestId('block-card').find((c) => c.getAttribute('data-block-type') === 'tls.t.title')!
    expect(title.querySelector('[data-testid="scope-badge"]')).toBeNull()
  })

  it('shows no results message when search returns nothing', () => {
    render(
      <BlockInserter onInsert={jest.fn()} onClose={jest.fn()} visible={true} />,
      {
        wrapper: ({ children }) => (
          <BlockRegistryContext.Provider value={registry}>{children}</BlockRegistryContext.Provider>
        ),
      },
    )

    const searchInput = screen.getByPlaceholderText('Search blocks...')
    fireEvent.change(searchInput, { target: { value: 'xyznonexistentblock' } })

    expect(screen.getByText(/No blocks match/)).toBeInTheDocument()
  })

  it('closes the gallery when Escape is pressed', () => {
    const onClose = jest.fn()
    render(
      <BlockInserter onInsert={jest.fn()} onClose={onClose} visible={true} />,
      {
        wrapper: ({ children }) => (
          <BlockRegistryContext.Provider value={registry}>{children}</BlockRegistryContext.Provider>
        ),
      },
    )

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalled()
  })

  it('closes the gallery when clicking outside', () => {
    const onClose = jest.fn()
    render(
      <BlockInserter onInsert={jest.fn()} onClose={onClose} visible={true} />,
      {
        wrapper: ({ children }) => (
          <BlockRegistryContext.Provider value={registry}>{children}</BlockRegistryContext.Provider>
        ),
      },
    )

    // Click outside the inserter
    fireEvent.mouseDown(document.body)

    expect(onClose).toHaveBeenCalled()
  })
})
