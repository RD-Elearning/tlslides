/**
 * spro creative CR13 (PLAN Appendix C.3/C.4) — wave-2 diagram and data-storytelling blocks and
 * wave-3 editorial blocks, all on the shared poster layout (`./_poster.ts`). Registered with the
 * other composites (`./index.ts`).
 */
import type { BlockDefinition } from '../../types'
import { tlsGDecisionTree } from './tls-g-decision-tree'
import { tlsGFishbone } from './tls-g-fishbone'
import { tlsGSpectrum } from './tls-g-spectrum'
import { tlsGBalance } from './tls-g-balance'
import { tlsGPuzzle } from './tls-g-puzzle'
import { tlsGBridge } from './tls-g-bridge'
import { tlsCNumberStory } from './tls-c-number-story'
import { tlsCDoDont } from './tls-c-do-dont'
import { tlsCStoryboard } from './tls-c-storyboard'
import { tlsCMagazine } from './tls-c-magazine'
import { tlsTDropCap } from './tls-t-drop-cap'
import { tlsTPullQuote } from './tls-t-pull-quote'
import { tlsCPhotoEssay } from './tls-c-photo-essay'
import { tlsCGalleryWall } from './tls-c-gallery-wall'
import { tlsCTitleCard } from './tls-c-title-card'
import { tlsCFullBleedType } from './tls-c-full-bleed-type'

export const wave2Blocks: BlockDefinition[] = [tlsGDecisionTree, tlsGFishbone, tlsGSpectrum, tlsGBalance, tlsGPuzzle, tlsGBridge, tlsCNumberStory, tlsCDoDont, tlsCStoryboard, tlsCMagazine, tlsTDropCap, tlsTPullQuote, tlsCPhotoEssay, tlsCGalleryWall, tlsCTitleCard, tlsCFullBleedType]

export { tlsGDecisionTree, tlsGFishbone, tlsGSpectrum, tlsGBalance, tlsGPuzzle, tlsGBridge, tlsCNumberStory, tlsCDoDont, tlsCStoryboard, tlsCMagazine, tlsTDropCap, tlsTPullQuote, tlsCPhotoEssay, tlsCGalleryWall, tlsCTitleCard, tlsCFullBleedType }
