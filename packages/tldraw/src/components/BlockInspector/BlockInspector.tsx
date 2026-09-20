/**
 * Block Inspector component - provides a right-hand panel for editing block properties.
 *
 * Three tabs:
 * - Content: Shows editable fields based on the block's schema
 * - Style: Surface color, gradient editor, accent color picker
 * - Motion: Preset picker, delay/duration/stagger sliders, Preview button
 *
 * R12 implementation.
 */

import * as React from 'react'
import { styled } from '../../styles'
import { useTldraw, useBlockRegistry } from '../../hooks'
import type { BlockSchema, BlockStyleSpec, BlockMotionSpec } from '../../blocks/types'
import { setAtPath } from '../../blocks/prop-path'
import type { ComponentShape } from '../../types'
import { TDShapeType } from '../../types'

export interface BlockInspectorProps {
  selectedShapeId: string | null
  onPlayReveal?: (shapeId: string) => void
}

export const BlockInspector: React.FC<BlockInspectorProps> = ({ selectedShapeId, onPlayReveal }) => {
  const tldraw = useTldraw()
  const blockRegistry = useBlockRegistry()
  const [activeTab, setActiveTab] = React.useState<'content' | 'style' | 'motion'>('content')

  const rawShape = selectedShapeId ? tldraw.getShape(selectedShapeId) : undefined
  const shape = rawShape?.type === TDShapeType.Component ? (rawShape as ComponentShape) : undefined
  const blockDef = shape ? blockRegistry?.get(shape.componentId) : undefined

  // Block metadata (style/motion) lives under the reserved `$block` key in the shape's own
  // `props` — NOT on `shape.style`/a top-level `shape.motion`, which don't exist for a
  // ComponentShape (`shape.style` is the ordinary tldraw `ShapeStyles` — color/fill/dash — and
  // overwriting it here would corrupt opacity/corner-radius rendering). See `shape-bridge.ts`.
  const blockMeta = React.useMemo(() => {
    if (!shape) return undefined
    return (shape.props as Record<string, unknown>).$block as Record<string, unknown> | undefined
  }, [shape])

  const blockProps = React.useMemo(() => {
    if (!shape) return null
    return (blockMeta?.props as Record<string, unknown> | undefined) ?? shape.props
  }, [shape, blockMeta])

  const blockStyle = blockMeta?.style as BlockStyleSpec | undefined
  const blockMotion = blockMeta?.motion as BlockMotionSpec | undefined

  const updateProp = React.useCallback((path: string, value: unknown) => {
    if (!shape || !blockProps) return
    const newProps = setAtPath(shape.props as Record<string, unknown>, path, value)
    tldraw.updateShapes({ id: shape.id, props: newProps })
  }, [shape, blockProps, tldraw])

  const updateBlockMeta = React.useCallback((key: 'style' | 'motion', path: string, value: unknown) => {
    if (!shape) return
    const currentProps = shape.props as Record<string, unknown>
    const currentMeta = (currentProps.$block as Record<string, unknown> | undefined) ?? {}
    const currentSection = (currentMeta[key] as Record<string, unknown> | undefined) ?? {}
    const newProps = {
      ...currentProps,
      $block: { ...currentMeta, [key]: { ...currentSection, [path]: value } },
    }
    tldraw.updateShapes({ id: shape.id, props: newProps })
  }, [shape, tldraw])

  const updateStyle = React.useCallback((path: string, value: unknown) => {
    updateBlockMeta('style', path, value)
  }, [updateBlockMeta])

  const updateMotion = React.useCallback((path: string, value: unknown) => {
    updateBlockMeta('motion', path, value)
  }, [updateBlockMeta])
  
  if (!blockDef || !shape) {
    return (
      <InspectorContainer>
        <InspectorHeader>Block Inspector</InspectorHeader>
        <InspectorContent>
          <EmptyState>Select a block to edit its properties</EmptyState>
        </InspectorContent>
      </InspectorContainer>
    )
  }
  
  return (
    <InspectorContainer>
      <InspectorHeader>
        <InspectorTitle>{blockDef.name}</InspectorTitle>
        <TabContainer>
          <TabButton active={activeTab === 'content'} onClick={() => setActiveTab('content')}>Content</TabButton>
          <TabButton active={activeTab === 'style'} onClick={() => setActiveTab('style')}>Style</TabButton>
          <TabButton active={activeTab === 'motion'} onClick={() => setActiveTab('motion')}>Motion</TabButton>
        </TabContainer>
      </InspectorHeader>
      
      <InspectorContent>
        {activeTab === 'content' && <ContentTab schema={blockDef.schema} props={blockProps} onUpdate={updateProp} />}
        {activeTab === 'style' && <StyleTab style={blockStyle} onUpdate={updateStyle} />}
        {activeTab === 'motion' && (
          <MotionTab motion={blockMotion} preset={blockDef.motion?.preset} onUpdate={updateMotion} onPlay={onPlayReveal} shapeId={selectedShapeId} />
        )}
      </InspectorContent>
    </InspectorContainer>
  )
}

