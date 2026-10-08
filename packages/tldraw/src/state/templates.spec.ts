import { BUILT_IN_TEMPLATES, buildTemplateShapes, getTemplate } from './templates'
import { BUILT_IN_DECK_THEMES } from './shapes/shared/deck-theme'
import { TDShapeType } from '~types'

describe('BUILT_IN_TEMPLATES — the starter pack', () => {
  it('ships the twelve layouts the brief asks for', () => {
    expect(BUILT_IN_TEMPLATES.length).toBe(12)
    const ids = new Set(BUILT_IN_TEMPLATES.map((t) => t.id))
    expect(ids.size).toBe(BUILT_IN_TEMPLATES.length)
  })

  it('every template is plain, serializable JSON — no functions, no class instances', () => {
    for (const template of BUILT_IN_TEMPLATES) {
      const roundTripped = JSON.parse(JSON.stringify(template))
      expect(roundTripped).toEqual(template)
    }
  })

  it('every template targets the 1920×1080 frame', () => {
    for (const template of BUILT_IN_TEMPLATES) {
      expect(template.size).toEqual([1920, 1080])
    }
  })

  it('every template sets an explicit, tokenized background — not "leave it to the UI theme"', () => {
    for (const template of BUILT_IN_TEMPLATES) {
      expect(template.background).toBeDefined()
    }
  })

  it('every colour a template shape sets is a theme token, never a literal hex', () => {
    for (const template of BUILT_IN_TEMPLATES) {
      for (const shape of template.shapes) {
        if (shape.style.stroke) expect(shape.style.stroke.startsWith('theme:')).toBe(true)
        if (shape.style.fill) expect(shape.style.fill.startsWith('theme:')).toBe(true)
      }
    }
  })

  it('every template shape leaves font unset, for buildTemplateShapes to assign', () => {
    for (const template of BUILT_IN_TEMPLATES) {
      for (const shape of template.shapes) {
        expect(shape.style.font).toBeUndefined()
      }
    }
  })

  it('has at least one fillable (slotted) shape per template', () => {
    for (const template of BUILT_IN_TEMPLATES) {
      expect(template.shapes.some((s) => s.slot !== undefined)).toBe(true)
    }
  })
})

describe('getTemplate', () => {
  it('finds a built-in template by id', () => {
    expect(getTemplate('title')?.name).toBe('Title')
  })

  it('returns undefined for an unknown id', () => {
    expect(getTemplate('does-not-exist')).toBeUndefined()
  })
})

describe('buildTemplateShapes', () => {
  const theme = BUILT_IN_DECK_THEMES[0]
  const template = getTemplate('bullets')!

  it('gives every shape a fresh id, scoped to the target page', () => {
    const shapes = buildTemplateShapes(template, undefined, theme, 'page1')
    const ids = new Set(shapes.map((s) => s.id))
    expect(ids.size).toBe(shapes.length)
    for (const shape of shapes) {
      expect(shape.parentId).toBe('page1')
    }
  })

  it('does not alias the template constant — mutating a built shape leaves the template untouched', () => {
    const original = JSON.parse(JSON.stringify(BUILT_IN_TEMPLATES))
    const shapes = buildTemplateShapes(template, undefined, theme, 'page1')
    const rect = shapes.find((s) => s.type === TDShapeType.Ellipse)
    if (rect && 'radius' in rect) {
      (rect.radius as number[])[0] = 9999
    }
    shapes[0].point[0] = 9999
    expect(JSON.parse(JSON.stringify(BUILT_IN_TEMPLATES))).toEqual(original)
  })

  it('assigns the heading font to a "title"-like slot, and body font to everything else', () => {
    const shapes = buildTemplateShapes(template, undefined, theme, 'page1')
    const title = shapes.find((s) => s.slot === 'title')
    const bullet = shapes.find((s) => s.slot === 'bullet1')
    expect(title?.style.font).toBe(theme.fonts.heading)
    expect(bullet?.style.font).toBe(theme.fonts.body)
  })

  it('leaves font unset when no theme is active', () => {
    const shapes = buildTemplateShapes(template, undefined, undefined, 'page1')
    expect(shapes.every((s) => s.style.font === undefined)).toBe(true)
  })

  it('applies the active theme shapeDefaults underneath each shape style', () => {
    const shapes = buildTemplateShapes(template, undefined, theme, 'page1')
    const dot = shapes.find((s) => s.type === TDShapeType.Ellipse)
    expect(dot?.style.cornerRadius).toBe(theme.shapeDefaults?.cornerRadius)
  })

  it('fills matching slot content into text', () => {
    const shapes = buildTemplateShapes(
      template,
      { title: 'Custom Title', bullet1: 'Custom bullet' },
      theme,
      'page1'
    )
    const title = shapes.find((s) => s.slot === 'title')
    const bullet1 = shapes.find((s) => s.slot === 'bullet1')
    expect(title && 'text' in title ? title.text : undefined).toBe('Custom Title')
    expect(bullet1 && 'text' in bullet1 ? bullet1.text : undefined).toBe('Custom bullet')
  })

  it('leaves an unslotted or unmatched shape at its authored default text', () => {
    const shapes = buildTemplateShapes(template, { title: 'Custom Title' }, theme, 'page1')
    const bullet2 = shapes.find((s) => s.slot === 'bullet2')
    const originalBullet2 = template.shapes.find((s) => s.slot === 'bullet2')
    expect(bullet2 && 'text' in bullet2 ? bullet2.text : undefined).toBe(
      originalBullet2 && 'text' in originalBullet2 ? originalBullet2.text : undefined
    )
  })
})
