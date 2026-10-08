/**
 * Schema and defaults for tls.m.logo — one logo, fitted inside a fixed height, never cropped.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  image: { type: { kind: 'image' }, role: 'content', label: 'Logo', required: true },
  alt: { type: { kind: 'text', maxChars: 80 }, role: 'content', label: 'Alt text', required: true, guidance: 'The brand name.' },
  ratio: {
    type: { kind: 'number', min: 0.2, max: 8 },
    role: 'option',
    label: 'Aspect ratio',
    help: 'Width / height of the logo file. Needed for align and plate; read from the asset when known.',
  },
  maxHeight: { type: { kind: 'enum', values: ['md', 'sm', 'lg'] }, role: 'option', label: 'Max height' },
  align: { type: { kind: 'enum', values: ['center', 'start', 'end'] }, role: 'option', label: 'Alignment' },
  plate: {
    type: { kind: 'enum', values: ['none', 'surface', 'alt'] },
    role: 'option',
    label: 'Plate',
    help: 'Background plate for logos that need contrast.',
  },
}

export interface LogoProps extends Record<string, unknown> {
  image: string
  alt: string
  ratio?: number
  maxHeight?: 'md' | 'sm' | 'lg'
  align?: 'center' | 'start' | 'end'
  plate?: 'none' | 'surface' | 'alt'
}

export const defaults: LogoProps = {
  image: '',
  alt: 'Partner logo',
  maxHeight: 'md',
  align: 'center',
  plate: 'none',
}
