/**
 * Schema and defaults for tls.t.code — a code snippet or pseudo-code in a monospace panel, with
 * highlighted lines.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  code: {
    type: { kind: 'text', maxChars: 900, multiline: true },
    role: 'content',
    label: 'Code',
    required: true,
    guidance: 'The snippet exactly as in the source, lines separated by new lines, indentation kept; at most 14 lines of at most 60 characters.',
  },
  language: {
    type: { kind: 'text', maxChars: 20 },
    role: 'content',
    label: 'Language',
    guidance: 'Optional label in the corner, e.g. "C++", "Python", "pseudo-code".',
  },
  highlight: {
    type: { kind: 'text', maxChars: 40 },
    role: 'content',
    label: 'Highlighted lines',
    guidance: 'Optional: the lines to point at, 1-based, e.g. "3" or "2, 5-6".',
  },
  caption: {
    type: { kind: 'text', maxChars: 160 },
    role: 'content',
    label: 'Caption',
    guidance: 'Optional: one line on what the code does.',
  },
  lineNumbers: { type: { kind: 'boolean' }, role: 'option', label: 'Line numbers' },
  showCaption: { type: { kind: 'boolean' }, role: 'option', label: 'Show caption', toggles: 'caption' },
}

export interface CodeProps extends Record<string, unknown> {
  code: string
  language?: string
  highlight?: string
  caption?: string
  lineNumbers?: boolean
  showCaption?: boolean
}

export const defaults: CodeProps = {
  code: 'void inorder(Node* t) {\n  if (t == NULL) return;\n  inorder(t->left);\n  visit(t);\n  inorder(t->right);\n}',
  language: 'C++',
  highlight: '4',
  caption: 'In-order traversal: left subtree, node, right subtree',
  lineNumbers: true,
  showCaption: true,
}
