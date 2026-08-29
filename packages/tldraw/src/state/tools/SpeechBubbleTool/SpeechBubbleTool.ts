import { Utils, TLPointerEventHandler, TLBoundsCorner } from '@tlslides/core'
import Vec from '@tlslides/vec'
import { SpeechBubble } from '~state/shapes'
import { SessionType, TDShapeType } from '~types'
import { BaseTool, Status } from '../BaseTool'

export class SpeechBubbleTool extends BaseTool {
  type = TDShapeType.SpeechBubble as const

  onPointerDown: TLPointerEventHandler = () => {
    if (this.status !== Status.Idle) return

    const {
      currentPoint,
      currentGrid,
      settings: { showGrid },
      appState: { currentPageId, currentStyle },
    } = this.app

    const childIndex = this.getNextChildIndex()

    const id = Utils.uniqueId()

    const newShape = SpeechBubble.create({
      id,
      parentId: currentPageId,
      childIndex,
      point: showGrid ? Vec.snap(currentPoint, currentGrid) : currentPoint,
      style: { ...currentStyle },
    })

    this.app.patchCreate([newShape])

    this.app.startSession(
      SessionType.TransformSingle,
      newShape.id,
      TLBoundsCorner.BottomRight,
      true
    )

    this.setStatus(Status.Creating)
  }
}
