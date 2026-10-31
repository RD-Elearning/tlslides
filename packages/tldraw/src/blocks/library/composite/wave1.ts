/**
 * spro creative CR8 (PLAN Appendix C.1) — wave-1 blocks: frames (closing, cover, agenda, divider),
 * teaching and playful composites, all on the shared poster layout (`./_poster.ts`). Registered with
 * the other composites (`./index.ts`).
 */
import type { BlockDefinition } from '../../types'
import { tlsCOneQuestion } from './tls-c-one-question'
import { tlsCCta } from './tls-c-cta'
import { tlsCCallback } from './tls-c-callback'
import { tlsCTakeawayPoster } from './tls-c-takeaway-poster'
import { tlsCPosterCover } from './tls-c-poster-cover'
import { tlsCSplitCover } from './tls-c-split-cover'
import { tlsCHookCover } from './tls-c-hook-cover'
import { tlsCRouteAgenda } from './tls-c-route-agenda'
import { tlsCChapterDivider } from './tls-c-chapter-divider'
import { tlsCStickyBoard } from './tls-c-sticky-board'
import { tlsCQuestionWall } from './tls-c-question-wall'
import { tlsCHomework } from './tls-c-homework'
import { tlsCFlashcards } from './tls-c-flashcards'
import { tlsGAnnotated } from './tls-g-annotated'
import { tlsTHighlight } from './tls-t-highlight'
import { tlsTSpeechBubble } from './tls-t-speech-bubble'

export const wave1Blocks: BlockDefinition[] = [tlsCOneQuestion, tlsCCta, tlsCCallback, tlsCTakeawayPoster, tlsCPosterCover, tlsCSplitCover, tlsCHookCover, tlsCRouteAgenda, tlsCChapterDivider, tlsCStickyBoard, tlsCQuestionWall, tlsCHomework, tlsCFlashcards, tlsGAnnotated, tlsTHighlight, tlsTSpeechBubble]

export { tlsCOneQuestion, tlsCCta, tlsCCallback, tlsCTakeawayPoster, tlsCPosterCover, tlsCSplitCover, tlsCHookCover, tlsCRouteAgenda, tlsCChapterDivider, tlsCStickyBoard, tlsCQuestionWall, tlsCHomework, tlsCFlashcards, tlsGAnnotated, tlsTHighlight, tlsTSpeechBubble }
