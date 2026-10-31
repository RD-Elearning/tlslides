/** L03 — interactive activity blocks (family 'live', category 'learning'). */
import type { BlockDefinition } from '../../types'
import { tlsAChoice } from './tls-a-choice'
import { tlsATrueFalse } from './tls-a-true-false'
import { tlsAFlipCards } from './tls-a-flip-cards'
import { tlsAReveal } from './tls-a-reveal'
import { tlsAFillBlank } from './tls-a-fill-blank'

export const activityBlocks: BlockDefinition[] = [tlsAChoice, tlsATrueFalse, tlsAFlipCards, tlsAReveal, tlsAFillBlank]
export { tlsAChoice } from './tls-a-choice'
export { tlsATrueFalse } from './tls-a-true-false'
export { tlsAFlipCards } from './tls-a-flip-cards'
export { tlsAReveal } from './tls-a-reveal'
export { tlsAFillBlank } from './tls-a-fill-blank'