interface ContentTabProps {
  schema: BlockSchema
  props: Record<string, unknown> | null
  onUpdate: (path: string, value: unknown) => void
}

function ContentTab({ schema, props, onUpdate }: ContentTabProps) {
  if (!props) return null
  return (
    <ContentSection>
      {Object.entries(schema).map(([key, spec]) => {
        if (spec.role === 'option') return null
        return (
          <ContentField
            key={key}
            name={key}
            spec={spec}
            value={props[key]}
            onChange={(value) => onUpdate(key, value)}
          />
        )
      })}
    </ContentSection>
  )
}

interface ContentFieldProps {
  name: string
  spec: any
  value: unknown
  onChange: (value: unknown) => void
}

function ContentField({ spec, value, onChange }: ContentFieldProps) {
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }
  return (
    <FieldContainer>
      <FieldLabel>{spec.label}</FieldLabel>
      {spec.type.kind === 'text' && <TextField value={value as string || ''} onChange={handleInput} />}
      {spec.type.kind === 'number' && <NumberField type="number" value={value as number || 0} onChange={(e) => onChange(Number(e.target.value))} />}
      {spec.type.kind === 'enum' && <EnumField value={value as string} onChange={(e) => onChange(e.target.value)}>{spec.type.values?.map((v: string) => <option key={v} value={v}>{v}</option>)}</EnumField>}
      {spec.type.kind === 'boolean' && <BoolField type="checkbox" checked={value as boolean || false} onChange={(e) => onChange(e.target.checked)} />}
      {spec.help && <FieldHelp>{spec.help}</FieldHelp>}
    </FieldContainer>
  )
}

interface StyleTabProps {
  style?: BlockStyleSpec
  onUpdate: (path: string, value: unknown) => void
}

function StyleTab({ style, onUpdate }: StyleTabProps) {
  const [showGradientEditor, setShowGradientEditor] = React.useState(false)
  return (
    <StyleSection>
      <StyleField>
        <StyleLabel>Surface Color</StyleLabel>
        <ColorPicker value={style?.surface as string || '#ffffff'} onChange={(e) => onUpdate('surface', e.target.value)} />
      </StyleField>
      <StyleField>
        <StyleLabel>Text Color</StyleLabel>
        <ColorPicker value={style?.on as string || '#000000'} onChange={(e) => onUpdate('on', e.target.value)} />
      </StyleField>
      <StyleField>
        <StyleLabel>Accent Color</StyleLabel>
        <ColorPicker value={style?.accent as string || '#0066ff'} onChange={(e) => onUpdate('accent', e.target.value)} />
      </StyleField>
    </StyleSection>
  )
}

interface MotionTabProps {
  motion?: BlockMotionSpec
  preset?: string
  onUpdate: (path: string, value: unknown) => void
  onPlay?: (shapeId: string) => void
  shapeId: string | null
}

function MotionTab({ motion, preset, onUpdate, onPlay, shapeId }: MotionTabProps) {
  const [delay, setDelay] = React.useState(motion?.delay ?? 0)
  const [duration, setDuration] = React.useState(motion?.duration ?? 500)
  const [stagger, setStagger] = React.useState(motion?.stagger ?? 0)
  
  React.useEffect(() => { onUpdate('delay', delay) }, [delay])
  React.useEffect(() => { onUpdate('duration', duration) }, [duration])
  React.useEffect(() => { onUpdate('stagger', stagger) }, [stagger])
  
  return (
    <MotionSection>
      <MotionLabel>Preset</MotionLabel>
      <PresetSelector value={preset || ''} onChange={(e) => onUpdate('preset', e.target.value)}>
        <option value="">None</option>
        <option value="fade">Fade</option>
        <option value="scale">Scale</option>
        <option value="slide">Slide</option>
      </PresetSelector>
      
      <SliderContainer>
        <MotionLabel>Delay: {delay}ms</MotionLabel>
        <Slider type="range" min={0} max={2000} value={delay} onChange={(e) => setDelay(Number(e.target.value))} />
      </SliderContainer>
      
      <SliderContainer>
        <MotionLabel>Duration: {duration}ms</MotionLabel>
        <Slider type="range" min={100} max={5000} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
      </SliderContainer>
      
      <SliderContainer>
        <MotionLabel>Stagger: {stagger}ms</MotionLabel>
        <Slider type="range" min={0} max={200} value={stagger} onChange={(e) => setStagger(Number(e.target.value))} />
      </SliderContainer>
      
      {onPlay && shapeId && <PlayButton onClick={() => onPlay(shapeId)}>Preview</PlayButton>}
    </MotionSection>
  )
}

