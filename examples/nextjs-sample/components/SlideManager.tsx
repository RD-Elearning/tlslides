'use client'

import * as React from 'react'
import { stopKeyPropagationUnlessEscape } from '@tlslides/tldraw'
import type { DeckSlide, DeckTheme, Template } from '@tlslides/tldraw'

// A few preset solid backgrounds for the "set a background" demo — deliberately not the full
// gradient/image `SlideBackground` union (Editor.tsx passes whatever `{ type: 'solid', color }`
// this panel builds straight to `app.deck.setSlideBackground`, which accepts any `SlideBackground`
// a host constructs; this panel just keeps its own UI to swatches + one free-typed hex field).
const BACKGROUND_SWATCHES = ['#ffffff', '#0f172a', '#fef3c7', '#dbeafe', '#dcfce7', '#fee2e2']

export interface SlideManagerProps {
  slides: DeckSlide[]
  currentSlideId?: string
  /** A live preview of the current slide, from `app.deck.getThumbnail` — `undefined` whenever
   *  that call's own documented limitations mean no image is available yet (e.g. right after a
   *  page switch, before the next deck-change event refreshes it). */
  thumbnail?: string
  themes: DeckTheme[]
  activeThemeId?: string
  templates: Template[]
  onSelectSlide: (id: string) => void
  onAddSlide: () => void
  onAddFromTemplate: (templateId: string) => void
  onMoveSlide: (id: string, toIndex: number) => void
  onDeleteSlide: (id: string) => void
  onSetTheme: (themeId: string) => void
  onSetBackgroundColor: (color: string) => void
  onClearBackground: () => void
}

// This panel is entirely `app.deck.*` from the caller's side (see Editor.tsx) — nothing here
// imports `TldrawApp` or reaches into the canvas. It is the "genuine host-side slide manager" the
// Phase 14 brief asks for: a real list, real reordering, real theme/background controls, not a
// button that happens to call one method.
export function SlideManager({
  slides,
  currentSlideId,
  thumbnail,
  themes,
  activeThemeId,
  templates,
  onSelectSlide,
  onAddSlide,
  onAddFromTemplate,
  onMoveSlide,
  onDeleteSlide,
  onSetTheme,
  onSetBackgroundColor,
  onClearBackground,
}: SlideManagerProps) {
  const [templateChoice, setTemplateChoice] = React.useState(templates[0]?.id ?? '')
  const [hexDraft, setHexDraft] = React.useState('#000000')

  const currentSlide = slides.find((s) => s.id === currentSlideId)
  const currentColor =
    currentSlide?.background?.type === 'solid' ? currentSlide.background.color : undefined

  const commitHex = () => {
    if (/^#[0-9a-fA-F]{6}$/.test(hexDraft)) onSetBackgroundColor(hexDraft)
  }

  return (
    <div style={panelStyle}>
      <section>
        <h3 style={headingStyle}>Slides</h3>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {slides.map((slide, i) => (
            <li key={slide.id}>
              <div
                data-testid="slide-row"
                data-slide-id={slide.id}
                onClick={() => onSelectSlide(slide.id)}
                style={{
                  ...rowStyle,
                  background: slide.id === currentSlideId ? '#e0edff' : '#fff',
                }}
              >
                {slide.id === currentSlideId && thumbnail ? (
                  <img src={thumbnail} alt="" style={{ width: 40, height: 22.5, objectFit: 'cover', border: '1px solid #ccc' }} />
                ) : (
                  <div style={{ width: 40, height: 22.5, border: '1px solid #ccc', background: '#f4f4f4' }} />
                )}
                <span style={{ flex: 1, fontSize: 13 }}>
                  {i + 1}. {slide.name}
                </span>
                <button
                  data-testid="move-up"
                  disabled={i === 0}
                  onClick={(e) => {
                    e.stopPropagation()
                    onMoveSlide(slide.id, i - 1)
                  }}
                >
                  ↑
                </button>
                <button
                  data-testid="move-down"
                  disabled={i === slides.length - 1}
                  onClick={(e) => {
                    e.stopPropagation()
                    onMoveSlide(slide.id, i + 1)
                  }}
                >
                  ↓
                </button>
                <button
                  data-testid="delete-slide"
                  disabled={slides.length <= 1}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteSlide(slide.id)
                  }}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ol>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <button data-testid="add-blank-slide" onClick={onAddSlide}>
            + Blank slide
          </button>
        </div>
      </section>

      <section>
        <h3 style={headingStyle}>Add from template</h3>
        <div style={{ display: 'flex', gap: 6 }}>
          <select
            data-testid="template-select"
            value={templateChoice}
            onChange={(e) => setTemplateChoice(e.target.value)}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button data-testid="add-from-template" onClick={() => onAddFromTemplate(templateChoice)}>
            Add
          </button>
        </div>
      </section>

      <section>
        <h3 style={headingStyle}>Theme</h3>
        <select
          data-testid="theme-select"
          value={activeThemeId ?? ''}
          onChange={(e) => onSetTheme(e.target.value)}
        >
          <option value="">No theme</option>
          {themes.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.name}
            </option>
          ))}
        </select>
      </section>

      <section>
        <h3 style={headingStyle}>Background (current slide)</h3>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          {BACKGROUND_SWATCHES.map((color) => (
            <button
              key={color}
              data-testid={`swatch-${color}`}
              onClick={() => onSetBackgroundColor(color)}
              title={color}
              style={{
                width: 22,
                height: 22,
                background: color,
                border: currentColor === color ? '2px solid #2563eb' : '1px solid #ccc',
                borderRadius: 4,
                padding: 0,
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            data-testid="hex-input"
            value={hexDraft}
            onChange={(e) => setHexDraft(e.target.value)}
            // Every free-typed field a host renders alongside a mounted <Tldraw> needs this — see
            // stopKeyPropagationUnlessEscape's own doc comment. Without it, Tab (typed while
            // moving focus out of this field) reaches the editor's global keydown listener and
            // clones whatever shape happens to be selected on the canvas, even though this input
            // lives entirely outside the editor's own React tree.
            onKeyDown={stopKeyPropagationUnlessEscape}
            onKeyUp={stopKeyPropagationUnlessEscape}
            onBlur={commitHex}
            onKeyDownCapture={(e) => {
              if (e.key === 'Enter') commitHex()
            }}
            style={{ width: 90 }}
          />
          <button data-testid="apply-hex" onClick={commitHex}>
            Apply
          </button>
          <button data-testid="clear-background" onClick={onClearBackground}>
            Clear
          </button>
        </div>
      </section>
    </div>
  )
}

const panelStyle: React.CSSProperties = {
  width: 260,
  flexShrink: 0,
  borderRight: '1px solid #ddd',
  padding: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  overflowY: 'auto',
  fontFamily: 'system-ui, sans-serif',
}

const headingStyle: React.CSSProperties = {
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
  color: '#666',
  margin: '0 0 6px 0',
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 6px',
  border: '1px solid #ddd',
  borderRadius: 4,
  cursor: 'pointer',
}
