import * as React from 'react'
import { render } from '@testing-library/react'
import { renderFieldForSpec } from './FieldControls'
import { DEFAULT_MESSAGES, MessagesContext } from '../../../hooks/useMessages'
import type { SlotSpec } from '../../../blocks/types'

const spec = {
  label: 'Items',
  type: { kind: 'list', of: { kind: 'object', fields: { title: { label: 'Title', type: { kind: 'text' } }, tone: { label: 'Tone', type: { kind: 'enum', values: ['solid'] } } } } },
} as unknown as SlotSpec

describe('editor E08 — nested inspector fields in the host language', () => {
  it('defaults stay English', () => {
    const { getByText } = render(<>{renderFieldForSpec(spec, [{ title: 'a', tone: 'solid' }], 'items', () => undefined)}</>)
    expect(getByText('+ Add')).toBeTruthy()
    expect(getByText('Title')).toBeTruthy()
  })

  it('host messages and labels reach nested fields, buttons and enum values', () => {
    const value = {
      messages: { ...DEFAULT_MESSAGES, 'field.add': '+ Thêm', 'field.moveUp': 'Lên trên' },
      labels: {
        field: (_t: string, p: string, l: string) => (p.endsWith('.title') ? 'Tiêu đề' : l),
        option: (_t: string, _s: string, v: string) => (v === 'solid' ? 'Nền đậm' : undefined),
      },
    }
    const { getByText, getByTitle } = render(
      <MessagesContext.Provider value={value}>{renderFieldForSpec(spec, [{ title: 'a', tone: 'solid' }], 'items', () => undefined)}</MessagesContext.Provider>
    )
    expect(getByText('+ Thêm')).toBeTruthy()
    expect(getByText('Tiêu đề')).toBeTruthy()
    expect(getByText('Nền đậm')).toBeTruthy()
    expect(getByTitle('Lên trên')).toBeTruthy()
  })
})
