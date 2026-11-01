/**
 * Inline Editor — contentEditable overlay for a block's text part.
 * R11 implementation; editor E03: rich runs (bold shows bold, ⌘/Ctrl+B), IME-safe keys, Tab to the
 * next text, `maxChars` / `required` limits that keep the deck saveable, commit on camera moves.
 */

import * as React from 'react'
import { createPortal } from 'react-dom'
import { styled } from '../../styles'
import { normalizeRuns, plainText, toggleBold, type EditRun } from './rich-edit'

export interface InlineEditorProps {
  propPath: string
  /** The text it starts with: plain (pre-E03 callers) or runs. */
  initialValue?: string
  initialRuns?: EditRun[]
  /** The target element's own bounding rect (viewport coordinates), used to position the
   *  overlay exactly on top of the text it is replacing. */
  rect: DOMRect
  style?: InlineEditorStyle
  /** Enter inserts a line break (⌘/Ctrl+Enter commits) instead of committing. */
  multiline?: boolean
  /** The slot's character budget: typing stops there (the engine rejects a longer text). */
  maxChars?: number
  /** An empty value is refused (the engine rejects an empty required slot). */
  required?: boolean
  /** Select the whole text on open (default true). */
  selectAll?: boolean
  /** Hint texts (host-translated). */
  messages?: { required?: string; limit?: (n: number, max: number) => string }
  onSave: (value: string, runs: EditRun[]) => void
  onCancel: () => void
  /** Tab / Shift+Tab: the editor has committed (or cancelled when unchanged); open the next one. */
  onTab?: (dir: 1 | -1) => void
}

/** The edited text's own type, in viewport pixels (`editorStyleOf`). */
export interface InlineEditorStyle {
  size?: number
  color?: string
  family?: string
  weight?: string
  lineHeight?: number
  letterSpacing?: number
  align?: string
}

/**
 * The type of `target` as it appears on screen: its computed style (CSS pixels inside the canvas)
 * times the canvas zoom, which is how much wider the element shows (`rect`) than it is laid out.
 * Before (spro demo T9) the overlay drew every text at the browser's default 16 px over the slide.
 */
export function editorStyleOf(target: HTMLElement, rect: DOMRect): InlineEditorStyle {
  const cs = window.getComputedStyle(target)
  const zoom = target.offsetWidth > 0 ? rect.width / target.offsetWidth : 1
  const px = (v: string) => {
    const n = parseFloat(v)
    return Number.isFinite(n) ? n * zoom : undefined
  }
  return {
    size: px(cs.fontSize),
    color: cs.color,
    family: cs.fontFamily,
    weight: cs.fontWeight,
    lineHeight: px(cs.lineHeight),
    letterSpacing: px(cs.letterSpacing),
    align: cs.textAlign,
  }
}

/* ── DOM <-> runs ─────────────────────────────────────────────────────────────────────────── */

/** Fill `el` with one span per run. Text goes in through `textContent` only: deck content is
 *  untrusted, so it is never parsed as HTML. */
export function writeRuns(el: HTMLElement, runs: EditRun[]): void {
  el.textContent = ''
  for (const r of runs) {
    const parts = r.text.split('\n')
    parts.forEach((part, i) => {
      if (i > 0) el.appendChild(document.createElement('br'))
      if (!part) return
      const span = document.createElement('span')
      span.textContent = part
      if (r.bold) {
        span.dataset.bold = '1'
        span.style.fontWeight = '700'
      }
      if (r.italic) {
        span.dataset.italic = '1'
        span.style.fontStyle = 'italic'
      }
      if (r.color !== undefined) {
        span.dataset.color = r.color
        span.style.color = r.color
      }
      if (r.size !== undefined) {
        span.dataset.size = String(r.size)
        span.style.fontSize = `${r.size}em`
      }
      el.appendChild(span)
    })
  }
}

