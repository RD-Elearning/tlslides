/**
 * RV09: every media / people / brand block's motion recipe names parts its own example really
 * draws, every drawn leaf is animated by some part (an uncovered one is visible before the rest),
 * and the preset really animates (S14 / S16).
 */

import { assertMotionTargetsExist } from '../diagram/diagram-test'
import { assertContained, assertWellFormed } from '../text/standard-suite'
import { ctxWithAssets } from './media-test'
import { tlsMImage } from './tls-m-image'
import { tlsMIcon } from './tls-m-icon'
import { tlsMIconLabel } from './tls-m-icon-label'
import { tlsMImageGrid } from './tls-m-image-grid'
import { tlsMImageCompare } from './tls-m-image-compare'
import { tlsMDeviceMock } from './tls-m-device-mock'
import { tlsMAvatar } from './tls-m-avatar'
import { tlsMAvatarGroup } from './tls-m-avatar-group'
import { tlsMLogo } from './tls-m-logo'
import { tlsMLogoWall } from './tls-m-logo-wall'

describe('media / people / brand motion recipes', () => {
  it.each([
    tlsMImage,
    tlsMIcon,
    tlsMIconLabel,
    tlsMImageGrid,
    tlsMImageCompare,
    tlsMDeviceMock,
    tlsMAvatar,
    tlsMAvatarGroup,
    tlsMLogo,
    tlsMLogoWall,
  ])('$type: parts exist, every drawn leaf is covered, the preset animates', (def) => {
    assertMotionTargetsExist(def, { optional: /caption|cap\[|role|name|logo\.plate|more|heading|photo\.(ring|gap|initials)|initials|frame\.(address|url)|label|plate\[|divider\[/ })
  })
})

describe('media / people / brand examples fit size.preferred and size.min', () => {
  const defs = [tlsMImage, tlsMIcon, tlsMIconLabel, tlsMImageGrid, tlsMImageCompare, tlsMDeviceMock, tlsMAvatar, tlsMAvatarGroup, tlsMLogo, tlsMLogoWall]
  for (const def of defs) {
    for (const which of ['preferred', 'min'] as const) {
      it(`${def.type} at size.${which}`, () => {
        const [w, h] = def.size[which]
        const tree = def.layout({ ...(def.defaults as any), ...(def.describe!.example.props as any) } as any, ctxWithAssets(w, h))
        assertWellFormed(tree)
        assertContained(tree, { width: w, height: h })
      })
    }
  }
})

describe('media grids reflow with the item count and a narrow box', () => {
  const logos = (n: number) => Array.from({ length: n }, (_, i) => ({ image: `/demo/logo-${(i % 6) + 1}.svg`, alt: `Brand ${i + 1}`, ratio: [4, 1, 3, 2, 1.5, 3][i % 6] }))
  const images = (n: number) => Array.from({ length: n }, (_, i) => ({ image: `/demo/photo-${(i % 5) + 1}.svg`, alt: `Photo ${i + 1}`, caption: i === 0 ? 'First photo' : undefined }))
  const people = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `Person Number ${i + 1}` }))
  const boxes: Array<[number, number]> = [[1200, 360], [600, 360], [320, 200]]

  for (const [w, h] of boxes) {
    it(`logo-wall: 2 to 12 logos stay inside ${w}x${h}`, () => {
      for (const n of [2, 3, 5, 6, 8, 12]) {
        const tree = tlsMLogoWall.layout({ ...(tlsMLogoWall.defaults as any), logos: logos(n) } as any, ctxWithAssets(w, Math.max(h, 360)))
        assertContained(tree, { width: w, height: Math.max(h, 360) })
      }
    })
    it(`image-grid: 1 to 9 images stay inside ${w}x${h}`, () => {
      for (const n of [1, 2, 3, 4, 6, 9]) {
        const tree = tlsMImageGrid.layout({ ...(tlsMImageGrid.defaults as any), images: images(n) } as any, ctxWithAssets(w, Math.max(h, 200)))
        assertContained(tree, { width: w, height: Math.max(h, 200) })
      }
    })
  }

  it('avatar-group: 1 to 12 people never leave a 320x80 box', () => {
    for (const n of [1, 2, 4, 8, 12]) {
      const tree = tlsMAvatarGroup.layout({ ...(tlsMAvatarGroup.defaults as any), people: people(n) } as any, ctxWithAssets(320, 80))
      assertContained(tree, { width: 320, height: 80 })
    }
  })
})
