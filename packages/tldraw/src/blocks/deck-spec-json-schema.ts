/**
 * R7 — `deckSpecJsonSchema(registry)`: a JSON Schema draft-2020-12 for `DeckSpec`
 * with block `props` discriminated by `type`, generated from each block's `SlotSpec`s.
 *
 * Exported for the backend; the Next.js mock serves it at `GET /api/schema`.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`, no network.
 */

import type { BlockRegistry } from './registry'
import { defaultBlockRegistry } from './validate-deck-spec'
import { SLIDE_LAYOUTS } from './slide-layouts'
import { BUILT_IN_DECK_THEMES } from '~state/shapes/shared/deck-theme'
import type { SlotSpec, SlotType } from './types'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Public API                                                                      */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Generate a JSON Schema draft-2020-12 for `DeckSpec`, with block `props`
 * discriminated by the block's `type` field.
 */
export function deckSpecJsonSchema(registry?: BlockRegistry): Record<string, unknown> {
  const reg = registry ?? defaultBlockRegistry()
  const defs = reg.list()

  // Build per-block props schemas
  const blockTypeSchemas: Record<string, unknown>[] = []
  for (const def of defs) {
    const propsSchema = slotSchemaToProps(def.schema ?? {})
    blockTypeSchemas.push({
      type: 'object',
      properties: {
        id: { type: 'string' },
        type: { const: def.type },
        props: propsSchema,
        ...(def.kind === 'html' ? {} : {}),
      },
      required: ['id', 'type'],
    })
  }

  const themeIds = BUILT_IN_DECK_THEMES.map((t) => t.id)
  const layoutIds = SLIDE_LAYOUTS.map((l) => l.id)

  const schema: Record<string, unknown> = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://tlslides.dev/schemas/deck-spec.json',
    title: 'DeckSpec',
    description: 'A complete deck specification: an ordered array of slides plus theme/metadata.',
    type: 'object',
    required: ['version', 'id', 'title', 'theme', 'aspect', 'slides'],
    properties: {
      version: { const: 1 },
      id: { type: 'string', description: 'Document ID.' },
      title: { type: 'string', description: 'Deck title.' },
      theme: {
        oneOf: [
          { type: 'string', enum: themeIds, description: 'A built-in theme id.' },
          { type: 'object', description: 'A full DeckTheme object (brand kit).' },
        ],
      },
      aspect: {
        oneOf: [
          { type: 'string', enum: ['widescreen', 'standard', 'square'] },
          { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
        ],
      },
      tokens: { type: 'object', description: 'Optional design token overrides.' },
      masters: {
        type: 'array',
        items: { type: 'object' },
        description: 'Reusable master templates.',
      },
      slides: {
        type: 'array',
        items: slideSchema(reg, blockTypeSchemas, layoutIds),
      },
    },
    additionalProperties: false,
  }

  return schema
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Internal helpers                                                                */
/* ─────────────────────────────────────────────────────────────────────────────── */

function slideSchema(
  _reg: BlockRegistry,
  blockTypeSchemas: Record<string, unknown>[],
  layoutIds: string[]
): Record<string, unknown> {
  return {
    type: 'object',
    required: ['id', 'layout', 'regions'],
    properties: {
      id: { type: 'string' },
      layout: { type: 'string', enum: layoutIds },
      role: { type: 'string', enum: ['cover', 'section', 'content', 'closing'] },
      rhythm: { type: 'string', enum: ['anchor', 'dense', 'breath'] },
      regions: {
        type: 'object',
        additionalProperties: {
          type: 'array',
          items: blockSchema(blockTypeSchemas),
        },
      },
      free: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            block: blockSchema(blockTypeSchemas),
            box: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                width: { type: 'number' },
                height: { type: 'number' },
              },
              required: ['x', 'y', 'width', 'height'],
            },
          },
          required: ['block', 'box'],
        },
      },
      background: { type: 'object', description: 'Slide background override.' },
      notes: { type: 'string', description: 'Speaker notes.' },
      skip: { type: 'boolean' },
      masterId: { type: 'string' },
    },
    additionalProperties: false,
  }
}

/**
 * The schema for one block node, discriminating on `type` via `oneOf` over the per-type
 * schemas built by `deckSpecJsonSchema`. This is the core of the FastAPI/LLM structured-output
 * contract: an unknown `type`, or props that do not satisfy the type's own slot schema, is
 * rejected by the schema itself. `children` recurses (bounded, so the in-memory schema object
 * stays acyclic and JSON-serializable).
 *
 * Deliberately **no** permissive fallback for unknown types: forward-compat is handled by
 * regenerating the schema from the registry, not by accepting arbitrary types (a fabricated
 * block type must be a validation failure).
 */
