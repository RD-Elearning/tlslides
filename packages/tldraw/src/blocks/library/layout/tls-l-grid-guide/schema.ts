/**
 * Schema and defaults for tls.l.grid-guide — alignment grid (editorOnly).
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  divisions: {
    kind: 'number',
    min: 2,
    max: 12,
    role: 'option',
    label: 'Divisions',
    help: 'Number of grid divisions on each axis.',
  },
}

export interface GridGuideProps {
  divisions: number
}

export const defaults: GridGuideProps = {
  divisions: 3,
}