/** The runs currently in `el` (spans carry their formatting in data attributes). */
export function readRuns(el: HTMLElement): EditRun[] {
  const out: EditRun[] = []
  const fmt = (node: Node): Omit<EditRun, 'text'> => {
    let n: Node | null = node.parentNode
    while (n && n !== el) {
      if (n instanceof HTMLElement && n.tagName === 'SPAN') {
        const d = n.dataset
        const f: Omit<EditRun, 'text'> = {}
        if (d.bold) f.bold = true
        if (d.italic) f.italic = true
        if (d.color !== undefined) f.color = d.color
        if (d.size !== undefined) f.size = Number(d.size)
        return f
      }
      if (n instanceof HTMLElement && (n.tagName === 'B' || n.tagName === 'STRONG')) return { bold: true }
      n = n.parentNode
    }
    return {}
  }
  const walk = (node: Node) => {
    node.childNodes.forEach((c) => {
      if (c.nodeType === 3) out.push({ text: c.textContent ?? '', ...fmt(c) })
      else if (c instanceof HTMLElement && c.tagName === 'BR') out.push({ text: '\n' })
      else if (c instanceof HTMLElement && c.tagName === 'DIV') {
        // a browser's own Enter in a multiline editor wraps the new line in a <div>
        if (out.length && !out[out.length - 1].text.endsWith('\n')) out.push({ text: '\n' })
        walk(c)
      } else walk(c)
    })
  }
  walk(el)
  return normalizeRuns(out)
}

/** Character offsets of the selection inside `el` ([start, end]), or null. */
function selectionOffsets(el: HTMLElement): [number, number] | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  const range = sel.getRangeAt(0)
  if (!el.contains(range.startContainer)) return null
  const at = (node: Node, offset: number) => {
    const r = document.createRange()
    r.selectNodeContents(el)
    r.setEnd(node, offset)
    return r.toString().length
  }
  return [at(range.startContainer, range.startOffset), at(range.endContainer, range.endOffset)]
}

function setSelectionOffsets(el: HTMLElement, start: number, end: number): void {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let pos = 0
  let startNode: Node | null = null
  let startOff = 0
  let endNode: Node | null = null
  let endOff = 0
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const len = n.textContent?.length ?? 0
    if (!startNode && start <= pos + len) {
      startNode = n
      startOff = start - pos
    }
    if (!endNode && end <= pos + len) {
      endNode = n
      endOff = end - pos
      break
    }
    pos += len
  }
  if (!startNode || !endNode) return
  const range = document.createRange()
  range.setStart(startNode, startOff)
  range.setEnd(endNode, endOff)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

/* ── the overlay ──────────────────────────────────────────────────────────────────────────── */

