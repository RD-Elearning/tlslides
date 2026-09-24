/**
 * Q19 — `validateDeckSpec`: mechanical validation of a `DeckSpec` against the live block
 * library and slide layouts, producing findings written to be fed straight back to an LLM
 * as a fix instruction (`06-slide-composition.md` §6.7 point 5 / `BACKLOG.md`'s "cheapest
 * quality lever in the entire plan").
 *
 * Hard rule: this module must never throw, and must never recurse forever, no matter how
 * malformed `spec` is — including `null`, `undefined`, a non-object, a cyclic object graph,
 * or a pathologically deep `children` chain. Every check below treats its input as `unknown`
 * at the boundary and degrades to a finding instead of a crash.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`, no network.
 */

import { SLIDE_ASPECT_PRESETS } from '~constants'
import { BUILT_IN_DECK_THEMES, DEFAULT_DECK_THEME } from '~state/shapes/shared/deck-theme'
import { BlockRegistry } from './registry'
import { registerBuiltInBlocks } from './library'
import { SLIDE_LAYOUTS, getSlideLayout, type SlideLayout, type SlideLayoutId } from './slide-layouts'
import { resolveTokens, type DeckTokens } from './tokens'
import type { Box, BlockDefinition, DeckSpec, Paint, ResolvedTokens, SlotSpec } from './types'
import { levenshtein, nearestName } from './nearest-name'
import { tryHexToRgb, relativeLuminance, contrastRatio } from './color-math'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Public types                                                                     */
/* ─────────────────────────────────────────────────────────────────────────────── */