/* Styled Components */

const InspectorContainer = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '320px',
  backgroundColor: '$bg',
  borderLeft: '1px solid $border',
  overflow: 'hidden',
})

const InspectorHeader = styled('div', {
  padding: '12px 16px',
  borderBottom: '1px solid $border',
  backgroundColor: '$headerBg',
})

const InspectorTitle = styled('h3', {
  margin: 0,
  fontSize: '14px',
  fontWeight: 600,
  color: '$text',
})

const TabContainer = styled('div', {
  display: 'flex',
  gap: '4px',
  marginTop: '8px',
})

const TabButton = styled('button', {
  flex: 1,
  padding: '6px 12px',
  fontSize: '12px',
  background: 'transparent',
  border: '1px solid $border',
  borderRadius: '4px',
  cursor: 'pointer',
  transition: 'all 0.15s',
  variants: {
    active: {
      true: { background: '$accent', color: '$text', fontWeight: 500 },
      false: { background: 'transparent', color: '$textMuted', '&:hover': { background: '$bgHover' } },
    },
  },
})

const InspectorContent = styled('div', { flex: 1, overflowY: 'auto', padding: '16px' })

const EmptyState = styled('div', { textAlign: 'center', padding: '32px 16px', color: '$textMuted', fontSize: '14px' })

const ContentSection = styled('div', { display: 'flex', flexDirection: 'column', gap: '16px' })

const FieldContainer = styled('div', { display: 'flex', flexDirection: 'column', gap: '4px' })

const FieldLabel = styled('label', { fontSize: '12px', fontWeight: 500, color: '$text', marginBottom: '4px' })

const TextField = styled('input', { padding: '8px 12px', fontSize: '14px', border: '1px solid $border', borderRadius: '6px', width: '100%' })

const NumberField = styled('input', { padding: '8px 12px', fontSize: '14px', border: '1px solid $border', borderRadius: '6px', width: '100%' })

const EnumField = styled('select', { padding: '8px 12px', fontSize: '14px', border: '1px solid $border', borderRadius: '6px', width: '100%', backgroundColor: '$bg' })

const BoolField = styled('input', { width: '36px', height: '18px', cursor: 'pointer' })

const FieldHelp = styled('div', { fontSize: '12px', color: '$textMuted' })

const StyleSection = styled('div', { display: 'flex', flexDirection: 'column', gap: '16px' })

const StyleField = styled('div', { display: 'flex', flexDirection: 'column', gap: '4px' })

const StyleLabel = styled('label', { fontSize: '12px', fontWeight: 500, color: '$text' })

const ColorPicker = styled('input', {
  padding: '8px 12px',
  fontSize: '14px',
  border: '1px solid $border',
  borderRadius: '6px',
  width: '100%',
  boxSizing: 'border-box',
  type: 'color',
})

const GradientEditor = styled('div', {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
})

const MotionSection = styled('div', { display: 'flex', flexDirection: 'column', gap: '16px' })

const MotionLabel = styled('label', { fontSize: '12px', fontWeight: 500, color: '$text' })

const SliderContainer = styled('div', { display: 'flex', flexDirection: 'column', gap: '4px' })

const Slider = styled('input', {
  width: '100%',
  height: '6px',
  borderRadius: '3px',
  background: '$border',
  outline: 'none',
  cursor: 'pointer',
  '&:hover': { background: '$accent' },
})

const PresetSelector = styled('select', {
  padding: '8px 12px',
  fontSize: '14px',
  border: '1px solid $border',
  borderRadius: '6px',
  width: '100%',
  backgroundColor: '$bg',
  cursor: 'pointer',
})

const PlayButton = styled('button', {
  padding: '8px 16px',
  fontSize: '14px',
  background: '$accent',
  color: '$text',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  marginTop: '8px',
  transition: 'background 0.15s',
  '&:hover': { background: '#0052cc' },
})
