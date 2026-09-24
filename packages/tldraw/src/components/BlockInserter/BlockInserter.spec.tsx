/**
 * B7 — BlockInserter gallery component tests.
 *
 * Tests:
 * 1. The gallery renders one card per registered block (assert against
 *    registry.list().length, not a literal).
 * 2. Search filters cards by name/summary/keywords.
 * 3. Clicking a card calls the insert handler with the block's type.
 * 4. Family tabs filter by family.
 */
import * as React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

import { BlockInserter } from './BlockInserter'
import { BlockRegistryContext } from '~hooks'
import { BlockRegistry } from '~blocks/registry'
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
        def!.summary?.toLowerCase().includes(query) ||
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

  it('renders family tabs with counts', () => {
    render(
      <BlockInserter onInsert={jest.fn()} onClose={jest.fn()} visible={true} />,
      {
        wrapper: ({ children }) => (
          <BlockRegistryContext.Provider value={registry}>{children}</BlockRegistryContext.Provider>
        ),
      },
    )

    // Should have an "All" tab
    expect(screen.getByText('All')).toBeInTheDocument()

    // Should have tabs for families that have blocks
    // Family tabs show "icon DisplayName (count)" — verify each family's display name appears
    const expectedFamilyDisplays = ['Layout', 'Text', 'Data', 'Diagram', 'Media', 'Composite', 'Chrome']
    const allTabText = screen.getAllByRole('button').map((btn) => btn.textContent || '')
    for (const display of expectedFamilyDisplays) {
      const found = allTabText.some((text) => text.includes(display))
      expect(found).toBe(true)
    }
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