export interface DeckFinding {
  level: 'error' | 'warning'
  /** e.g. 'block/unknown-type', 'slot/missing', 'budget/overflow'. */
  rule: string
  /** Addressable, e.g. 'slides[2].regions.left[0].props.text'. */
  path: string
  /** Written to be fed straight back to an LLM as a fix instruction. */
  message: string
  /** The concrete replacement, when one exists. */
  suggestion?: string
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Default registry                                                                 */
/* ─────────────────────────────────────────────────────────────────────────────── */

let _defaultRegistry: BlockRegistry | undefined

/**
 * A `BlockRegistry` populated from `BUILT_IN_BLOCKS`, built once and memoised. Shared with
 * `capability-digest.ts` so the two Q19 modules always agree on "the library" without either
 * one re-registering 24 blocks per call.
 */
export function defaultBlockRegistry(): BlockRegistry {
  if (!_defaultRegistry) {
    const registry = new BlockRegistry()
    registerBuiltInBlocks(registry)
    _defaultRegistry = registry
  }
  return _defaultRegistry
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Entry point                                                                      */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Validate a `DeckSpec` against Schema v1 (`reviews/blocks/BACKLOG-demo.md` §2.2 /
 * `reviews/blocks/SCHEMA.md`) and the given (or default) block registry.
 *
 * `spec` is typed `DeckSpec` for callers with a well-formed document, but every field is
 * re-checked at runtime — an AI-authored document is exactly the case this function exists
 * to police, and it cannot be trusted to match the type it claims. Malformed input (`null`,
 * `undefined`, a non-object, wrong-typed fields) is handled explicitly rather than assumed
 * away by the type signature.
 */
export function validateDeckSpec(spec: DeckSpec, registry?: BlockRegistry): DeckFinding[] {
  try {
    return validateDeckSpecInner(spec, registry)
  } catch (err) {
    // Last-resort backstop. Every check below is written defensively, but a contract this
    // permissive (arbitrary untrusted JSON) earns a catch-all: a finding beats a crash.
    return [
      {
        level: 'error',
        rule: 'deck/internal-error',
        path: '$',
        message:
          `validateDeckSpec could not fully validate this document: ${errorMessage(err)}. ` +
          `The DeckSpec is too malformed to analyze further — check its overall shape against ` +
          `reviews/blocks/SCHEMA.md.`,
      },
    ]
  }
}

function validateDeckSpecInner(spec: unknown, registry?: BlockRegistry): DeckFinding[] {
  const findings: DeckFinding[] = []
  const reg = registry ?? defaultBlockRegistry()

  if (!isRecord(spec)) {
    findings.push({
      level: 'error',
      rule: 'deck/missing-field',
      path: '$',
      message:
        `DeckSpec is missing or is not an object (got ${describeType(spec)}). A DeckSpec must be ` +
        `a JSON object with "version": 1, "id", "title", "theme", "aspect", and "slides".`,
    })
    return findings
  }

  const s = spec

  if (s.version !== 1) {
    findings.push({
      level: 'error',
      rule: 'deck/version',
      path: 'version',
      message: `DeckSpec.version must be exactly 1; got ${stringifyForMessage(s.version)}. Set "version": 1.`,
    })
  }

  for (const field of ['id', 'title', 'theme', 'aspect', 'slides'] as const) {
    if (s[field] === undefined || s[field] === null) {
      findings.push({
        level: 'error',
        rule: 'deck/missing-field',
        path: field,
        message: `DeckSpec is missing required field "${field}".`,
      })
    }
  }

  // theme
  const themeIds = BUILT_IN_DECK_THEMES.map((t) => t.id)
  if (typeof s.theme === 'string') {
    if (!themeIds.includes(s.theme)) {
      const suggestion = nearestName(s.theme, themeIds)
      findings.push({
        level: 'error',
        rule: 'deck/unknown-theme',
        path: 'theme',
        message:
          `Theme "${s.theme}" is not a known built-in theme.` +
          (suggestion ? ` Did you mean "${suggestion}"?` : '') +
          ` Available themes: ${themeIds.join(', ')}.`,
        suggestion,
      })
    }
  } else if (s.theme !== undefined && s.theme !== null && !isRecord(s.theme)) {
    findings.push({
      level: 'error',
      rule: 'deck/missing-field',
      path: 'theme',
      message: `DeckSpec.theme must be a built-in theme id (string) or a theme object; got ${describeType(
        s.theme
      )}.`,
    })
  }

  // aspect
  if (s.aspect !== undefined && !isValidAspect(s.aspect)) {
    findings.push({
      level: 'error',
      rule: 'deck/invalid-aspect',
      path: 'aspect',
      message:
        `DeckSpec.aspect "${stringifyForMessage(s.aspect)}" is not valid. Use one of ` +
        `"widescreen", "standard", "square", or a [width, height] tuple of numbers.`,
    })
  }
  const frame = resolveFrameForValidation(s.aspect)

  // Tokens used only to read back real region names from each layout's compile() — the
  // *values* inside are irrelevant to validation, only the shape (which keys exist) is.
  const tokens = resolveTokens(DEFAULT_DECK_THEME, isRecord(s.tokens) ? (s.tokens as DeckTokens) : undefined)

  if (s.slides !== undefined && s.slides !== null && !Array.isArray(s.slides)) {
    findings.push({
      level: 'error',
      rule: 'deck/missing-field',
      path: 'slides',
      message: `DeckSpec.slides must be an array of SlideSpec objects; got ${describeType(s.slides)}.`,
    })
  }

  const slides: unknown[] = Array.isArray(s.slides) ? s.slides : []
  const seenSlideIds = new Set<string>()
  const seenBlockIds = new Set<string>()

  slides.forEach((slide, index) => {
    validateSlide(slide, index, frame, tokens, reg, seenSlideIds, seenBlockIds, findings)
  })

  return findings
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Slide-level validation                                                           */
/* ─────────────────────────────────────────────────────────────────────────────── */

function validateSlide(
  slideRaw: unknown,
  index: number,
  frame: { width: number; height: number },
  tokens: ResolvedTokens,
  reg: BlockRegistry,
  seenSlideIds: Set<string>,
  seenBlockIds: Set<string>,
  findings: DeckFinding[]
): void {
  const slidePath = `slides[${index}]`

  if (!isRecord(slideRaw)) {
    findings.push({
      level: 'error',
      rule: 'slide/malformed',
      path: slidePath,
      message: `Slide at index ${index} is missing or is not an object (got ${describeType(slideRaw)}).`,
    })
    return
  }

  const slide = slideRaw
  const slideId = typeof slide.id === 'string' && slide.id.length > 0 ? slide.id : undefined
  const slideLabel = slideId ?? `#${index}`

  if (!slideId) {
    findings.push({
      level: 'error',
      rule: 'deck/missing-field',
      path: `${slidePath}.id`,
      message: `Slide at index ${index} is missing a required "id".`,
    })
  } else {
    if (seenSlideIds.has(slideId)) {
      findings.push({
        level: 'error',
        rule: 'slide/duplicate-id',
        path: `${slidePath}.id`,
        message: `Slide id "${slideId}" is used by more than one slide. Slide ids must be unique across the deck.`,
      })
    }
    seenSlideIds.add(slideId)
  }

  // layout
  const knownLayoutIds = SLIDE_LAYOUTS.map((l) => l.id)
  const layoutId = typeof slide.layout === 'string' ? slide.layout : undefined
  const layout = layoutId ? getSlideLayout(layoutId as SlideLayoutId) : undefined

  if (slide.layout === undefined || slide.layout === null) {
    findings.push({
      level: 'error',
      rule: 'deck/missing-field',
      path: `${slidePath}.layout`,
      message: `Slide "${slideLabel}" is missing a required "layout". Available layouts: ${knownLayoutIds.join(
        ', '
      )}.`,
    })
  } else if (!layoutId) {
    findings.push({
      level: 'error',
      rule: 'slide/malformed',
      path: `${slidePath}.layout`,
      message: `Slide "${slideLabel}"'s "layout" must be a string; got ${describeType(slide.layout)}.`,
    })
  } else if (!layout) {
    const suggestion = nearestName(layoutId, knownLayoutIds)
    findings.push({
      level: 'error',
      rule: 'slide/unknown-layout',
      path: `${slidePath}.layout`,
      message:
        `Layout "${layoutId}" is not a known layout.` +
        (suggestion ? ` Did you mean "${suggestion}"?` : '') +
        ` Available layouts: ${knownLayoutIds.join(', ')}.`,
      suggestion,
    })
  }

  const regionBoxes = layout ? safeCompile(layout, frame, tokens) : undefined
  const knownRegionNames = regionBoxes ? Object.keys(regionBoxes) : []

  // regions
  if (slide.regions !== undefined && !isRecord(slide.regions)) {
    findings.push({
      level: 'error',
      rule: 'slide/malformed',
      path: `${slidePath}.regions`,
      message: `Slide "${slideLabel}"'s "regions" must be an object; got ${describeType(slide.regions)}.`,
    })
  }

  if (isRecord(slide.regions)) {
    for (const [regionName, blocksRaw] of Object.entries(slide.regions)) {
      const regionPath = `${slidePath}.regions.${regionName}`

      if (layout && !knownRegionNames.includes(regionName)) {
        const suggestion = nearestName(regionName, knownRegionNames)
        findings.push({
          level: 'error',
          rule: 'region/unknown',
          path: regionPath,
          message:
            `Region "${regionName}" does not exist in layout "${layoutId}".` +
            (suggestion ? ` Did you mean "${suggestion}"?` : '') +
            ` Available regions: ${knownRegionNames.join(', ')}.`,
          suggestion,
        })
      }

      if (!Array.isArray(blocksRaw)) {
        findings.push({
          level: 'error',
          rule: 'slide/malformed',
          path: regionPath,
          message: `Region "${regionName}" on slide "${slideLabel}" must hold an array of blocks; got ${describeType(
            blocksRaw
          )}.`,
        })
        continue
      }

      blocksRaw.forEach((blockRaw, bi) => {
        validateBlockTree(blockRaw, `${regionPath}[${bi}]`, reg, seenBlockIds, findings, [], [], 1, tokens)
      })
    }
  }

  // free[]
  if (slide.free !== undefined) {
    if (!Array.isArray(slide.free)) {
      findings.push({
        level: 'error',
        rule: 'slide/malformed',
        path: `${slidePath}.free`,
        message: `Slide "${slideLabel}"'s "free" must be an array of placed blocks; got ${describeType(
          slide.free
        )}.`,
      })
    } else {
      if (slide.free.length > 0) {
        findings.push({
          level: 'warning',
          rule: 'free/aspect-risk',
          path: `${slidePath}.free`,
          message:
            `Slide "${slideLabel}" has ${slide.free.length} block(s) in "free[]" with hard pixel ` +
            `coordinates. These are NOT re-laid-out when the deck's "aspect" changes and will be ` +
            `visually misplaced; only "regions" content re-flows safely across an aspect change.`,
        })
      }

      slide.free.forEach((entryRaw, fi) => {
        const freePath = `${slidePath}.free[${fi}]`
        if (!isRecord(entryRaw)) {
          findings.push({
            level: 'error',
            rule: 'block/malformed',
            path: freePath,
            message: `free[${fi}] on slide "${slideLabel}" is missing or is not an object (got ${describeType(
              entryRaw
            )}).`,
          })
          return
        }
        if (!isRecord(entryRaw.box) || !isValidBox(entryRaw.box)) {
          findings.push({
            level: 'error',
            rule: 'block/malformed',
            path: `${freePath}.box`,
            message: `free[${fi}] on slide "${slideLabel}" is missing a "box" with numeric x/y/width/height.`,
          })
        }
        validateBlockTree(entryRaw.block, `${freePath}.block`, reg, seenBlockIds, findings, [], [], 1, tokens)
      })
    }
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Block-tree validation                                                            */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** Findings beyond this depth stop being restated at every deeper level. */
const MAX_NESTING_DEPTH = 6
/** Absolute recursion cutoff — a safety net independent of the depth finding above, so a
 *  pathological (but acyclic) chain can never grow the call stack without bound. */
const HARD_DEPTH_CAP = 200

function validateBlockTree(
  blockRaw: unknown,
  path: string,
  reg: BlockRegistry,
  seenBlockIds: Set<string>,
  findings: DeckFinding[],
  ancestorIds: string[],
  ancestorRefs: unknown[],
  depth: number,
  tokens: ResolvedTokens
): void {
  if (!isRecord(blockRaw)) {
    findings.push({
      level: 'error',
      rule: 'block/malformed',
      path,
      message: `Block at "${path}" is missing or is not an object (got ${describeType(blockRaw)}).`,
    })
    return
  }

  // A real object-reference cycle (e.g. a hand-built, non-JSON BlockSpec where
  // `a.children = [a]`). This check — not the id-based one below — is what actually
  // prevents an infinite loop; ids can be absent or spoofed, object identity cannot.
  if (ancestorRefs.includes(blockRaw)) {
    findings.push({
      level: 'error',
      rule: 'block/cyclic',
      path,
      message: `Block at "${path}" is its own ancestor — "children" forms a cycle. A block tree must be a DAG rooted at the slide; break the cycle.`,
    })
    return
  }

  const block = blockRaw
  const id = typeof block.id === 'string' && block.id.length > 0 ? block.id : undefined
  const label = id ? `"${id}"` : `at "${path}"`

  // A logical cycle expressed in plain JSON: the same id reappears among its own
  // ancestors even though the objects are distinct (e.g. re-serialised/duplicated).
  if (id && ancestorIds.includes(id)) {
    findings.push({
      level: 'error',
      rule: 'block/cyclic',
      path,
      message: `Block id "${id}" at "${path}" reuses an ancestor's id, forming a cycle. Each block in a "children" chain must have a distinct id.`,
    })
    return
  }

  if (id) {
    if (seenBlockIds.has(id)) {
      findings.push({
        level: 'error',
        rule: 'block/duplicate-id',
        path: `${path}.id`,
        message: `Block id "${id}" is used more than once in this deck. Block ids must be unique across the whole deck.`,
      })
    }
    seenBlockIds.add(id)
  } else {
    findings.push({
      level: 'error',
      rule: 'deck/missing-field',
      path: `${path}.id`,
      message: `Block ${label} is missing a required "id".`,
    })
  }

  if (depth > MAX_NESTING_DEPTH) {
    findings.push({
      level: 'error',
      rule: 'block/nesting-depth',
      path,
      message: `Block ${label} is nested ${depth} levels deep; the maximum is ${MAX_NESTING_DEPTH}. Flatten this block tree — move deeply nested content into a sibling region instead.`,
    })
  }

  const type = typeof block.type === 'string' ? block.type : undefined
  let def: BlockDefinition | undefined

  if (block.type === undefined || block.type === null) {
    findings.push({
      level: 'error',
      rule: 'deck/missing-field',
      path: `${path}.type`,
      message: `Block ${label} is missing a required "type".`,
    })
  } else if (!type) {
    findings.push({
      level: 'error',
      rule: 'block/malformed',
      path: `${path}.type`,
      message: `Block ${label}'s "type" must be a string; got ${describeType(block.type)}.`,
    })
  } else {
    def = reg.get(type)
    if (!def) {
      const suggestion = nearestBlockType(type, reg.list())
      findings.push({
        level: 'error',
        rule: 'block/unknown-type',
        path: `${path}.type`,
        message:
          `Block "${type}" is not a known block type.` +
          (suggestion ? ` Did you mean "${suggestion}"?` : '') +
          ` It will not render.`,
        suggestion,
      })
    }
  }

  if (def) {
    validateProps(block.props, def, path, reg, seenBlockIds, findings, ancestorIds, ancestorRefs, depth, tokens)
    validateStyle(block.style, def.type, `${path}.style`, tokens, findings)
  } else if (block.props !== undefined && !isRecord(block.props)) {
    findings.push({
      level: 'error',
      rule: 'block/malformed',
      path: `${path}.props`,
      message: `Block ${label}'s "props" must be an object; got ${describeType(block.props)}.`,
    })
  }

  if (block.children !== undefined) {
    if (!Array.isArray(block.children)) {
      findings.push({
        level: 'error',
        rule: 'block/malformed',
        path: `${path}.children`,
        message: `Block ${label}'s "children" must be an array of blocks; got ${describeType(block.children)}.`,
      })
    } else if (depth <= MAX_NESTING_DEPTH && depth < HARD_DEPTH_CAP) {
      const nextAncestorIds = id ? [...ancestorIds, id] : ancestorIds
      const nextAncestorRefs = [...ancestorRefs, blockRaw]
      block.children.forEach((childRaw, ci) => {
        validateBlockTree(
          childRaw,
          `${path}.children[${ci}]`,
          reg,
          seenBlockIds,
          findings,
          nextAncestorIds,
          nextAncestorRefs,
          depth + 1,
          tokens
        )
      })
    }
    // depth > MAX_NESTING_DEPTH: the finding above already fired; do not descend further.
    // This bounds pathological input (a 10,000-deep chain) to one finding instead of
    // thousands, and keeps this function's own recursion bounded.
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Prop / slot validation                                                           */
/* ─────────────────────────────────────────────────────────────────────────────── */

function validateProps(
  propsRaw: unknown,
  def: BlockDefinition,
  blockPath: string,
  reg: BlockRegistry,
  seenBlockIds: Set<string>,
  findings: DeckFinding[],
  ancestorIds: string[],
  ancestorRefs: unknown[],
  depth: number,
  tokens: ResolvedTokens
): void {
  const schema = def.schema ?? {}
  const slotNames = Object.keys(schema)

  if (propsRaw !== undefined && propsRaw !== null && !isRecord(propsRaw)) {
    findings.push({
      level: 'error',
      rule: 'block/malformed',
      path: `${blockPath}.props`,
      message: `Block "${def.type}" at "${blockPath}" has a "props" field that is not an object (got ${describeType(
        propsRaw
      )}).`,
    })
    return
  }

  const props: Record<string, unknown> = isRecord(propsRaw) ? propsRaw : {}

  for (const [slotName, slotSpec] of Object.entries(schema)) {
    const value = props[slotName]
    if (slotSpec.required && isEmptyValue(value)) {
      findings.push({
        level: 'error',
        rule: 'slot/missing',
        path: `${blockPath}.props.${slotName}`,
        message:
          `Block "${def.type}" is missing its required "${slotName}" slot (${slotSpec.label}).` +
          (slotSpec.guidance ? ` ${slotSpec.guidance}` : ''),
      })
      continue
    }
    if (value !== undefined && value !== null) {
      checkBudget(value, slotSpec, `${blockPath}.props.${slotName}`, def.type, slotName, findings)

      // For `blocks`-kind slots, recurse into each child block via validateBlockTree.
      // This mirrors how the layout engine reads props.children (not the top-level BlockSpec.children).
      if (slotSpec.type.kind === 'blocks' && Array.isArray(value)) {
        const nextAncestorIds = typeof props.id === 'string' && props.id.length > 0 ? [...ancestorIds, props.id] : ancestorIds
        const nextAncestorRefs = [...ancestorRefs, propsRaw]
        value.forEach((childRaw, ci) => {
          validateBlockTree(
            childRaw,
            `${blockPath}.props.${slotName}[${ci}]`,
            reg,
            seenBlockIds,
            findings,
            nextAncestorIds,
            nextAncestorRefs,
            depth + 1,
            tokens
          )
        })
      }
    }
  }

  for (const propName of Object.keys(props)) {
    if (!slotNames.includes(propName)) {
      findings.push({
        level: 'warning',
        rule: 'slot/unknown',
        path: `${blockPath}.props.${propName}`,
        message: `Block "${def.type}" has an unknown prop "${propName}" — not declared in its schema. Valid props: ${
          slotNames.length ? slotNames.join(', ') : '(none)'
        }.`,
      })
    }
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Style validation                                                                  */
/* ─────────────────────────────────────────────────────────────────────────────── */

const TEXT_CONTRAST_FLOOR = 4.5

/**
 * The luminance a literal `style.on` is checked against: the block instance's own resolved
 * `style.surface`, not the theme's nominal `tokens.color.surface`. A block with a custom dark
 * gradient and a literal light `on` (correct against its own background) must not be judged
 * against an unrelated colour.
 *
 * The block's own `box` is not available in the linter, so a gradient's representative
 * luminance is the mean of its stops' luminances — deterministic and box-independent.
 */
function resolvedSurfaceBaseline(
  surface: unknown,
  tokens: ResolvedTokens,
): { hex: string; luminance: number } | undefined {
  const nominal = (): { hex: string; luminance: number } | undefined => {
    const hex = tokens.color.surface
    const rgb = tryHexToRgb(hex)
    return rgb ? { hex, luminance: relativeLuminance(rgb) } : undefined
  }

  if (surface === undefined || surface === null) return nominal()

  if (typeof surface === 'string') {
    const hex = tryHexToRgb(surface)
      ? surface
      : (tokens.color[surface as keyof ResolvedTokens['color']] ?? tokens.color.surface)
    const rgb = tryHexToRgb(hex)
    return rgb ? { hex, luminance: relativeLuminance(rgb) } : undefined
  }

  if (!isPaint(surface)) return nominal()

  if (surface.type === 'solid') {
    const rgb = tryHexToRgb(surface.color)
    return rgb ? { hex: surface.color, luminance: relativeLuminance(rgb) } : undefined
  }

  const stops = surface.stops ?? []
  const luminances = stops
    .map((s) => tryHexToRgb(s.color))
    .filter((rgb): rgb is NonNullable<typeof rgb> => rgb !== undefined)
    .map((rgb) => relativeLuminance(rgb))
  if (luminances.length === 0) return undefined
  return {
    hex: stops[0].color,
    luminance: luminances.reduce((a, b) => a + b, 0) / luminances.length,
  }
}

/**
 * Validate a block's `style` override.
 *
 * Rules:
 * - A literal hex `on` colour whose contrast against the block's own resolved `surface` is
 *   below 4.5:1 → warning (`style/low-contrast-on`). The hex is respected as-is (never
 *   silently replaced), but the user is warned.
 * - A gradient `surface` with fewer than 2 stops → error (`style/gradient-few-stops`).
 */
function validateStyle(
  style: unknown,
  blockType: string,
  path: string,
  tokens: ResolvedTokens,
  findings: DeckFinding[],
): void {
  if (!isRecord(style)) return

  // --- `on` contrast check ---
  const on = style.on
  if (typeof on === 'string' && on.length > 0) {
    // Only check literal hex values (not role names).
    const rgb = tryHexToRgb(on)
    if (rgb) {
      // Baseline: the instance's *own* resolved surface, not the theme's nominal one.
      const baseline = resolvedSurfaceBaseline(style.surface, tokens)
      if (baseline) {
        const onLum = relativeLuminance(rgb)
        const ratio = contrastRatio(onLum, baseline.luminance)
        if (ratio < TEXT_CONTRAST_FLOOR) {
          findings.push({
            level: 'warning',
            rule: 'style/low-contrast-on',
            path: `${path}.on`,
            message:
              `Block "${blockType}" has style.on = "${on}" with a contrast ratio of ` +
              `${ratio.toFixed(2)}:1 against the block's resolved surface (${baseline.hex}), ` +
              `below the ${TEXT_CONTRAST_FLOOR}:1 minimum for readable text. ` +
              `The colour is honoured as-is; consider a darker or lighter value.`,
          })
        }
      }
    }
  }

  // --- gradient stops check ---
  const surface = style.surface
  if (isPaint(surface) && surface.type !== 'solid') {
    if (!surface.stops || surface.stops.length < 2) {
      findings.push({
        level: 'error',
        rule: 'style/gradient-few-stops',
        path: `${path}.surface`,
        message:
          `Block "${blockType}" has a gradient style.surface with ` +
          `${surface.stops?.length ?? 0} stop(s); a gradient must have at least 2 stops.`,
      })
    }
  }
}

function isPaint(value: unknown): value is Paint {
  return (
    isRecord(value) &&
    (value.type === 'solid' || value.type === 'linearGradient' || value.type === 'radialGradient')
  )
}

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string' && value.trim() === '') return true
  if (Array.isArray(value) && value.length === 0) return true
  return false
}

function checkBudget(
  value: unknown,
  slotSpec: SlotSpec,
  path: string,
  blockType: string,
  slotName: string,
  findings: DeckFinding[]
): void {
  const slotType = slotSpec.type

  switch (slotType.kind) {
    case 'text': {
      if (typeof value === 'string' && slotType.maxChars !== undefined && value.length > slotType.maxChars) {
        pushOverflow(findings, path, blockType, slotName, value.length, slotType.maxChars, 'characters')
      }
      break
    }
    case 'richText': {
      const len = richTextLength(value)
      if (len !== undefined && slotType.maxChars !== undefined && len > slotType.maxChars) {
        pushOverflow(findings, path, blockType, slotName, len, slotType.maxChars, 'characters')
      }
      break
    }
    case 'number': {
      if (typeof value === 'number' && Number.isFinite(value)) {
        if (slotType.max !== undefined && value > slotType.max) {
          findings.push({
            level: 'error',
            rule: 'budget/overflow',
            path,
            message: `Block "${blockType}"'s "${slotName}" is ${value}, ${value - slotType.max} over the maximum of ${
              slotType.max
            }.`,
          })
        }
        if (slotType.min !== undefined && value < slotType.min) {
          findings.push({
            level: 'error',
            rule: 'budget/overflow',
            path,
            message: `Block "${blockType}"'s "${slotName}" is ${value}, ${
              slotType.min - value
            } under the minimum of ${slotType.min}.`,
          })
        }
      }
      break
    }
    case 'list': {
      if (Array.isArray(value)) {
        if (slotType.max !== undefined && value.length > slotType.max) {
          pushOverflow(findings, path, blockType, slotName, value.length, slotType.max, 'items')
        }
        if (slotType.min !== undefined && value.length < slotType.min) {
          findings.push({
            level: 'error',
            rule: 'budget/overflow',
            path,
            message: `Block "${blockType}"'s "${slotName}" has ${value.length} item(s), ${
              slotType.min - value.length
            } short of the required minimum of ${slotType.min}.`,
          })
        }
      }
      break
    }
    case 'blocks': {
      if (Array.isArray(value)) {
        if (slotType.max !== undefined && value.length > slotType.max) {
          findings.push({
            level: 'warning',
            rule: 'slot/over-max',
            path,
            message: `Block "${blockType}"'s "${slotName}" slot accepts at most ${slotType.max} child(ren); ${value.length} given.`,
          })
        }
        if (slotType.min !== undefined && value.length < slotType.min) {
          findings.push({
            level: 'warning',
            rule: 'slot/under-min',
            path,
            message: `Block "${blockType}"'s "${slotName}" slot requires at least ${slotType.min} child(ren); ${value.length} given.`,
          })
        }
      } else if (value !== undefined && value !== null) {
        findings.push({
          level: 'error',
          rule: 'block/malformed',
          path,
          message: `Block "${blockType}"'s "${slotName}" slot must be an array of blocks; got ${describeType(value)}.`,
        })
      }
      break
    }
    case 'series': {
      if (Array.isArray(value) && slotType.max !== undefined && value.length > slotType.max) {
        pushOverflow(findings, path, blockType, slotName, value.length, slotType.max, 'series values')
      }
      break
    }
    case 'enum': {
      if (typeof value === 'string' && !slotType.values.includes(value)) {
        findings.push({
          level: 'warning',
          rule: 'slot/invalid-enum',
          path,
          message: `Block "${blockType}"'s "${slotName}" is "${value}", which is not one of: ${slotType.values.join(
            ', '
          )}.`,
        })
      }
      break
    }
    default:
      break
  }
}

function pushOverflow(
  findings: DeckFinding[],
  path: string,
  blockType: string,
  slotName: string,
  actual: number,
  budget: number,
  unit: string
): void {
  const over = actual - budget
  findings.push({
    level: 'error',
    rule: 'budget/overflow',
    path,
    message: `Block "${blockType}"'s "${slotName}" is ${actual} ${unit}, ${over} over the ${budget}-${
      unit === 'characters' ? 'char' : unit === 'items' ? 'item' : unit
    } budget. Reduce it by at least ${over}.`,
  })
}

function richTextLength(value: unknown): number | undefined {
  if (typeof value === 'string') return value.length
  if (isRecord(value) && Array.isArray(value.runs)) {
    return value.runs.reduce((sum: number, run: unknown) => {
      if (isRecord(run) && typeof run.text === 'string') return sum + run.text.length
      return sum
    }, 0)
  }
  return undefined
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Frame / box helpers                                                              */
/* ─────────────────────────────────────────────────────────────────────────────── */

function isValidAspect(aspect: unknown): boolean {
  if (typeof aspect === 'string') return aspect in SLIDE_ASPECT_PRESETS
  if (Array.isArray(aspect) && aspect.length === 2) {
    return typeof aspect[0] === 'number' && typeof aspect[1] === 'number'
  }
  return false
}

function resolveFrameForValidation(aspect: unknown): { width: number; height: number } {
  if (typeof aspect === 'string' && aspect in SLIDE_ASPECT_PRESETS) {
    const [w, h] = SLIDE_ASPECT_PRESETS[aspect as keyof typeof SLIDE_ASPECT_PRESETS]
    return { width: w, height: h }
  }
  if (Array.isArray(aspect) && aspect.length === 2 && typeof aspect[0] === 'number' && typeof aspect[1] === 'number') {
    return { width: aspect[0], height: aspect[1] }
  }
  const [w, h] = SLIDE_ASPECT_PRESETS.widescreen
  return { width: w, height: h }
}

function isValidBox(box: Record<string, unknown>): boolean {
  return (
    typeof box.x === 'number' &&
    typeof box.y === 'number' &&
    typeof box.width === 'number' &&
    typeof box.height === 'number'
  )
}

function safeCompile(
  layout: SlideLayout,
  frame: { width: number; height: number },
  tokens: ResolvedTokens
): Record<string, Box> | undefined {
  try {
    return layout.compile(frame, tokens)
  } catch {
    // A layout's compile() is documented as pure geometry with no throw path; this guard
    // exists only so a future regression there degrades region checking, not this function.
    return undefined
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Nearest-name suggestion                                                          */
/* ─────────────────────────────────────────────────────────────────────────────── */
//
/** Nearest block type by edit distance over both the type id and its declared keywords, so a
 *  bare keyword ("titel") matches as well as a typo'd namespaced id ("tls.t.titel"). */
function nearestBlockType(target: string, defs: BlockDefinition[]): string | undefined {
  if (!target || defs.length === 0) return undefined
  const lowerTarget = target.toLowerCase()
  let best: string | undefined
  let bestDistance = Infinity

  for (const def of defs) {
    const typeDistance = levenshtein(lowerTarget, def.type.toLowerCase())
    const keywordDistance = def.keywords.length
      ? Math.min(...def.keywords.map((kw) => levenshtein(lowerTarget, kw.toLowerCase()) + 1))
      : Infinity
    const distance = Math.min(typeDistance, keywordDistance)
    if (distance < bestDistance) {
      bestDistance = distance
      best = def.type
    }
  }

  if (best === undefined) return undefined
  const threshold = Math.max(3, Math.ceil(target.length / 2))
  return bestDistance <= threshold ? best : undefined
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Small formatting helpers                                                         */
/* ─────────────────────────────────────────────────────────────────────────────── */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function describeType(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

function stringifyForMessage(value: unknown): string {
  if (value === undefined) return 'undefined'
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