export const InlineEditor: React.FC<InlineEditorProps> = ({
  propPath,
  initialValue,
  initialRuns,
  rect,
  style,
  multiline = false,
  maxChars,
  required = false,
  selectAll = true,
  messages,
  onSave,
  onCancel,
  onTab,
}) => {
  const editorRef = React.useRef<HTMLDivElement>(null)
  const savedRef = React.useRef(false)
  const startRuns = React.useMemo<EditRun[]>(
    () => initialRuns ?? (initialValue ? [{ text: initialValue }] : []),
    // the overlay is created per edit: its start value never changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )
  const startText = plainText(startRuns)
  const [length, setLength] = React.useState(startText.length)
  const [hint, setHint] = React.useState<string | null>(null)

  React.useEffect(() => {
    const el = editorRef.current
    if (!el) return
    writeRuns(el, startRuns)
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    if (!selectAll) range.collapse(false)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  }, [])

  const finish = (): 'saved' | 'cancelled' | 'refused' => {
    if (savedRef.current) return 'cancelled'
    const el = editorRef.current
    const runs = el ? readRuns(el) : startRuns
    const text = plainText(runs)
    if (required && !text.trim()) {
      setHint(messages?.required ?? 'Required')
      el?.focus()
      return 'refused'
    }
    savedRef.current = true
    if (text === startText && JSON.stringify(runs) === JSON.stringify(normalizeRuns(startRuns))) {
      onCancel()
      return 'cancelled'
    }
    onSave(text, runs)
    return 'saved'
  }

  const commit = () => {
    finish()
  }

  const cancel = () => {
    if (savedRef.current) return
    savedRef.current = true
    onCancel()
  }

  // Editor E03: the overlay's rect was taken once — a pan/zoom/resize would leave it floating
  // away from its text, so any of them commits.
  React.useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (editorRef.current && e.target instanceof Node && editorRef.current.contains(e.target)) return
      commit()
    }
    window.addEventListener('wheel', onWheel, { capture: true, passive: true })
    window.addEventListener('resize', commit)
    return () => {
      window.removeEventListener('wheel', onWheel, { capture: true } as EventListenerOptions)
      window.removeEventListener('resize', commit)
    }
  })

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Vietnamese Telex/VNI and other IMEs compose: Enter/Escape belong to the IME then
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    const el = editorRef.current
    if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    } else if (e.key === 'Enter') {
      if (multiline && !(e.metaKey || e.ctrlKey)) return // the browser inserts the line break
      e.preventDefault()
      commit()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      if (finish() !== 'refused') onTab?.(e.shiftKey ? -1 : 1)
    } else if ((e.key === 'b' || e.key === 'B') && (e.metaKey || e.ctrlKey) && el) {
      e.preventDefault()
      const off = selectionOffsets(el)
      if (!off || off[0] === off[1]) return
      writeRuns(el, toggleBold(readRuns(el), off[0], off[1]))
      setSelectionOffsets(el, off[0], off[1])
    }
    e.stopPropagation()
  }

  // Editor E03: stop at the slot's budget (a longer text makes the engine reject the deck)
  const handleBeforeInput = (e: React.FormEvent<HTMLDivElement>) => {
    const native = e.nativeEvent as InputEvent
    if (maxChars === undefined || !native.inputType?.startsWith('insert')) return
    const el = editorRef.current
    if (!el) return
    const off = selectionOffsets(el) ?? [length, length]
    const add = native.inputType === 'insertParagraph' || native.inputType === 'insertLineBreak' ? 1 : native.data?.length ?? 1
    if ((el.textContent?.length ?? 0) - (off[1] - off[0]) + add > maxChars) e.preventDefault()
  }

  const handleInput = () => {
    setLength(editorRef.current?.textContent?.length ?? 0)
    if (hint) setHint(null)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const el = editorRef.current
    if (!el) return
    let text = e.clipboardData.getData('text/plain') ?? ''
    if (!multiline) text = text.replace(/\s*\n\s*/g, ' ')
    const off = selectionOffsets(el) ?? [el.textContent?.length ?? 0, el.textContent?.length ?? 0]
    if (maxChars !== undefined) {
      const room = maxChars - ((el.textContent?.length ?? 0) - (off[1] - off[0]))
      text = text.slice(0, Math.max(0, room))
    }
    if (!text) return
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    range.deleteContents()
    const node = document.createTextNode(text)
    range.insertNode(node)
    range.setStartAfter(node)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
    handleInput()
  }

  const showCount = maxChars !== undefined && length >= maxChars * 0.8
  const countText = maxChars !== undefined ? messages?.limit?.(length, maxChars) ?? `${length} / ${maxChars}` : ''

  // Portalled to <body>: the shape sits inside the canvas's CSS transform, and a transformed
  // ancestor makes `position: fixed` relative to itself — the overlay landed away from the text.
  const overlay = (
    <EditorPortal data-prop-path={propPath}>
      <EditorOverlay onMouseDown={commit} />
      <EditorDiv
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onBlur={commit}
        onKeyDown={handleKeyDown}
        onBeforeInput={handleBeforeInput}
        onInput={handleInput}
        onPaste={handlePaste}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          left: rect.left,
          top: rect.top,
          width: rect.width,
          minHeight: rect.height,
          fontSize: style?.size,
          color: style?.color,
          fontFamily: style?.family,
          fontWeight: style?.weight as React.CSSProperties['fontWeight'],
          lineHeight: style?.lineHeight ? `${style.lineHeight}px` : undefined,
          letterSpacing: style?.letterSpacing,
          textAlign: style?.align as React.CSSProperties['textAlign'],
        }}
      />
      {(showCount || hint) && (
        <EditorHint
          data-over={hint || (maxChars !== undefined && length >= maxChars) ? '1' : undefined}
          style={{ left: rect.left, top: rect.top + Math.max(rect.height, (style?.lineHeight ?? 0)) + 8 }}
        >
          {hint ?? countText}
        </EditorHint>
      )}
    </EditorPortal>
  )
  return typeof document === 'undefined' ? overlay : createPortal(overlay, document.body)
}

const EditorPortal = styled('div', {
  position: 'fixed',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 1000,
})

const EditorOverlay = styled('div', {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'auto',
})

const EditorDiv = styled('div', {
  position: 'absolute',
  pointerEvents: 'auto',
  cursor: 'text',
  userSelect: 'text',
  lineHeight: 1.2,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'break-word',
  borderRadius: '4px',
  padding: 0,
  outline: '2px solid #0066ff',
  outlineOffset: '2px',
  // the slide shows through: the text keeps its own colour on its own background (white text on
  // a dark slide read white on white before); the original text is hidden meanwhile
  backgroundColor: 'transparent',
})

const EditorHint = styled('div', {
  position: 'absolute',
  pointerEvents: 'none',
  padding: '2px 8px',
  borderRadius: '6px',
  font: '500 12px/18px system-ui, sans-serif',
  color: '#fff',
  backgroundColor: 'rgba(30, 41, 59, 0.92)',
  '&[data-over]': { backgroundColor: '#dc2626' },
})