function blockSchema(
  blockTypeSchemas: Record<string, unknown>[],
  depth = 0,
): Record<string, unknown> {
  const childrenItems: Record<string, unknown> =
    depth < MAX_BLOCK_NESTING_DEPTH ? blockSchema(blockTypeSchemas, depth + 1) : { type: 'object' }

  return {
    type: 'object',
    required: ['id', 'type'],
    properties: {
      id: { type: 'string' },
      type: { type: 'string' },
      props: { type: 'object', description: 'Type-specific props (see the matching oneOf branch).' },
      style: { type: 'object', description: 'BlockStyleSpec overrides.' },
      motion: { type: 'object', description: 'BlockMotionSpec overrides.' },
      children: {
        type: 'array',
        items: childrenItems,
        description: 'Child blocks (container blocks only).',
      },
      slot: { type: 'string' },
    },
    additionalProperties: false,
    oneOf: blockTypeSchemas,
  }
}

/** Keeps the recursive `children` schema finite (and the object graph acyclic). */
const MAX_BLOCK_NESTING_DEPTH = 4

/* ─────────────────────────────────────────────────────────────────────────────── */
/* SlotSpec → JSON Schema                                                          */
/* ─────────────────────────────────────────────────────────────────────────────── */

function slotSchemaToProps(schema: Record<string, SlotSpec>): Record<string, unknown> {
  const props: Record<string, unknown> = {}
  const required: string[] = []

  for (const [name, slot] of Object.entries(schema)) {
    props[name] = slotTypeToSchema(slot.type)
    if (slot.required) required.push(name)
  }

  const result: Record<string, unknown> = {
    type: 'object',
    properties: props,
  }
  if (required.length > 0) {
    result.required = required
  }
  return result
}

function slotTypeToSchema(type: SlotType): Record<string, unknown> {
  switch (type.kind) {
    case 'text':
      return { type: 'string', ...(type.maxChars !== undefined ? { maxLength: type.maxChars } : {}) }
    case 'richText':
      return {
        oneOf: [
          { type: 'string', ...(type.maxChars !== undefined ? { maxLength: type.maxChars } : {}) },
          {
            type: 'object',
            properties: {
              runs: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    text: { type: 'string' },
                    bold: { type: 'boolean' },
                    italic: { type: 'boolean' },
                    color: { type: 'string' },
                    size: { type: 'number' },
                  },
                },
              },
            },
          },
        ],
      }
    case 'number': {
      const schema: Record<string, unknown> = { type: 'number' }
      if (type.min !== undefined) schema.minimum = type.min
      if (type.max !== undefined) schema.maximum = type.max
      return schema
    }
    case 'enum':
      return { type: 'string', enum: type.values }
    case 'boolean':
      return { type: 'boolean' }
    case 'color':
      return { type: 'string', description: 'ColorRole or literal hex — never a bare value.' }
    case 'icon':
      return { type: 'string', description: 'Icon id resolved via ctx.icon().' }
    case 'image':
      return { type: 'string', description: 'Image asset id or URL.' }
    case 'list':
      return {
        type: 'array',
        items: slotTypeToSchema(type.of),
        ...(type.min !== undefined ? { minItems: type.min } : {}),
        ...(type.max !== undefined ? { maxItems: type.max } : {}),
      }
    case 'object': {
      const fields: Record<string, unknown> = {}
      const fieldRequired: string[] = []
      for (const [fn, fs] of Object.entries(type.fields)) {
        fields[fn] = slotTypeToSchema(fs.type)
        if (fs.required) fieldRequired.push(fn)
      }
      const objSchema: Record<string, unknown> = { type: 'object', properties: fields }
      if (fieldRequired.length > 0) objSchema.required = fieldRequired
      return objSchema
    }
    case 'series':
      return {
        type: 'array',
        items: { type: 'number' },
        ...(type.max !== undefined ? { maxItems: type.max } : {}),
        description: 'Numeric series values.',
      }
    case 'blocks':
      return {
        type: 'array',
        items: { type: 'object', properties: { id: { type: 'string' }, type: { type: 'string' } } },
        ...(type.min !== undefined ? { minItems: type.min } : {}),
        ...(type.max !== undefined ? { maxItems: type.max } : {}),
      }
    default:
      return { type: 'object' }
  }
}
