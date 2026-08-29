import type { TDShapeUtil } from './TDShapeUtil'
import { RectangleUtil } from './RectangleUtil'
import { TriangleUtil } from './TriangleUtil'
import { EllipseUtil } from './EllipseUtil'
import { ArrowUtil } from './ArrowUtil'
import { LineUtil } from './LineUtil'
import { GroupUtil } from './GroupUtil'
import { StickyUtil } from './StickyUtil'
import { TextUtil } from './TextUtil'
import { DrawUtil } from './DrawUtil'
import { ImageUtil } from './ImageUtil'
import { TDShape, TDShapeType } from '~types'
import { VideoUtil } from './VideoUtil'
import { ComponentUtil } from './ComponentUtil'
import { PolygonUtil } from './PolygonUtil'
import { StarUtil } from './StarUtil'
import { SpeechBubbleUtil } from './SpeechBubbleUtil'

export const Rectangle = new RectangleUtil()
export const Triangle = new TriangleUtil()
export const Ellipse = new EllipseUtil()
export const Draw = new DrawUtil()
export const Arrow = new ArrowUtil()
export const Line = new LineUtil()
export const Text = new TextUtil()
export const Group = new GroupUtil()
export const Sticky = new StickyUtil()
export const Image = new ImageUtil()
export const Video = new VideoUtil()
export const Component = new ComponentUtil()
export const Polygon = new PolygonUtil()
export const Star = new StarUtil()
export const SpeechBubble = new SpeechBubbleUtil()

export const shapeUtils = {
  [TDShapeType.Rectangle]: Rectangle,
  [TDShapeType.Triangle]: Triangle,
  [TDShapeType.Ellipse]: Ellipse,
  [TDShapeType.Draw]: Draw,
  [TDShapeType.Arrow]: Arrow,
  [TDShapeType.Line]: Line,
  [TDShapeType.Text]: Text,
  [TDShapeType.Group]: Group,
  [TDShapeType.Sticky]: Sticky,
  [TDShapeType.Image]: Image,
  [TDShapeType.Video]: Video,
  [TDShapeType.Component]: Component,
  [TDShapeType.Polygon]: Polygon,
  [TDShapeType.Star]: Star,
  [TDShapeType.SpeechBubble]: SpeechBubble,
}

export const getShapeUtil = <T extends TDShape>(shape: T | T['type']) => {
  if (typeof shape === 'string') return shapeUtils[shape] as unknown as TDShapeUtil<T>
  return shapeUtils[shape.type] as unknown as TDShapeUtil<T>
}
